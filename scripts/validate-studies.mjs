import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {
  IMPORTABLE_ARTIFACT_TYPE,
  IMPORTABLE_MODE,
  KNOWN_CONTENT_TYPES,
  REQUIRED_LESSON_FIELDS,
  RESERVED_H2,
  SUPPORTED_CONTENT_TYPES,
  canonicalBookId,
  normalizeText,
  normalizeBibleReference,
  parseStudyDocument,
  sha256Buffer,
  splitReadingLine,
  toPosixPath,
  walkFiles,
} from "./study-markdown-utils.mjs";

const projectRoot = process.cwd();
const studiesRoot = path.join(projectRoot, "content", "studies");
const manifestPath = path.join(studiesRoot, "manifest.json");
const routesConfigPath = path.join(projectRoot, "content", "routes.json");
const dbPath = path.join(projectRoot, "data", "bibli.sqlite");
const problems = [];
const warnings = [];
const editorialWarnings = [];

function problem(file, message) {
  problems.push(`${file}: ${message}`);
}

if (!fs.existsSync(studiesRoot)) {
  console.error("Validación de estudios: FAIL");
  console.error("No existe content/studies. Ejecuta npm run studies:sync.");
  process.exit(1);
}

if (!fs.existsSync(manifestPath)) {
  console.error("Validación de estudios: FAIL");
  console.error("Falta content/studies/manifest.json. Ejecuta npm run studies:sync.");
  process.exit(1);
}

if (!fs.existsSync(dbPath)) {
  console.error("Validación de estudios: FAIL");
  console.error("Falta data/bibli.sqlite.");
  process.exit(1);
}


if (!fs.existsSync(routesConfigPath)) {
  console.error("Validación de estudios: FAIL");
  console.error("Falta content/routes.json.");
  process.exit(1);
}

const routesConfig = JSON.parse(fs.readFileSync(routesConfigPath, "utf8"));
const routeConfigById = new Map((routesConfig.routes || []).map((route) => [route.id, route]));

function resolveConfiguredModule(route, lessonNumber) {
  return (route?.modules || []).find((module) => {
    const range = module.lesson_number_range;
    return Array.isArray(range) && range.length === 2 && lessonNumber >= range[0] && lessonNumber <= range[1];
  });
}

function configuredRangeEnd(route) {
  return Math.max(
    0,
    ...(route?.modules || [])
      .map((module) => module.lesson_number_range)
      .filter((range) => Array.isArray(range) && range.length === 2 && Number.isInteger(range[1]))
      .map((range) => range[1]),
  );
}

function canUseAutoAppendModule(route, lessonNumber) {
  return route?.auto_append_module?.enabled === true
    && Number.isInteger(lessonNumber)
    && lessonNumber > configuredRangeEnd(route);
}

const autoAppendCandidates = new Map();

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const manifestMap = new Map((manifest.files || []).map((entry) => [entry.path, entry]));
const markdownFiles = walkFiles(studiesRoot, (filePath) => filePath.toLowerCase().endsWith(".md"));

if (markdownFiles.length === 0) {
  problems.push("content/studies: snapshot vacío");
}

const db = new Database(dbPath, { readonly: true });
const books = new Set(db.prepare("SELECT id FROM books").all().map((row) => row.id));
const versions = db.prepare("SELECT id, abbreviation, name, language FROM bible_versions").all();
const versionByLabel = new Map();
for (const version of versions) {
  for (const label of [version.id, version.abbreviation, version.name]) {
    if (label) versionByLabel.set(normalizeText(label), version);
  }
}

db.close();

const lessonIds = new Map();
const routeNumbers = new Map();
const seenPaths = new Set();

for (const filePath of markdownFiles) {
  const relativePath = toPosixPath(path.relative(studiesRoot, filePath));
  seenPaths.add(relativePath);

  if (relativePath.split("/").some((segment) => normalizeText(segment) === "pruebas" || normalizeText(segment) === "sistema")) {
    problem(relativePath, "ruta prohibida: Pruebas/Sistema");
  }

  const buffer = fs.readFileSync(filePath);
  const text = buffer.toString("utf8");
  let parsed;

  try {
    parsed = parseStudyDocument(text, relativePath);
  } catch (error) {
    problem(relativePath, error.message);
    continue;
  }

  const fm = parsed.frontmatter;

  if (fm.artifact_type === "bible_study_test" || fm.mode === "test") {
    problem(relativePath, "un artefacto de Modo Prueba nunca puede publicarse");
    continue;
  }

  if (fm.artifact_type !== IMPORTABLE_ARTIFACT_TYPE) {
    problem(relativePath, `artifact_type no importable: ${String(fm.artifact_type)}`);
  }

  if (fm.mode !== IMPORTABLE_MODE) {
    problem(relativePath, `mode debe ser official y es ${String(fm.mode)}`);
  }

  if (!KNOWN_CONTENT_TYPES.has(fm.content_type)) {
    problem(relativePath, `content_type desconocido: ${String(fm.content_type)}`);
  } else if (!SUPPORTED_CONTENT_TYPES.has(fm.content_type)) {
    problem(relativePath, `unsupported_content_type: ${fm.content_type}`);
    continue;
  }

  for (const field of REQUIRED_LESSON_FIELDS) {
    const value = fm[field];
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
      problem(relativePath, `falta campo obligatorio ${field}`);
    }
  }

  if (!Number.isInteger(fm.route_lesson_number) || fm.route_lesson_number <= 0) {
    problem(relativePath, "route_lesson_number debe ser entero positivo");
  }

  const routeConfig = routeConfigById.get(fm.route_id);
  if (!routeConfig) {
    problem(relativePath, `route_id no existe en content/routes.json: ${fm.route_id}`);
  } else if (!resolveConfiguredModule(routeConfig, fm.route_lesson_number)) {
    if (canUseAutoAppendModule(routeConfig, fm.route_lesson_number)) {
      const candidates = autoAppendCandidates.get(fm.route_id) || [];
      candidates.push({ relativePath, lessonNumber: fm.route_lesson_number });
      autoAppendCandidates.set(fm.route_id, candidates);
    } else {
      problem(relativePath, `route_lesson_number ${fm.route_lesson_number} no pertenece a ningún módulo configurado de ${fm.route_id}`);
    }
  }

  if (!Array.isArray(fm.coverage) || fm.coverage.length === 0 || fm.coverage.some((item) => typeof item !== "string" || !item.trim())) {
    problem(relativePath, "coverage debe ser una lista no vacía de referencias");
  }

  if (parsed.h1.length !== 1) {
    problem(relativePath, `content_type lesson exige exactamente 1 H1 y se encontraron ${parsed.h1.length}`);
  }

  if (parsed.readingLines.length !== 1) {
    problem(relativePath, `se esperaba exactamente 1 línea 📖 Lectura y se encontraron ${parsed.readingLines.length}`);
  } else {
    const reading = splitReadingLine(parsed.readingLines[0]);
    if (normalizeBibleReference(reading.reference) !== normalizeBibleReference(fm.primary_reference)) {
      problem(relativePath, `Lectura no coincide con primary_reference (${reading.reference} vs ${fm.primary_reference})`);
    }
    if (reading.translation && normalizeText(reading.translation) !== normalizeText(fm.translation)) {
      problem(relativePath, `Lectura no coincide con translation (${reading.translation} vs ${fm.translation})`);
    }
  }

  const sectionCounts = new Map(RESERVED_H2.map((title) => [title, parsed.h2.filter((entry) => entry === title).length]));

  if ((sectionCounts.get("🧭 Dónde estamos") || 0) !== 1) {
    problem(relativePath, "Lección ordinaria exige exactamente un 🧭 Dónde estamos");
  }
  if ((sectionCounts.get("📝 Resumen") || 0) !== 1) {
    problem(relativePath, "exige exactamente un 📝 Resumen");
  }
  if ((sectionCounts.get("🙏 Oración") || 0) !== 1) {
    problem(relativePath, "exige exactamente una 🙏 Oración");
  }

  const summaryIndex = parsed.h2.indexOf("📝 Resumen");
  const prayerIndex = parsed.h2.indexOf("🙏 Oración");
  if (summaryIndex !== -1 && prayerIndex !== -1 && summaryIndex >= prayerIndex) {
    problem(relativePath, "el orden de cierre debe ser Resumen → Oración");
  }
  if (prayerIndex !== -1 && prayerIndex !== parsed.h2.length - 1) {
    problem(relativePath, "🙏 Oración debe ser la última sección H2 del artefacto");
  }

  if (parsed.h2.some((title) => title.includes("Estado de la Bitácora") || title.includes("Archivo Markdown"))) {
    problem(relativePath, "contiene una sección operativa que no pertenece al artefacto editorial");
  }

  const canonicalBook = canonicalBookId(fm.book_id);
  if (!books.has(canonicalBook)) {
    problem(relativePath, `book_id no resoluble en Bibli: ${fm.book_id} → ${canonicalBook}`);
  }

  const version = versionByLabel.get(normalizeText(fm.translation));
  if (!version) {
    problem(relativePath, `translation no resoluble contra bible_versions: ${fm.translation}`);
  }

  if (lessonIds.has(fm.lesson_id)) {
    problem(relativePath, `lesson_id duplicado con ${lessonIds.get(fm.lesson_id)}`);
  } else if (fm.lesson_id) {
    lessonIds.set(fm.lesson_id, relativePath);
  }

  const routeKey = `${fm.route_id}::${fm.route_lesson_number}`;
  if (routeNumbers.has(routeKey)) {
    problem(relativePath, `(route_id, route_lesson_number) duplicado con ${routeNumbers.get(routeKey)}`);
  } else if (fm.route_id && fm.route_lesson_number) {
    routeNumbers.set(routeKey, relativePath);
  }

  const manifestEntry = manifestMap.get(relativePath);
  if (!manifestEntry) {
    problem(relativePath, "no aparece en manifest.json");
  } else {
    const actualHash = sha256Buffer(buffer);
    if (manifestEntry.sha256 !== actualHash) {
      problem(relativePath, "SHA-256 no coincide con manifest.json; vuelve a ejecutar studies:sync");
    }
    if (manifestEntry.lesson_id !== fm.lesson_id) {
      problem(relativePath, "lesson_id no coincide con manifest.json");
    }
  }

  if ((sectionCounts.get("🧵 Hilo Invisible") || 0) === 0) {
    warnings.push(`${relativePath}: sin Hilo Invisible (válido; sección condicional)`);
  }
}

for (const manifestPathKey of manifestMap.keys()) {
  if (!seenPaths.has(manifestPathKey)) {
    problems.push(`manifest.json: referencia archivo inexistente ${manifestPathKey}`);
  }
}

if (manifest.file_count !== markdownFiles.length) {
  problems.push(`manifest.json: file_count=${manifest.file_count} pero existen ${markdownFiles.length} Markdown`);
}

for (const [routeId, candidates] of autoAppendCandidates) {
  const route = routeConfigById.get(routeId);
  const sorted = [...candidates].sort((a, b) => a.lessonNumber - b.lessonNumber);
  const expectedStart = configuredRangeEnd(route) + 1;
  let expected = expectedStart;
  let contiguous = true;

  for (const candidate of sorted) {
    if (candidate.lessonNumber !== expected) {
      contiguous = false;
      problems.push(
        `${candidate.relativePath}: la cola automática de ${routeId} debe ser continua; se esperaba route_lesson_number ${expected} y se encontró ${candidate.lessonNumber}`
      );
      break;
    }
    expected += 1;
  }

  if (contiguous && sorted.length > 0) {
    const start = sorted[0].lessonNumber;
    const end = sorted[sorted.length - 1].lessonNumber;
    editorialWarnings.push({
      routeId,
      start,
      end,
      count: sorted.length,
      title: route.auto_append_module.title || "Continuación de la ruta",
    });
  }
}

if (problems.length > 0) {
  console.error("Validación de estudios: FAIL");
  for (const item of problems) console.error(`- ${item}`);
  if (warnings.length > 0) {
    console.error("Advertencias:");
    for (const item of warnings) console.error(`- ${item}`);
  }
  if (editorialWarnings.length > 0) {
    console.error("Organización editorial pendiente:");
    for (const item of editorialWarnings) {
      console.error(`- ${item.routeId}: ${item.count} lecciones provisionales (${item.start}–${item.end}) en "${item.title}"`);
    }
  }
  process.exit(1);
}

console.log("Validación de estudios: PASS");
console.log(`Markdown oficiales validados: ${markdownFiles.length}`);
console.log(`lesson_id únicos: ${lessonIds.size}`);
console.log(`Versiones bíblicas resolubles: ${new Set([...versionByLabel.values()].map((v) => v.id)).size}`);
if (warnings.length > 0) {
  console.log(`Advertencias no bloqueantes: ${warnings.length}`);
  for (const item of warnings) console.log(`- ${item}`);
}
if (editorialWarnings.length > 0) {
  console.log("Organización editorial pendiente:");
  for (const item of editorialWarnings) {
    console.log(`- ${item.routeId}: ${item.count} lecciones provisionales (${item.start}–${item.end}) en "${item.title}"`);
  }
} else {
  console.log("Organización editorial: al día");
}
