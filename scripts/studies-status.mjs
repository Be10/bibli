import fs from "node:fs";
import path from "node:path";
import { parseStudyDocument, walkFiles } from "./study-markdown-utils.mjs";

const projectRoot = process.cwd();
const studiesRoot = path.join(projectRoot, "content", "studies");
const routesPath = path.join(projectRoot, "content", "routes.json");

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

if (!fs.existsSync(studiesRoot)) {
  console.error("Estado editorial de estudios: FAIL");
  console.error("No existe content/studies. Ejecuta npm run studies:sync.");
  process.exit(1);
}
if (!fs.existsSync(routesPath)) {
  console.error("Estado editorial de estudios: FAIL");
  console.error("Falta content/routes.json.");
  process.exit(1);
}

const routesConfig = JSON.parse(fs.readFileSync(routesPath, "utf8"));
const routeById = new Map((routesConfig.routes || []).map((route) => [route.id, route]));
const markdownFiles = walkFiles(studiesRoot, (filePath) => filePath.toLowerCase().endsWith(".md"));
const routeLessons = new Map();
const parseProblems = [];

for (const filePath of markdownFiles) {
  try {
    const parsed = parseStudyDocument(fs.readFileSync(filePath, "utf8"), path.relative(studiesRoot, filePath));
    const fm = parsed.frontmatter;
    if (fm.artifact_type !== "bible_study_lesson" || fm.mode !== "official" || fm.content_type !== "lesson") continue;
    const lessons = routeLessons.get(fm.route_id) || [];
    lessons.push({ lessonNumber: fm.route_lesson_number, lessonId: fm.lesson_id });
    routeLessons.set(fm.route_id, lessons);
  } catch (error) {
    parseProblems.push(`${path.relative(studiesRoot, filePath)}: ${error.message}`);
  }
}

if (parseProblems.length > 0) {
  console.error("Estado editorial de estudios: FAIL");
  for (const item of parseProblems) console.error(`- ${item}`);
  process.exit(1);
}

let definitiveLessons = 0;
let provisionalLessons = 0;
let definitiveModules = 0;
const provisionalRanges = [];

for (const route of routesConfig.routes || []) {
  definitiveModules += (route.modules || []).length;
  const lessons = [...(routeLessons.get(route.id) || [])].sort((a, b) => a.lessonNumber - b.lessonNumber);
  const provisional = [];

  for (const lesson of lessons) {
    if (resolveConfiguredModule(route, lesson.lessonNumber)) definitiveLessons += 1;
    else provisional.push(lesson.lessonNumber);
  }

  if (provisional.length > 0) {
    provisionalLessons += provisional.length;
    provisionalRanges.push({
      routeId: route.id,
      start: provisional[0],
      end: provisional[provisional.length - 1],
      count: provisional.length,
      title: route.auto_append_module?.title || "Continuación de la ruta",
      expectedStart: configuredRangeEnd(route) + 1,
    });
  }
}

const unknownRouteLessons = [...routeLessons.entries()]
  .filter(([routeId]) => !routeById.has(routeId))
  .reduce((sum, [, lessons]) => sum + lessons.length, 0);

console.log("Estado editorial de estudios: PASS");
console.log(`Lecciones oficiales: ${definitiveLessons + provisionalLessons + unknownRouteLessons}`);
console.log(`Módulos definitivos: ${definitiveModules}`);
console.log(`Lecciones definitivas: ${definitiveLessons}`);
console.log(`Lecciones provisionales: ${provisionalLessons}`);

if (unknownRouteLessons > 0) {
  console.log(`Lecciones con route_id desconocido: ${unknownRouteLessons}`);
}

if (provisionalRanges.length === 0) {
  console.log("Organización editorial: al día");
} else {
  console.log("Organización editorial pendiente:");
  for (const item of provisionalRanges) {
    const contiguous = item.start === item.expectedStart && item.end - item.start + 1 === item.count;
    const suffix = contiguous ? "" : " · revisar continuidad";
    console.log(`- ${item.routeId}: ${item.count} lecciones provisionales (${item.start}–${item.end}) en "${item.title}"${suffix}`);
  }
}
