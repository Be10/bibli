import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const root = process.cwd();
const dbPath = path.join(root, 'data', 'bibli.sqlite');
const problems = [];
const notices = [];

const pairs = [
  ['src/pages/index.astro', 'src/pages/en/index.astro', ['HomeStudyVisual']],
  ['src/pages/buscar/index.astro', 'src/pages/en/search/index.astro', ['data-utility-root', 'data-utility-kind="search"']],
  ['src/pages/descargar/index.astro', 'src/pages/en/download/index.astro', ['OfflinePackages']],
  ['src/pages/mi-bibli/index.astro', 'src/pages/en/my-bibli/index.astro', ['PersonalDashboard']],
  ['src/pages/es/biblia/index.astro', 'src/pages/en/bible/index.astro', []],
  ['src/pages/es/biblia/[versionId]/index.astro', 'src/pages/en/bible/[versionId]/index.astro', []],
  ['src/pages/es/biblia/[versionId]/[bookCode]/index.astro', 'src/pages/en/bible/[versionId]/[bookCode]/index.astro', []],
  ['src/pages/es/biblia/[versionId]/[bookCode]/[chapter].astro', 'src/pages/en/bible/[versionId]/[bookCode]/[chapter].astro', ['ReaderPreferences']],
];

function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    problems.push(`falta ${rel}`);
    return null;
  }
  return fs.readFileSync(file, 'utf8');
}

for (const [esRel, enRel, sharedTokens] of pairs) {
  const esText = read(esRel);
  const enText = read(enRel);
  if (esText === null || enText === null) continue;
  for (const token of sharedTokens) {
    if (!esText.includes(token)) problems.push(`${esRel}: falta contrato compartido ${token}`);
    if (!enText.includes(token)) problems.push(`${enRel}: falta contrato compartido ${token}`);
  }
  if (!esText.includes('alternateLanguage=')) problems.push(`${esRel}: falta contraparte EN explícita para SEO/selector`);
  if (!enText.includes('alternateLanguage=')) problems.push(`${enRel}: falta contraparte ES explícita para SEO/selector`);
}

const baseLayout = read('src/layouts/BaseLayout.astro');
if (baseLayout !== null) {
  if (!/<html\b[^>]*\blang=\{lang\}/s.test(baseLayout)) {
    problems.push('src/layouts/BaseLayout.astro: falta lang dinámico en <html>');
  }
  const layoutContracts = [
    ['sitePath("/en/search/data.json")', 'índice global EN'],
    ['sitePath("/buscar/datos.json")', 'índice global ES'],
    ['sitePath("/en/search/")', 'ruta de búsqueda EN'],
    ['sitePath("/buscar/")', 'ruta de búsqueda ES'],
    ['getBibleRootPath(lang)', 'raíz bíblica dependiente del idioma'],
    ['<link rel="canonical" href={canonicalHref}', 'canonical absoluto por página'],
    ['hreflang={lang}', 'hreflang autorreferente'],
    ['hreflang={alternateLanguage.code}', 'hreflang de contraparte'],
    ['hreflang="x-default"', 'hreflang x-default'],
    ['og:locale:alternate', 'locale alternativo de Open Graph'],
    ['data-language-switch', 'selector global de idioma'],
    ['data-language-mode={languageTarget.mode}', 'modo explícito equivalent/fallback del selector'],
    ['data-language-preference={!isNoIndex ? lang : undefined}', 'persistencia del idioma activo solo en páginas indexables'],
    ['mode === "equivalent"', 'preservación de query/ancla solo entre equivalentes'],
    ['localStorage.setItem("bibli-language", currentLanguage)', 'sincronización de preferencia con la ruta activa'],
  ];
  for (const [token, label] of layoutContracts) {
    if (!baseLayout.includes(token)) problems.push(`src/layouts/BaseLayout.astro: falta ${label}`);
  }
}

const personalActions = read('src/components/PersonalActions.astro');
if (personalActions !== null) {
  const personalContracts = [
    ['lang: \"es\" | \"en\"', 'prop de idioma ES/EN'],
    ['Guardar', 'copy de favoritos ES'],
    ['Save', 'copy de favoritos EN'],
    ['Nota personal', 'copy de notas ES'],
    ['Personal note', 'copy de notas EN'],
  ];
  for (const [token, label] of personalContracts) {
    if (!personalActions.includes(token)) problems.push(`src/components/PersonalActions.astro: falta ${label}`);
  }
}


const personalSpacePages = [
  ['src/pages/mi-bibli/index.astro', 'Mi Bibli', 'ES'],
  ['src/pages/en/my-bibli/index.astro', 'My Bibli', 'EN'],
];
for (const [rel, name, language] of personalSpacePages) {
  const pageText = read(rel);
  if (pageText === null) continue;
  if (!pageText.includes(`title="${name}"`)) problems.push(`${rel}: falta título de espacio personal ${language}`);
  if (!pageText.includes(`<h1>${name}</h1>`)) problems.push(`${rel}: falta encabezado de espacio personal ${language}`);
}

const personalDashboard = read('src/components/PersonalDashboard.astro');
const personalProgress = read('src/components/PersonalProgress.astro');
if (personalDashboard !== null) {
  const personalDashboardContracts = [
    ['Favoritos', 'favoritos ES'],
    ['Saved items', 'favoritos EN'],
    ['Notas personales', 'notas ES'],
    ['Personal notes', 'notas EN'],
    ['Historial de lectura', 'historial ES'],
    ['Reading history', 'historial EN'],
    ['Actividad reciente', 'actividad reciente ES'],
    ['Recent activity', 'actividad reciente EN'],
    ['Visitado', 'actividad visitada ES'],
    ['Visited', 'actividad visitada EN'],
    ['Nota actualizada', 'actividad de nota ES'],
    ['Note updated', 'actividad de nota EN'],
    ['Progreso actualizado', 'actividad de progreso ES'],
    ['Progress updated', 'actividad de progreso EN'],
    ['Biblioteca sin conexión', 'offline ES'],
    ['Offline library', 'offline EN'],
  ];
  for (const [token, label] of personalDashboardContracts) {
    if (!personalDashboard.includes(token)) problems.push(`src/components/PersonalDashboard.astro: falta ${label}`);
  }
}


if (personalProgress !== null) {
  const personalProgressContracts = [
    ['Progreso por ruta y módulo', 'progreso ruta/módulo ES'],
    ['Progress by route and module', 'progreso ruta/módulo EN'],
    ['Progreso de estudio por libro', 'progreso por libro ES'],
    ['Study progress by book', 'progreso por libro EN'],
    ['Progreso de lectura bíblica', 'progreso bíblico ES'],
    ['Bible reading progress', 'progreso bíblico EN'],
    ['Capítulos leídos', 'capítulos leídos ES'],
    ['Chapters read', 'capítulos leídos EN'],
  ];
  for (const [token, label] of personalProgressContracts) {
    if (!personalProgress.includes(token)) problems.push(`src/components/PersonalProgress.astro: falta ${label}`);
  }
}

if (personalActions !== null) {
  const bibleProgressActionContracts = [
    ['Marcar capítulo leído', 'acción capítulo leído ES'],
    ['Mark chapter read', 'acción capítulo leído EN'],
    ['Capítulo leído', 'estado capítulo leído ES'],
    ['Chapter read', 'estado capítulo leído EN'],
  ];
  for (const [token, label] of bibleProgressActionContracts) {
    if (!personalActions.includes(token)) problems.push(`src/components/PersonalActions.astro: falta ${label}`);
  }
}

const offlinePage = read('src/pages/offline.astro');
if (offlinePage !== null) {
  const offlineContracts = [
    ['localStorage.getItem("bibli-language")', 'preferencia persistida de idioma'],
    ['data-offline-copy="es"', 'copy offline ES'],
    ['data-offline-copy="en"', 'copy offline EN'],
  ];
  for (const [token, label] of offlineContracts) {
    if (!offlinePage.includes(token)) problems.push(`src/pages/offline.astro: falta ${label}`);
  }
}

const bibleConfigRel = 'src/lib/bible-config.ts';
const bibleConfig = read(bibleConfigRel);
let defaultVersions = { es: null, en: null };
if (bibleConfig !== null) {
  if (!/SUPPORTED_LANGUAGE_CODES\s*=\s*\[\s*["']es["']\s*,\s*["']en["']\s*\]/m.test(bibleConfig)) {
    problems.push(`${bibleConfigRel}: idiomas soportados deben ser exactamente es/en`);
  }
  for (const language of ['es', 'en']) {
    const match = bibleConfig.match(new RegExp(`${language}\\s*:\\s*\\{[\\s\\S]*?defaultBibleVersionId\\s*:\\s*["']([^"']+)["']`));
    if (!match) problems.push(`${bibleConfigRel}: falta defaultBibleVersionId para ${language}`);
    else defaultVersions[language] = match[1];
  }
}

let esBookCount = 0;
let enBookCount = 0;
let esVersionCount = 0;
let enVersionCount = 0;
if (!fs.existsSync(dbPath)) {
  problems.push('falta data/bibli.sqlite para auditar datos bilingües');
} else {
  const db = new Database(dbPath, { readonly: true });
  try {
    const publishedBookCount = db.prepare(`SELECT COUNT(*) AS count FROM books WHERE status <> 'Borrador'`).get().count;
    if (publishedBookCount !== 66) problems.push(`datos bilingües: se esperaban 66 libros publicados y hay ${publishedBookCount}`);

    const translationCounts = db.prepare(`
      SELECT bt.language, COUNT(*) AS count
      FROM book_translations bt
      JOIN books b ON b.id = bt.book_id
      WHERE b.status <> 'Borrador'
      GROUP BY bt.language
    `).all();
    const countByLanguage = new Map(translationCounts.map((row) => [row.language, row.count]));
    esBookCount = countByLanguage.get('es') ?? 0;
    enBookCount = countByLanguage.get('en') ?? 0;
    if (esBookCount !== 66) problems.push(`datos bilingües: traducciones ES de libros ${esBookCount}/66`);
    if (enBookCount !== 66) problems.push(`datos bilingües: traducciones EN de libros ${enBookCount}/66`);

    for (const language of ['es', 'en']) {
      const incomplete = db.prepare(`
        SELECT COUNT(*) AS count
        FROM book_translations bt
        JOIN books b ON b.id = bt.book_id
        WHERE b.status <> 'Borrador'
          AND bt.language = ?
          AND (
            TRIM(bt.name) = '' OR
            TRIM(bt.slug) = '' OR
            COALESCE(TRIM(bt.abbreviation), '') = '' OR
            TRIM(bt.testament) = ''
          )
      `).get(language).count;
      if (incomplete) problems.push(`datos bilingües: ${incomplete} traducción(es) de libro ${language.toUpperCase()} con campos esenciales vacíos`);
    }

    const versions = db.prepare(`
      SELECT id, language
      FROM bible_versions
      WHERE status <> 'Borrador'
      ORDER BY id
    `).all();
    esVersionCount = versions.filter((row) => row.language === 'es').length;
    enVersionCount = versions.filter((row) => row.language === 'en').length;
    if (esVersionCount < 1) problems.push('datos bilingües: falta una versión bíblica pública ES');
    if (enVersionCount < 1) problems.push('datos bilingües: falta una versión bíblica pública EN');
    for (const row of versions) {
      if (!['es', 'en'].includes(row.language)) problems.push(`datos bilingües: versión pública ${row.id} usa idioma no soportado ${row.language}`);
    }

    for (const language of ['es', 'en']) {
      const versionId = defaultVersions[language];
      if (!versionId) continue;
      const version = db.prepare(`SELECT id, language, status FROM bible_versions WHERE id = ?`).get(versionId);
      if (!version || version.status === 'Borrador') {
        problems.push(`datos bilingües: versión por defecto ${language.toUpperCase()} (${versionId}) no existe o está en Borrador`);
      } else if (version.language !== language) {
        problems.push(`datos bilingües: versión por defecto ${versionId} declara ${version.language}, se esperaba ${language}`);
      }
    }
  } finally {
    db.close();
  }
}

const plannedCatalogs = ['libros','pasajes','personajes','lugares','temas','eventos','recursos','glosario','rutas','lecciones'];
let englishCatalogCount = 0;
for (const name of plannedCatalogs) {
  const esIndex = path.join(root, 'src/pages', name, 'index.astro');
  const enIndex = path.join(root, 'src/pages/en', name, 'index.astro');
  if (!fs.existsSync(esIndex)) continue;
  if (fs.existsSync(enIndex)) englishCatalogCount += 1;
  else notices.push(`cobertura EN pendiente: ${name}`);
}

if (notices.length) {
  console.log('Paridad ES/EN: cobertura informativa');
  console.log(`- cobertura editorial EN: ${englishCatalogCount}/${plannedCatalogs.length} catálogos con índice propio`);
  for (const n of notices) console.log(`- ${n}`);
}
if (problems.length) {
  console.error('Paridad ES/EN: FAIL');
  for (const p of problems) console.error(`- ${p}`);
  process.exit(1);
}
console.log('Paridad ES/EN: PASS (shell, búsqueda y lector bíblico)');
console.log(`Datos bilingües: libros ES ${esBookCount}/66 · EN ${enBookCount}/66 · versiones públicas ES ${esVersionCount} · EN ${enVersionCount}`);
