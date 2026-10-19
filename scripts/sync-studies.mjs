import fs from "node:fs";
import path from "node:path";
import {
  IMPORTABLE_ARTIFACT_TYPE,
  IMPORTABLE_MODE,
  STUDY_CONTRACT_VERSION,
  compareContentVersions,
  parseContentVersion,
  parseStudyDocument,
  safeRemoveDirectoryContents,
  sha256Buffer,
  toPosixPath,
  versionedStudyFilename,
  walkFiles,
} from "./study-markdown-utils.mjs";
import {
  EDITORIAL_STRUCTURE_FILE,
  compatibilityRoutesConfig,
  parseEditorialConfigText,
} from "./study-editorial-config.mjs";

const projectRoot = process.cwd();
const defaultSourceCandidates = [
  path.resolve(projectRoot, "..", "..", "..", "Estudios Biblicos"),
  path.resolve(projectRoot, "..", "..", "Estudios Biblicos"),
];
const sourceRoot = process.env.BIBLI_STUDIES_SOURCE
  ? path.resolve(process.env.BIBLI_STUDIES_SOURCE)
  : defaultSourceCandidates.find((candidate) => fs.existsSync(candidate)) ?? defaultSourceCandidates[0];
const destinationRoot = path.join(projectRoot, "content", "studies");
const sourceEditorialPath = path.join(sourceRoot, "Sistema", "Estructura-Editorial.yaml");
const destinationEditorialPath = path.join(projectRoot, "content", EDITORIAL_STRUCTURE_FILE);
const compatibilityRoutesPath = path.join(projectRoot, "content", "routes.json");

if (!fs.existsSync(sourceRoot)) {
  console.error("Sincronización de estudios: FAIL");
  console.error(`No existe la fuente local: ${sourceRoot}`);
  console.error("Define BIBLI_STUDIES_SOURCE si tu OneDrive usa otra ubicación.");
  process.exit(1);
}

if (!fs.existsSync(sourceEditorialPath)) {
  console.error("Sincronización de estudios: FAIL");
  console.error(`Falta la estructura editorial canónica: ${sourceEditorialPath}`);
  console.error("No se publican lecciones sin una estructura editorial explícita.");
  process.exit(1);
}

let editorialConfig;
let editorialBuffer;
try {
  editorialBuffer = fs.readFileSync(sourceEditorialPath);
  editorialConfig = parseEditorialConfigText(editorialBuffer.toString("utf8"), sourceEditorialPath);
} catch (error) {
  console.error("Sincronización de estudios: FAIL");
  console.error(error.message);
  process.exit(1);
}

const sourceFiles = walkFiles(sourceRoot, (filePath) => filePath.toLowerCase().endsWith(".md"));
const accepted = [];
const warnings = [];
const problems = [];

for (const sourcePath of sourceFiles) {
  const relativePath = path.relative(sourceRoot, sourcePath);
  const segments = relativePath.split(path.sep);

  if (segments.some((segment) => segment === "Sistema" || segment === "Pruebas")) {
    continue;
  }

  const buffer = fs.readFileSync(sourcePath);
  const text = buffer.toString("utf8");
  let parsed;

  try {
    parsed = parseStudyDocument(text, relativePath);
  } catch (error) {
    warnings.push(`${relativePath}: omitido (${error.message})`);
    continue;
  }

  const fm = parsed.frontmatter;
  if (fm.artifact_type !== IMPORTABLE_ARTIFACT_TYPE || fm.mode !== IMPORTABLE_MODE) {
    warnings.push(`${relativePath}: omitido por artifact_type/mode`);
    continue;
  }

  if (!fm.lesson_id || typeof fm.lesson_id !== "string") {
    problems.push(`${relativePath}: falta lesson_id para resolver revisiones`);
    continue;
  }

  let normalizedVersion;
  try {
    normalizedVersion = parseContentVersion(fm.content_version, `${relativePath}: content_version`).normalized;
  } catch (error) {
    problems.push(error.message);
    continue;
  }

  const sourceFileName = path.basename(sourcePath);
  const expectedFileName = versionedStudyFilename(sourceFileName, normalizedVersion);
  if (sourceFileName !== expectedFileName) {
    problems.push(
      `${relativePath}: nombre no versionado o inconsistente; se esperaba ${expectedFileName} para content_version ${normalizedVersion}`,
    );
    continue;
  }

  accepted.push({
    sourcePath,
    relativePath,
    buffer,
    sha256: sha256Buffer(buffer),
    frontmatter: fm,
    contentVersion: normalizedVersion,
  });
}

if (problems.length > 0) {
  console.error("Sincronización de estudios: FAIL");
  for (const item of problems) console.error(`- ${item}`);
  process.exit(1);
}

if (accepted.length === 0) {
  console.error("Sincronización de estudios: FAIL");
  console.error("No se encontró ningún Markdown oficial importable.");
  process.exit(1);
}

const revisionsByLessonId = new Map();
for (const item of accepted) {
  if (!revisionsByLessonId.has(item.frontmatter.lesson_id)) {
    revisionsByLessonId.set(item.frontmatter.lesson_id, []);
  }
  revisionsByLessonId.get(item.frontmatter.lesson_id).push(item);
}

const selected = [];
for (const [lessonId, revisions] of revisionsByLessonId.entries()) {
  const revisionByVersion = new Map();
  for (const revision of revisions) {
    if (revisionByVersion.has(revision.contentVersion)) {
      problems.push(
        `${lessonId}: content_version ${revision.contentVersion} duplicado entre ${revisionByVersion.get(revision.contentVersion).relativePath} y ${revision.relativePath}`,
      );
    } else {
      revisionByVersion.set(revision.contentVersion, revision);
    }
  }

  if (revisionByVersion.size === 0) continue;
  const ordered = [...revisionByVersion.values()].sort(
    (a, b) => compareContentVersions(a.contentVersion, b.contentVersion),
  );
  const current = ordered[ordered.length - 1];
  current.availableVersions = ordered.map((revision) => revision.contentVersion);
  selected.push(current);
}

if (problems.length > 0) {
  console.error("Sincronización de estudios: FAIL");
  for (const item of problems) console.error(`- ${item}`);
  process.exit(1);
}

selected.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
safeRemoveDirectoryContents(destinationRoot);

const manifest = {
  schema_version: STUDY_CONTRACT_VERSION,
  source: "SharePoint/OneDrive snapshot",
  revision_policy: "highest_semver_per_lesson_id",
  source_file_count: accepted.length,
  file_count: selected.length,
  superseded_revision_count: accepted.length - selected.length,
  files: [],
};

for (const item of selected) {
  const destinationPath = path.join(destinationRoot, item.relativePath);
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.writeFileSync(destinationPath, item.buffer);

  manifest.files.push({
    path: toPosixPath(item.relativePath),
    source_path: toPosixPath(item.relativePath),
    sha256: item.sha256,
    artifact_type: item.frontmatter.artifact_type,
    content_type: item.frontmatter.content_type,
    mode: item.frontmatter.mode,
    lesson_id: item.frontmatter.lesson_id,
    route_id: item.frontmatter.route_id,
    route_lesson_number: item.frontmatter.route_lesson_number,
    book_id: item.frontmatter.book_id,
    primary_reference: item.frontmatter.primary_reference,
    translation: item.frontmatter.translation,
    content_version: item.contentVersion,
    available_versions: item.availableVersions,
    section_id: item.frontmatter.section_id ?? null,
  });
}

fs.mkdirSync(path.dirname(destinationEditorialPath), { recursive: true });
fs.writeFileSync(destinationEditorialPath, editorialBuffer);
fs.writeFileSync(
  compatibilityRoutesPath,
  `${JSON.stringify(compatibilityRoutesConfig(editorialConfig), null, 2)}\n`,
  "utf8",
);

fs.writeFileSync(
  path.join(destinationRoot, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log("Sincronización de estudios: PASS");
console.log(`Fuente: ${sourceRoot}`);
console.log(`Markdown oficiales encontrados: ${accepted.length}`);
console.log(`Lecciones vigentes copiadas: ${selected.length}`);
console.log(`Revisiones históricas omitidas del snapshot: ${accepted.length - selected.length}`);
console.log(`Destino: ${destinationRoot}`);
console.log(`Estructura editorial: ${sourceEditorialPath} → ${destinationEditorialPath}`);
console.log(`Snapshot compatible generado: ${compatibilityRoutesPath}`);
if (warnings.length > 0) {
  console.log(`Archivos no importables/omitidos: ${warnings.length}`);
}
