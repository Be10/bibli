import fs from "node:fs";
import path from "node:path";
import {
  IMPORTABLE_ARTIFACT_TYPE,
  IMPORTABLE_MODE,
  STUDY_CONTRACT_VERSION,
  parseStudyDocument,
  safeRemoveDirectoryContents,
  sha256Buffer,
  toPosixPath,
  walkFiles,
} from "./study-markdown-utils.mjs";

const projectRoot = process.cwd();
const defaultSourceCandidates = [
  path.resolve(projectRoot, "..", "..", "..", "Estudios Biblicos"),
  path.resolve(projectRoot, "..", "..", "Estudios Biblicos"),
];
const sourceRoot = process.env.BIBLI_STUDIES_SOURCE
  ? path.resolve(process.env.BIBLI_STUDIES_SOURCE)
  : defaultSourceCandidates.find((candidate) => fs.existsSync(candidate)) ?? defaultSourceCandidates[0];
const destinationRoot = path.join(projectRoot, "content", "studies");

if (!fs.existsSync(sourceRoot)) {
  console.error("Sincronización de estudios: FAIL");
  console.error(`No existe la fuente local: ${sourceRoot}`);
  console.error("Define BIBLI_STUDIES_SOURCE si tu OneDrive usa otra ubicación.");
  process.exit(1);
}

const sourceFiles = walkFiles(sourceRoot, (filePath) => filePath.toLowerCase().endsWith(".md"));
const accepted = [];
const warnings = [];

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

  accepted.push({
    sourcePath,
    relativePath,
    buffer,
    sha256: sha256Buffer(buffer),
    frontmatter: fm,
  });
}

if (accepted.length === 0) {
  console.error("Sincronización de estudios: FAIL");
  console.error("No se encontró ningún Markdown oficial importable.");
  process.exit(1);
}

accepted.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
safeRemoveDirectoryContents(destinationRoot);

const manifest = {
  schema_version: STUDY_CONTRACT_VERSION,
  source: "SharePoint/OneDrive snapshot",
  file_count: accepted.length,
  files: [],
};

for (const item of accepted) {
  const destinationPath = path.join(destinationRoot, item.relativePath);
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.writeFileSync(destinationPath, item.buffer);

  manifest.files.push({
    path: toPosixPath(item.relativePath),
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
    content_version: item.frontmatter.content_version,
  });
}

fs.writeFileSync(
  path.join(destinationRoot, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log("Sincronización de estudios: PASS");
console.log(`Fuente: ${sourceRoot}`);
console.log(`Markdown oficiales copiados: ${accepted.length}`);
console.log(`Destino: ${destinationRoot}`);
if (warnings.length > 0) {
  console.log(`Archivos no importables/omitidos: ${warnings.length}`);
}
