import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const problems = [];

function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    problems.push(`falta ${rel}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
}

const personal = read('src/lib/personal-state.ts');
const lesson = read('src/pages/lecciones/[slug].astro');
const packageJson = read('package.json');
const baseLayout = read('src/layouts/BaseLayout.astro');
const homeEs = read('src/pages/index.astro');
const homeEn = read('src/pages/en/index.astro');
const personalContinue = read('src/components/PersonalContinue.astro');
const personalActions = read('src/components/PersonalActions.astro');
const personalDashboard = read('src/components/PersonalDashboard.astro');
const personalProgress = read('src/components/PersonalProgress.astro');
const progressCatalog = read('src/lib/personal-progress-catalog.ts');
const myBibliEs = read('src/pages/mi-bibli/index.astro');
const myBibliEn = read('src/pages/en/my-bibli/index.astro');

const requiredStores = [
  'bibli-bookmarks-v1',
  'bibli-notes-v1',
  'bibli-history-v1',
  'bibli-learning-progress-v1',
];

for (const key of requiredStores) {
  if (!personal.includes(`"${key}"`)) problems.push(`src/lib/personal-state.ts: falta store versionado ${key}`);
}

const personalContracts = [
  ['PERSONAL_STATE_SCHEMA_VERSION = 1', 'versión de esquema personal v1'],
  ['normalizeLearningProgress', 'normalización/migración de progreso'],
  ['readLearningProgress', 'lector compartido de progreso'],
  ['writeLearningProgress', 'escritor compartido de progreso'],
  ['readBookmarks', 'store de favoritos'],
  ['readNotes', 'store de notas'],
  ['readHistory', 'store de historial'],
  ['createPersonalContentRef', 'clasificación compartida de contenido visitable'],
  ['recordHistoryVisit', 'registro deduplicado de historial'],
  ['getLatestHistoryEntry', 'última lectura por idioma'],
  ['getBookmarkForContent', 'consulta de favorito por contenido'],
  ['toggleBookmark', 'alta/baja de favoritos'],
  ['deleteBookmark', 'eliminación determinista de favoritos'],
  ['getNoteForContent', 'consulta de nota por contenido'],
  ['upsertNote', 'alta/edición de notas'],
  ['deleteNote', 'eliminación de notas'],
  ['clearHistory', 'limpieza de historial por idioma'],
  ['bibli:progress-change', 'evento compartido de progreso'],
  ['href.startsWith("/")', 'guardrail de href interno en estado personal'],
  ['PERSONAL_HISTORY_LIMIT = 50', 'límite de historial'],
  ['readBibleChapters', 'progreso bíblico explícito dentro del store existente'],
  ['isBibleChapterRead', 'consulta de capítulo bíblico leído'],
  ['toggleBibleChapterRead', 'alta/baja explícita de capítulo bíblico leído'],
];
for (const [token, label] of personalContracts) {
  if (!personal.includes(token)) problems.push(`src/lib/personal-state.ts: falta ${label}`);
}

const lessonContracts = [
  ['LEARNING_PROGRESS_STORAGE_KEY', 'clave compartida del progreso'],
  ['readLearningProgress', 'lectura compartida del progreso'],
  ['writeLearningProgress', 'escritura compartida del progreso'],
  ['data-progress-storage-key', 'clave de hidratación temprana declarativa'],
];
for (const [token, label] of lessonContracts) {
  if (!lesson.includes(token)) problems.push(`src/pages/lecciones/[slug].astro: falta ${label}`);
}

if (/const\s+PROGRESS_KEY\s*=\s*["']bibli-learning-progress-v1["']/.test(lesson)) {
  problems.push('src/pages/lecciones/[slug].astro: el progreso vuelve a declarar una clave local en vez de usar el store compartido');
}



const historyContracts = [
  [baseLayout, 'data-personal-page-title', 'BaseLayout declara título para historial'],
  [baseLayout, 'recordHistoryVisit', 'BaseLayout registra visitas de contenido'],
  [baseLayout, 'recordCurrentPersonalContent', 'BaseLayout centraliza registro de la página actual'],
  [personalContinue, 'getLatestHistoryEntry', 'PersonalContinue lee la última visita por idioma'],
  [personalContinue, 'data-personal-continue-link', 'PersonalContinue expone enlace de continuación'],
  [homeEs, 'PersonalContinue lang="es"', 'Home ES incluye continuación personal'],
  [homeEn, 'PersonalContinue lang="en"', 'Home EN incluye continuación personal'],
  [homeEs, 'LEARNING_PROGRESS_STORAGE_KEY', 'Home ES reutiliza la clave compartida de progreso'],
  [homeEs, 'readLearningProgress', 'Home ES reutiliza normalización compartida de progreso'],
];
for (const [source, token, label] of historyContracts) {
  if (!source.includes(token)) problems.push(`funciones personales: falta ${label}`);
}

const actionContracts = [
  [baseLayout, 'PersonalActions', 'BaseLayout incluye acciones personales compartidas'],
  [baseLayout, '<PersonalActions lang={lang} />', 'BaseLayout propaga idioma a acciones personales'],
  [personalActions, 'data-personal-actions', 'superficie compartida de favoritos/notas'],
  [personalActions, 'data-personal-bookmark', 'control de favoritos'],
  [personalActions, 'data-personal-note-toggle', 'control de notas'],
  [personalActions, 'data-personal-note-input', 'editor de nota personal'],
  [personalActions, 'aria-pressed', 'estado accesible de favorito'],
  [personalActions, 'aria-expanded', 'estado accesible del editor de nota'],
  [personalActions, 'toggleBookmark', 'persistencia compartida de favorito'],
  [personalActions, 'upsertNote', 'persistencia compartida de nota'],
  [personalActions, 'deleteNote', 'eliminación compartida de nota'],
  [personalActions, 'data-personal-bible-read', 'control explícito de capítulo leído'],
  [personalActions, 'toggleBibleChapterRead', 'persistencia compartida de lectura bíblica'],
];
for (const [source, token, label] of actionContracts) {
  if (!source.includes(token)) problems.push(`funciones personales: falta ${label}`);
}


const dashboardContracts = [
  [baseLayout, 'sitePath("/mi-bibli/")', 'menú global enlaza Mi Bibli ES'],
  [baseLayout, 'sitePath("/en/my-bibli/")', 'menú global enlaza My Bibli EN'],
  [personalDashboard, 'data-personal-dashboard', 'dashboard personal compartido'],
  [personalDashboard, 'readBookmarks', 'dashboard consume favoritos existentes'],
  [personalDashboard, 'readNotes', 'dashboard consume notas existentes'],
  [personalDashboard, 'readHistory', 'dashboard consume historial existente'],
  [personalDashboard, 'readLearningProgress', 'dashboard consume progreso existente'],
  [personalDashboard, 'deleteBookmark', 'dashboard puede quitar favoritos'],
  [personalDashboard, 'deleteNote', 'dashboard puede eliminar notas'],
  [personalDashboard, 'clearHistory', 'dashboard puede limpiar historial'],
  [personalDashboard, 'data-personal-activity-list', 'dashboard expone actividad reciente'],
  [personalDashboard, 'progress.updatedAt', 'actividad reciente incorpora cambios de progreso sin store adicional'],
  [personalDashboard, 'activity.slice(0, 12)', 'actividad reciente mantiene un límite visual'],
  [personalDashboard, 'setStat("history", history.length)', 'contador de historial usa historial real y no actividad agregada'],
  [personalDashboard, 'clearHistory(lang);\n      syncDashboard(root);', 'limpieza de historial resincroniza el dashboard inmediatamente'],
  [myBibliEs, '<PersonalDashboard lang="es" studyCatalog={studyCatalog} bibleCatalog={bibleCatalog} />', 'ruta Mi Bibli ES usa dashboard y catálogos de progreso'],
  [myBibliEn, '<PersonalDashboard lang="en" studyCatalog={studyCatalog} bibleCatalog={bibleCatalog} />', 'ruta My Bibli EN usa dashboard y catálogos de progreso'],
  [myBibliEs, 'alternateLanguage=', 'Mi Bibli ES declara contraparte EN'],
  [myBibliEn, 'alternateLanguage=', 'My Bibli EN declara contraparte ES'],
  [personalDashboard, 'PersonalProgress', 'dashboard delega progreso detallado a componente compartido'],
  [personalProgress, 'data-study-route-progress-list', 'detalle de progreso por ruta/módulo'],
  [personalProgress, 'data-study-book-progress-list', 'detalle de progreso por libro'],
  [personalProgress, 'data-bible-version-progress-list', 'detalle de progreso bíblico por versión/libro'],
  [personalProgress, 'readBibleChapters', 'dashboard consume capítulos marcados como leídos'],
  [progressCatalog, 'getStudyProgressCatalog', 'catálogo canónico de progreso de estudio'],
  [progressCatalog, 'getBibleProgressCatalog', 'catálogo canónico de progreso bíblico'],
  [myBibliEs, 'getStudyProgressCatalog("es")', 'Mi Bibli ES construye catálogo de estudio desde SQLite'],
  [myBibliEs, 'getBibleProgressCatalog("es")', 'Mi Bibli ES construye catálogo bíblico desde SQLite'],
  [myBibliEn, 'getStudyProgressCatalog("en")', 'My Bibli EN construye catálogo de estudio localizado'],
  [myBibliEn, 'getBibleProgressCatalog("en")', 'My Bibli EN construye catálogo bíblico localizado'],
];
for (const [source, token, label] of dashboardContracts) {
  if (!source.includes(token)) problems.push(`funciones personales: falta ${label}`);
}

if (/['\"]bibli-learning-progress-v1['\"]/.test(homeEs)) {
  problems.push('src/pages/index.astro: no debe volver a hardcodear bibli-learning-progress-v1');
}

if (!packageJson.includes('"personal:validate"')) problems.push('package.json: falta script personal:validate');
if (!packageJson.includes('npm run personal:validate')) problems.push('package.json: personal:validate no está encadenado a prebuild');

if (problems.length) {
  console.error('Estado personal: FAIL');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log('Estado personal: PASS');
console.log('Stores v1: bookmarks · notes · history · learning-progress');
console.log('Progreso: Lecciones + ruta/módulo/libro + capítulos bíblicos explícitos');
console.log('Mi Bibli: continuar · favoritos · notas · historial · actividad reciente · progreso · offline');
