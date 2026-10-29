import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import sharp from "sharp";
import Database from "better-sqlite3";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const snapshotPath = path.join(repoRoot, "content", "bibli-images-integrated.json");
const mappingPath = path.join(repoRoot, "content", "bibli-images-integration-map.json");
const publishedGlossaryPath = path.join(repoRoot, "content", "bibli-images-glossary-published.json");
const dbPath = path.join(repoRoot, "data", "bibli.sqlite");
const publicRoot = path.join(repoRoot, "public");

function parseArgs(argv) {
  const options = { check: false, source: null, allowRemove: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--check") options.check = true;
    else if (arg === "--allow-remove") options.allowRemove = true;
    else if (arg === "--source" && argv[i + 1]) options.source = argv[++i];
    else if (arg.startsWith("--source=")) options.source = arg.slice("--source=".length);
    else throw new Error(`Argumento no reconocido: ${arg}`);
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));
const sourceFolderName = "bibli_images_OneDrive_Only";
const repoOneDriveRoot = path.resolve(repoRoot, "..", "..", "..");
const defaultSourceRoot = path.join(repoOneDriveRoot, sourceFolderName);

function uniquePaths(values) {
  return [...new Set(values.filter(Boolean).map((value) => path.resolve(value)))];
}

function hasEntriesFolder(candidate) {
  try {
    return fs.statSync(path.join(candidate, "entries")).isDirectory();
  } catch {
    return false;
  }
}

function findNamedFolder(root, targetName, maxDepth = 4) {
  if (!root || !fs.existsSync(root)) return null;
  const queue = [{ dir: path.resolve(root), depth: 0 }];
  const ignored = new Set([".git", ".astro", "dist", "node_modules", "playwright-report", "test-results"]);

  while (queue.length) {
    const { dir, depth } = queue.shift();
    let children;
    try {
      children = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const child of children) {
      if (!child.isDirectory() || ignored.has(child.name)) continue;
      const childPath = path.join(dir, child.name);
      if (child.name === targetName && hasEntriesFolder(childPath)) return childPath;
      if (depth < maxDepth) queue.push({ dir: childPath, depth: depth + 1 });
    }
  }
  return null;
}

function resolveSourceRoot() {
  const explicit = options.source || process.env.BIBLI_IMAGES_ROOT;
  if (explicit) {
    const resolved = path.resolve(explicit);
    return { sourceRoot: resolved, attempted: [resolved], explicit: true };
  }

  const oneDriveRoots = uniquePaths([
    process.env.OneDriveCommercial,
    process.env.OneDrive,
    process.env.OneDriveConsumer,
    repoOneDriveRoot,
  ]);

  const candidates = uniquePaths([
    defaultSourceRoot,
    ...oneDriveRoots.flatMap((root) => [
      path.join(root, sourceFolderName),
      path.join(root, "Documentos", sourceFolderName),
      path.join(root, "Documents", sourceFolderName),
      path.join(root, "Projects", sourceFolderName),
      path.join(root, "Documentos", "Projects", sourceFolderName),
    ]),
  ]);

  const exact = candidates.find(hasEntriesFolder);
  if (exact) return { sourceRoot: exact, attempted: candidates, explicit: false };

  for (const root of oneDriveRoots) {
    const discovered = findNamedFolder(root, sourceFolderName, 4);
    if (discovered) return { sourceRoot: discovered, attempted: candidates, explicit: false };
  }

  return { sourceRoot: defaultSourceRoot, attempted: candidates, explicit: false };
}

const sourceResolution = resolveSourceRoot();
const sourceRoot = sourceResolution.sourceRoot;
const entriesRoot = path.join(sourceRoot, "entries");

function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function sha256File(filePath) {
  return sha256Buffer(fs.readFileSync(filePath));
}

function normalizeSha256(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/^sha256:/i, "").toLowerCase();
  return /^[a-f0-9]{64}$/.test(normalized) ? normalized : null;
}

function resolveMasterPath(masterFile, subject) {
  assert(typeof masterFile === "string" && masterFile.trim(), `${subject.sourceSlug}: falta visual.master_file`);

  const normalized = masterFile.trim().replace(/\\/g, "/").replace(/^\.\//, "");
  assert(!path.posix.isAbsolute(normalized) && !path.win32.isAbsolute(normalized), `${subject.sourceSlug}: visual.master_file no puede ser absoluto`);
  assert(!normalized.split("/").includes(".."), `${subject.sourceSlug}: visual.master_file contiene traversal inseguro`);

  let masterPath;
  if (normalized.startsWith("entries/")) {
    masterPath = path.resolve(sourceRoot, ...normalized.split("/"));
  } else if (normalized.startsWith("masters/")) {
    masterPath = path.resolve(subject.subjectPath, ...normalized.split("/"));
  } else {
    throw new Error(`${subject.sourceSlug}: visual.master_file usa un formato no soportado: ${masterFile}`);
  }

  assert(masterPath.startsWith(sourceRoot + path.sep), `${subject.sourceSlug}: master_file sale de la raíz canónica`);
  assert(fs.existsSync(masterPath), `${subject.sourceSlug}: no existe master ${masterFile}`);
  return masterPath;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeNullable(value) {
  return value == null || value === "" ? null : value;
}

function normalizePosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function slugify(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function splitLocalizedReferences(list) {
  const localized = { "es-419": [], "en-US": [] };
  for (const rawValue of Array.isArray(list) ? list : []) {
    const value = String(rawValue).trim();
    const separator = " / ";
    const index = value.indexOf(separator);
    if (index >= 0) {
      localized["es-419"].push(value.slice(0, index).trim());
      localized["en-US"].push(value.slice(index + separator.length).trim());
    } else {
      localized["es-419"].push(value);
      localized["en-US"].push(value);
    }
  }
  return localized;
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function listSubjectFolders() {
  if (!fs.existsSync(entriesRoot)) {
    const attempted = sourceResolution.attempted.map((candidate) => `  - ${candidate}`).join("\n");
    const hint = sourceResolution.explicit
      ? "Revisa la ruta pasada por --source/BIBLI_IMAGES_ROOT."
      : `La carpeta puede no estar sincronizada localmente. Rutas probadas:\n${attempted}\n` +
        `Puedes indicar la ubicación real con: npm run bibliimg:sync -- --source "<ruta>"`;
    throw new Error(`No existe la carpeta local de paquetes BibliImg: ${entriesRoot}\n${hint}`);
  }
  const groups = (await fsp.readdir(entriesRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const subjects = [];
  for (const groupDir of groups) {
    const groupPath = path.join(entriesRoot, groupDir.name);
    const entries = (await fsp.readdir(groupPath, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
    for (const subjectDir of entries) {
      const subjectPath = path.join(groupPath, subjectDir.name);
      const entryPath = path.join(subjectPath, "entry.yaml");
      if (fs.existsSync(entryPath)) {
        subjects.push({ groupFolder: groupDir.name, sourceSlug: subjectDir.name, subjectPath, entryPath });
      }
    }
  }
  return subjects;
}

function validateApprovedPackage(doc, subject) {
  assert(doc && typeof doc === "object", `${subject.sourceSlug}: entry.yaml inválido`);
  assert(doc.schema_version === 2, `${subject.sourceSlug}: schema_version debe ser 2`);
  assert(doc.status === "approved", `${subject.sourceSlug}: solo paquetes approved son integrables`);
  assert(typeof doc.entity_key === "string" && doc.entity_key.trim(), `${subject.sourceSlug}: falta entity_key`);
  assert(typeof doc.canonical_name === "string" && doc.canonical_name.trim(), `${subject.sourceSlug}: falta canonical_name`);
  assert(typeof doc.group === "string" && doc.group.trim(), `${subject.sourceSlug}: falta group`);
  assert(/^[a-z0-9-]+$/.test(subject.sourceSlug), `${subject.sourceSlug}: slug de carpeta inseguro`);
  assert(/^[a-z0-9-]+$/.test(doc.group), `${subject.sourceSlug}: group inseguro ${doc.group}`);

  const requiredLocales = doc.localization?.required_locales ?? [];
  for (const locale of ["es-419", "en-US"]) {
    assert(requiredLocales.includes(locale), `${subject.sourceSlug}: falta locale requerido ${locale}`);
    const content = doc.content?.[locale];
    assert(content, `${subject.sourceSlug}: falta content.${locale}`);
    for (const field of ["display_name", "definition", "alt_text"]) {
      assert(typeof content[field] === "string" && content[field].trim(), `${subject.sourceSlug}: ${locale}.${field} vacío`);
    }
  }

  const visual = doc.visual;
  assert(visual && Number.isInteger(visual.version) && visual.version >= 1, `${subject.sourceSlug}: visual.version inválido`);
  const normalizedChecksum = normalizeSha256(visual.checksum);
  assert(normalizedChecksum, `${subject.sourceSlug}: visual.checksum inválido`);
  visual.checksum = normalizedChecksum;
  assert(typeof visual.has_alpha === "boolean", `${subject.sourceSlug}: visual.has_alpha debe ser boolean`);
  const masterPath = resolveMasterPath(visual.master_file, subject);
  assert(sha256File(masterPath) === normalizedChecksum, `${subject.sourceSlug}: checksum del master no coincide`);

  return masterPath;
}

function buildBaseEntry(doc, sourceSlug, glossarySlug, derivativeMeta) {
  const originalTerms = (doc.language?.original_terms ?? []).map((item) => ({
    language: String(item.language ?? ""),
    script: normalizeNullable(item.script),
    transliteration: normalizeNullable(item.transliteration),
    lemma: normalizeNullable(item.lemma),
    meaning: {
      "es-419": normalizeNullable(item.meaning?.["es-419"]),
      "en-US": normalizeNullable(item.meaning?.["en-US"]),
    },
    certainty: normalizeNullable(item.certainty),
  }));

  return {
    entityKey: doc.entity_key,
    canonicalName: doc.canonical_name,
    group: doc.group,
    sourceStatus: "approved",
    glossarySlug,
    localization: {
      default_locale: doc.localization?.default_locale === "en-US" ? "en-US" : "es-419",
      required_locales: ["es-419", "en-US"],
    },
    locales: {
      "es-419": {
        display_name: doc.content["es-419"].display_name,
        definition: doc.content["es-419"].definition,
        historical_context: normalizeNullable(doc.content["es-419"].historical_context),
        original_language_note: normalizeNullable(doc.content["es-419"].original_language_note),
        alt_text: doc.content["es-419"].alt_text,
      },
      "en-US": {
        display_name: doc.content["en-US"].display_name,
        definition: doc.content["en-US"].definition,
        historical_context: normalizeNullable(doc.content["en-US"].historical_context),
        original_language_note: normalizeNullable(doc.content["en-US"].original_language_note),
        alt_text: doc.content["en-US"].alt_text,
      },
    },
    originalTerms,
    biblicalReferences: {
      primary: splitLocalizedReferences(doc.biblical_references?.primary),
      additional: splitLocalizedReferences(doc.biblical_references?.additional),
      occurrencesSource: normalizeNullable(doc.biblical_references?.occurrences_source),
      occurrencesCount: Number.isInteger(doc.biblical_references?.occurrences_count)
        ? doc.biblical_references.occurrences_count
        : null,
    },
    historical: {
      period: normalizeNullable(doc.historical?.period),
      region: normalizeNullable(doc.historical?.region),
      certainty: doc.historical?.certainty ?? "not_precisely_representable",
    },
    visual: {
      version: doc.visual.version,
      aspectRatio: String(doc.visual.aspect_ratio ?? ""),
      hasAlpha: doc.visual.has_alpha === true,
      masterChecksum: doc.visual.checksum,
      ...derivativeMeta,
    },
    approval: {
      approved_at: doc.approval?.approved_at ?? "",
      notes: normalizeNullable(doc.approval?.notes),
    },
    integrationStatus: "integrated",
  };
}

function sourceEntryPath(subject) {
  return normalizePosix(path.relative(sourceRoot, subject.entryPath));
}

async function renderDerivative(masterPath, maxSide, quality) {
  return sharp(masterPath)
    .resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true })
    .webp({ quality, effort: 6, alphaQuality: 100 })
    .toBuffer({ resolveWithObject: true });
}

async function ensureDerivatives({ doc, subject, masterPath, existingEntry }) {
  const versionTag = `v${String(doc.visual.version).padStart(3, "0")}`;
  const webBase = `/media/editorial/${doc.group}/${subject.sourceSlug}/${versionTag}`;
  const optimizedPath = `${webBase}/${subject.sourceSlug}--optimized.webp`;
  const highPath = `${webBase}/${subject.sourceSlug}--high.webp`;
  const optimizedFile = path.join(publicRoot, optimizedPath.replace(/^\//, ""));
  const highFile = path.join(publicRoot, highPath.replace(/^\//, ""));

  const reusable =
    existingEntry?.visual?.version === doc.visual.version &&
    existingEntry?.visual?.masterChecksum === doc.visual.checksum &&
    existingEntry?.visual?.optimizedPath === optimizedPath &&
    existingEntry?.visual?.highPath === highPath &&
    fs.existsSync(optimizedFile) &&
    fs.existsSync(highFile) &&
    sha256File(optimizedFile) === existingEntry.visual.optimizedChecksum &&
    sha256File(highFile) === existingEntry.visual.highChecksum;

  if (reusable) {
    return {
      meta: {
        optimizedPath,
        highPath,
        optimizedWidth: existingEntry.visual.optimizedWidth,
        optimizedHeight: existingEntry.visual.optimizedHeight,
        highWidth: existingEntry.visual.highWidth,
        highHeight: existingEntry.visual.highHeight,
        optimizedChecksum: existingEntry.visual.optimizedChecksum,
        highChecksum: existingEntry.visual.highChecksum,
      },
      state: "reused",
    };
  }

  if (options.check) {
    return { meta: null, state: "needs-sync" };
  }

  await fsp.mkdir(path.dirname(optimizedFile), { recursive: true });
  const optimized = await renderDerivative(masterPath, 768, 78);
  const high = await renderDerivative(masterPath, 1440, 90);
  await fsp.writeFile(optimizedFile, optimized.data);
  await fsp.writeFile(highFile, high.data);

  return {
    meta: {
      optimizedPath,
      highPath,
      optimizedWidth: optimized.info.width,
      optimizedHeight: optimized.info.height,
      highWidth: high.info.width,
      highHeight: high.info.height,
      optimizedChecksum: sha256Buffer(optimized.data),
      highChecksum: sha256Buffer(high.data),
    },
    state: "generated",
  };
}

const mapping = readJson(mappingPath, { schemaVersion: 1, overrides: {} });
assert(mapping.schemaVersion === 1, "bibli-images-integration-map.json: schemaVersion debe ser 1");
assert(mapping.overrides && typeof mapping.overrides === "object", "bibli-images-integration-map.json: overrides debe ser objeto");
const publishedGlossary = readJson(publishedGlossaryPath, { schemaVersion: 1, entries: {} });
assert(publishedGlossary.schemaVersion === 1, "bibli-images-glossary-published.json: schemaVersion debe ser 1");
assert(publishedGlossary.entries && typeof publishedGlossary.entries === "object" && !Array.isArray(publishedGlossary.entries), "bibli-images-glossary-published.json: entries debe ser objeto");
assert(fs.existsSync(dbPath), `No existe SQLite: ${dbPath}`);

const previousSnapshot = readJson(snapshotPath, { schemaVersion: 1, sourceRoot: path.basename(sourceRoot), entries: {} });
const db = new Database(dbPath, { readonly: true });
const glossaryLookup = db.prepare("SELECT id, term, slug, definition, status FROM glossary_terms WHERE slug = ?");

const subjects = await listSubjectFolders();
const stats = {
  packages: subjects.length,
  approved: 0,
  matched: 0,
  unmatched: [],
  nonApproved: 0,
  draftTarget: [],
  generated: 0,
  reused: 0,
  needsSync: 0,
};
const desiredEntries = {};
const usedGlossarySlugs = new Set();

for (const subject of subjects) {
  const raw = fs.readFileSync(subject.entryPath, "utf8");
  const doc = yaml.load(raw, { schema: yaml.JSON_SCHEMA });
  if (doc?.status !== "approved") {
    stats.nonApproved += 1;
    continue;
  }

  stats.approved += 1;
  const glossarySlug = mapping.overrides[subject.sourceSlug] ?? subject.sourceSlug;
  assert(typeof glossarySlug === "string" && /^[a-z0-9-]+$/.test(glossarySlug), `${subject.sourceSlug}: mapping de Glosario inválido`);
  const glossary = glossaryLookup.get(glossarySlug);
  if (!glossary) {
    stats.unmatched.push(subject.sourceSlug);
    continue;
  }
  if (glossary.status === "Borrador") {
    stats.draftTarget.push(subject.sourceSlug);
    continue;
  }
  const hasExplicitOverride = Object.hasOwn(mapping.overrides, subject.sourceSlug);
  const publishedIdentity = publishedGlossary.entries?.[subject.sourceSlug] ?? null;
  if (publishedIdentity) {
    assert(publishedIdentity.slug === glossarySlug, `${subject.sourceSlug}: el manifest publicado apunta a ${publishedIdentity.slug} y el sync intenta ${glossarySlug}`);
    assert(publishedIdentity.id === glossary.id, `${subject.sourceSlug}: id de Glosario difiere del manifest publicado`);
    assert(publishedIdentity.term === glossary.term, `${subject.sourceSlug}: term de Glosario difiere del manifest publicado`);
    assert(publishedIdentity.definition === glossary.definition, `${subject.sourceSlug}: definition de Glosario difiere del manifest publicado`);
    assert(publishedIdentity.entityKey === doc.entity_key, `${subject.sourceSlug}: entity_key difiere del manifest publicado`);
    assert(publishedIdentity.canonicalName === doc.canonical_name, `${subject.sourceSlug}: canonical_name difiere del manifest publicado`);
  }
  if (!hasExplicitOverride && !publishedIdentity) {
    const sourceIdentitySlug = slugify(doc.content?.["es-419"]?.display_name ?? doc.canonical_name);
    const targetIdentitySlug = slugify(glossary.term);
    assert(sourceIdentitySlug === glossarySlug, `${subject.sourceSlug}: el display_name no confirma la coincidencia automática con ${glossarySlug}`);
    assert(targetIdentitySlug === glossarySlug, `${subject.sourceSlug}: el término de Glosario no confirma su propio slug ${glossarySlug}`);
  }
  assert(!usedGlossarySlugs.has(glossarySlug), `Más de un paquete intenta integrar glossarySlug=${glossarySlug}`);
  usedGlossarySlugs.add(glossarySlug);

  const masterPath = validateApprovedPackage(doc, subject);
  stats.matched += 1;
  const existingEntry = previousSnapshot.entries?.[glossarySlug];
  const derivatives = await ensureDerivatives({ doc, subject, masterPath, existingEntry });
  if (derivatives.state === "needs-sync") {
    stats.needsSync += 1;
    continue;
  }
  stats[derivatives.state] += 1;

  const built = buildBaseEntry(doc, subject.sourceSlug, glossarySlug, derivatives.meta);
  built.sourcePath = sourceEntryPath(subject);
  desiredEntries[glossarySlug] = built;
}

db.close();

const sortedEntries = Object.fromEntries(Object.entries(desiredEntries).sort(([a], [b]) => a.localeCompare(b, "es")));
const desiredSnapshot = {
  schemaVersion: 1,
  sourceRoot: path.basename(sourceRoot),
  entries: sortedEntries,
};

const removedEntries = Object.keys(previousSnapshot.entries ?? {}).filter((slug) => !Object.hasOwn(sortedEntries, slug));
if (removedEntries.length && !options.allowRemove) {
  console.error("BibliImg sync: STOP");
  console.error(`- El sync eliminaría ${removedEntries.length} entrada(s) integrada(s): ${removedEntries.join(", ")}`);
  console.error("- Esto puede indicar sincronización incompleta de OneDrive o un cambio editorial deliberado.");
  console.error("- Si la eliminación es intencional, repite con: npm run bibliimg:sync -- --allow-remove");
  process.exit(1);
}

if (options.check) {
  const currentText = fs.existsSync(snapshotPath) ? fs.readFileSync(snapshotPath, "utf8") : "";
  const desiredText = stableJson(desiredSnapshot);
  const drift = stats.needsSync > 0 || currentText !== desiredText;

  if (drift) {
    console.error("BibliImg sync check: DRIFT");
    console.error(`- Paquetes aprobados escaneados: ${stats.approved}`);
    console.error(`- Integrables por Glosario: ${stats.matched}`);
    if (stats.needsSync) console.error(`- Derivados que requieren regeneración: ${stats.needsSync}`);
    if (currentText !== desiredText) console.error("- El snapshot integrado no coincide con la fuente editorial actual");
    console.error("Ejecuta: npm run bibliimg:sync");
    process.exit(1);
  }

  console.log("BibliImg sync check: PASS");
} else {
  await fsp.mkdir(path.dirname(snapshotPath), { recursive: true });
  await fsp.writeFile(snapshotPath, stableJson(desiredSnapshot), "utf8");
  console.log("BibliImg sync: PASS");
}

console.log(`Fuente: ${sourceRoot}`);
console.log(`Paquetes con entry.yaml: ${stats.packages}`);
console.log(`Approved: ${stats.approved} · integrados al Glosario: ${stats.matched}`);
console.log(`Derivados: ${stats.generated} generados · ${stats.reused} reutilizados`);
console.log(`Sin término de Glosario compatible: ${stats.unmatched.length}`);
if (stats.unmatched.length) {
  console.log(`  ${stats.unmatched.slice(0, 20).join(", ")}${stats.unmatched.length > 20 ? ", …" : ""}`);
}
if (stats.draftTarget.length) console.log(`Targets en Borrador omitidos: ${stats.draftTarget.join(", ")}`);
if (stats.nonApproved) console.log(`Paquetes no aprobados omitidos: ${stats.nonApproved}`);
console.log("SQLite editorial: sin modificaciones");
