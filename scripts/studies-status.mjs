import fs from "node:fs";
import path from "node:path";
import { parseStudyDocument, walkFiles } from "./study-markdown-utils.mjs";
import {
  EDITORIAL_STRUCTURE_FILE,
  loadEditorialConfig,
  resolveEditorialModule,
  sectionIdRequiredFromLesson,
} from "./study-editorial-config.mjs";

const projectRoot = process.cwd();
const studiesRoot = path.join(projectRoot, "content", "studies");
const editorialPath = path.join(projectRoot, "content", EDITORIAL_STRUCTURE_FILE);

if (!fs.existsSync(studiesRoot)) {
  console.error("Estado editorial de estudios: FAIL");
  console.error("No existe content/studies. Ejecuta npm run studies:sync.");
  process.exit(1);
}
if (!fs.existsSync(editorialPath)) {
  console.error("Estado editorial de estudios: FAIL");
  console.error(`Falta content/${EDITORIAL_STRUCTURE_FILE}. Ejecuta npm run studies:sync.`);
  process.exit(1);
}

let editorialConfig;
try {
  editorialConfig = loadEditorialConfig(projectRoot);
} catch (error) {
  console.error("Estado editorial de estudios: FAIL");
  console.error(error.message);
  process.exit(1);
}

const routeById = new Map(editorialConfig.routes.map((route) => [route.id, route]));
const markdownFiles = walkFiles(studiesRoot, (filePath) => filePath.toLowerCase().endsWith(".md"));
const parseProblems = [];
let officialLessons = 0;
let explicitSections = 0;
let legacySections = 0;
const unresolved = [];

for (const filePath of markdownFiles) {
  const relativePath = path.relative(studiesRoot, filePath);
  try {
    const parsed = parseStudyDocument(fs.readFileSync(filePath, "utf8"), relativePath);
    const fm = parsed.frontmatter;
    if (fm.artifact_type !== "bible_study_lesson" || fm.mode !== "official" || fm.content_type !== "lesson") continue;
    officialLessons += 1;

    const route = routeById.get(fm.route_id);
    if (!route) {
      unresolved.push(`${relativePath}: route_id desconocido ${fm.route_id}`);
      continue;
    }

    const requiredFrom = sectionIdRequiredFromLesson(editorialConfig, fm.route_id);
    if (fm.route_lesson_number >= requiredFrom && (!fm.section_id || typeof fm.section_id !== "string" || !fm.section_id.trim())) {
      unresolved.push(`${relativePath}: section_id obligatorio desde la Lección ${requiredFrom}`);
      continue;
    }

    const module = resolveEditorialModule(route, fm);
    if (!module) {
      unresolved.push(`${relativePath}: sección editorial no resoluble`);
      continue;
    }

    if (fm.section_id) explicitSections += 1;
    else legacySections += 1;
  } catch (error) {
    parseProblems.push(`${relativePath}: ${error.message}`);
  }
}

if (parseProblems.length > 0 || unresolved.length > 0) {
  console.error("Estado editorial de estudios: FAIL");
  for (const item of [...parseProblems, ...unresolved]) console.error(`- ${item}`);
  process.exit(1);
}

const moduleCount = editorialConfig.routes.reduce((sum, route) => sum + (route.modules || []).length, 0);

console.log("Estado editorial de estudios: PASS");
console.log(`Lecciones oficiales: ${officialLessons}`);
console.log(`Módulos editoriales: ${moduleCount}`);
console.log(`Lecciones con section_id explícito: ${explicitSections}`);
console.log(`Lecciones con compatibilidad heredada por rango: ${legacySections}`);
console.log("Lecciones sin sección editorial: 0");
console.log("Organización editorial: al día");
