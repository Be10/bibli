import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcRoot = path.join(root, "src");
const problems = [];

const sourceExtensions = new Set([".astro", ".ts", ".js", ".mjs", ".css"]);
const retiredColors = [
  "#5d3212",
  "#8a5a2b",
  "#eadcc4",
  "#c8a982",
  "#e9b872",
  "#d8c8b6",
  "#fff2d8",
  "#f7dfb7",
  "#21160e",
];

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) files.push(fullPath);
  }
  return files;
}

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}

function assertContains(content, token, message) {
  if (!content.includes(token)) problems.push(message);
}

const inlineSvgAllowedFiles = new Set([
  "src/components/Icon.astro",
  "src/components/BibliLogo.astro",
]);

if (!fs.existsSync(srcRoot)) {
  problems.push("falta el directorio src/");
} else {
  for (const file of walk(srcRoot)) {
    const rel = relative(file);
    const content = fs.readFileSync(file, "utf8");

    if (!inlineSvgAllowedFiles.has(rel) && /<svg\b/i.test(content)) {
      problems.push(`${rel}: contiene SVG inline fuera de los componentes de iconografía permitidos`);
    }

    if (/study-room|assets\/study-room|\/estudio\//i.test(content)) {
      problems.push(`${rel}: conserva una referencia a la antigua habitación de estudio`);
    }

    if (!rel.startsWith("src/pages/mapa-3d/")) {
      const lower = content.toLowerCase();
      const found = retiredColors.filter((color) => lower.includes(color));
      if (found.length > 0) {
        problems.push(`${rel}: contiene colores legacy retirados (${found.join(", ")})`);
      }
    }
  }
}

const iconPath = path.join(root, "src", "components", "Icon.astro");
if (!fs.existsSync(iconPath)) {
  problems.push("falta src/components/Icon.astro");
}

const brandLogoPath = path.join(root, "src", "components", "BibliLogo.astro");
if (!fs.existsSync(brandLogoPath)) {
  problems.push("falta src/components/BibliLogo.astro");
} else {
  const brandLogo = fs.readFileSync(brandLogoPath, "utf8");
  for (const token of ["currentColor", "bibli-brand-letter", "bibli-brand-spark", 'aria-hidden="true"', 'focusable="false"', 'shape-rendering="geometricPrecision"']) {
    if (!brandLogo.includes(token)) problems.push(`BibliLogo.astro: falta requisito de marca adaptable (${token})`);
  }
  const brandPathCount = (brandLogo.match(/<path\b/g) ?? []).length;
  if (brandPathCount !== 2) {
    problems.push(`BibliLogo.astro: el monograma debe renderizarse en 2 paths compuestos para evitar costuras (actual: ${brandPathCount})`);
  }
  if (/fill=["']#[0-9a-f]{3,8}["']/i.test(brandLogo)) {
    problems.push("BibliLogo.astro: el logo no debe conservar rellenos hexadecimales fijos");
  }
  for (const token of ["L 58.283203 49.796875 L 71.851562 49.796875", "L 71.851562 60.025391 L 58.283203 60.025391"]) {
    if (!brandLogo.includes(token)) problems.push(`BibliLogo.astro: la B debe conservar sus negativos centrales intencionales sin volver a piezas solapadas (${token})`);
  }
}

const faviconPath = path.join(root, "public", "favicon.svg");
if (!fs.existsSync(faviconPath)) {
  problems.push("falta public/favicon.svg");
} else {
  const favicon = fs.readFileSync(faviconPath, "utf8");
  for (const token of ['viewBox="0 0 128 128"', 'rx="45"', '#7b5439']) {
    if (!favicon.includes(token)) problems.push(`favicon.svg: falta fallback de marca requerido (${token})`);
  }
  const faviconPathCount = (favicon.match(/<path\b/g) ?? []).length;
  if (faviconPathCount !== 2) problems.push(`favicon.svg: debe usar 2 paths compuestos sin costuras (actual: ${faviconPathCount})`);
  for (const token of ["translate(9.695422 14.049505) scale(.782178)", "49.796875", "60.025391"]) {
    if (!favicon.includes(token)) problems.push(`favicon.svg: debe conservar la geometría limpia y los negativos centrales del monograma (${token})`);
  }
}


const manifestPath = path.join(root, "src", "pages", "manifest.webmanifest.ts");
if (!fs.existsSync(manifestPath)) {
  problems.push("falta src/pages/manifest.webmanifest.ts");
} else {
  const manifest = fs.readFileSync(manifestPath, "utf8");
  if (!manifest.includes('theme_color: "#7b5439"')) {
    problems.push("manifest.webmanifest.ts: el color de instalación debe coincidir con Tierra #7b5439");
  }
  if (!manifest.includes('display_override: ["standalone", "minimal-ui"]')) {
    problems.push("manifest.webmanifest.ts: Bibli debe evitar window-controls-overlay hasta tener una titlebar específica");
  }
  if (manifest.includes("window-controls-overlay")) {
    problems.push("manifest.webmanifest.ts: no debe activar window-controls-overlay sin soporte visual dedicado");
  }
}

const searchIndexPath = path.join(root, "src", "lib", "search-index.ts");
if (!fs.existsSync(searchIndexPath)) {
  problems.push("falta src/lib/search-index.ts");
} else {
  const searchIndex = fs.readFileSync(searchIndexPath, "utf8");
  const requiredTypes = [
    "Libro",
    "Pasaje",
    "Personaje",
    "Tema",
    "Evento",
    "Lugar",
    "Glosario",
    "Recurso",
    "Lección",
    "Ruta",
  ];

  for (const type of requiredTypes) {
    if (!searchIndex.includes(type)) {
      problems.push(`search-index.ts: falta el tipo de búsqueda ${type}`);
    }
  }
}

const catalogFilterPath = path.join(root, "src", "components", "CatalogFilter.astro");
if (!fs.existsSync(catalogFilterPath)) {
  problems.push("falta src/components/CatalogFilter.astro");
} else {
  const catalogFilter = fs.readFileSync(catalogFilterPath, "utf8");
  if (!catalogFilter.includes("/buscar/") || !catalogFilter.includes("/en/search/")) {
    problems.push("CatalogFilter.astro: debe conservar salida hacia la búsqueda global ES/EN");
  }
  for (const token of ["data-catalog-lang", "new WeakMap", "requestAnimationFrame", "var(--header-height", ".catalog-filter-search input { font-size:16px; }"]) {
    if (!catalogFilter.includes(token)) problems.push(`CatalogFilter.astro: falta optimización responsive (${token})`);
  }
  for (const token of ["var(--ui-panel-radius", "var(--ui-control-radius", "backdrop-filter:none", "justify-content:space-between"]) {
    if (!catalogFilter.includes(token)) problems.push(`CatalogFilter.astro: falta uniformización global (${token})`);
  }
}


// Global search is canonical. These catalog indices must not reintroduce redundant local search blocks.
for (const [relativePath, forbiddenTokens] of [
  ["src/pages/libros/index.astro", ["CatalogFilter"]],
  ["src/pages/personajes/index.astro", ["CatalogFilter"]],
  ["src/pages/temas/index.astro", ["CatalogFilter"]],
  ["src/pages/eventos/index.astro", ["CatalogFilter"]],
  ["src/pages/lugares/index.astro", ["CatalogFilter"]],
  ["src/pages/pasajes/index.astro", ["CatalogFilter"]],
  ["src/pages/recursos/index.astro", ["CatalogFilter"]],
  ["src/pages/glosario/index.astro", ["CatalogFilter"]],
  ["src/pages/linea-de-tiempo/index.astro", ["CatalogFilter", "Buscar evento, período, fecha o tema"]],
  ["src/pages/explorar/index.astro", ["explore-search", "explore-search-input"]],
  ["src/pages/index.astro", ["home-search", "home-search-input"]],
  ["src/pages/en/index.astro", ["en-home-search", "en-home-search-input"]],
  ["src/pages/404.astro", ["recovery-search", "not-found-search"]],
]) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) continue;
  const source = fs.readFileSync(fullPath, "utf8");
  for (const token of forbiddenTokens) {
    if (source.includes(token)) problems.push(`${relativePath}: buscador local redundante con la búsqueda global (${token})`);
  }
}

const catalogDesignSystemPath = path.join(root, "src", "components", "CatalogDesignSystem.astro");
if (!fs.existsSync(catalogDesignSystemPath)) {
  problems.push("falta src/components/CatalogDesignSystem.astro");
} else {
  const catalogDesignSystem = fs.readFileSync(catalogDesignSystemPath, "utf8");
  for (const token of [
    "main.page[data-catalog-root]",
    "catalog-index-hero",
    "catalog-learning-summary",
    "@media (max-width: 680px)",
    "prefers-reduced-motion: reduce",
    "forced-colors: active",
    "var(--ui-section-gap",
    "var(--ui-hero-radius",
    "var(--ui-control-height",
    "var(--ui-card-radius",
  ]) {
    if (!catalogDesignSystem.includes(token)) problems.push(`CatalogDesignSystem.astro: falta guardrail del sistema de catálogos (${token})`);
  }
}

const bibleDesignSystemPath = path.join(root, "src", "components", "BibleDesignSystem.astro");
if (!fs.existsSync(bibleDesignSystemPath)) {
  problems.push("falta src/components/BibleDesignSystem.astro");
} else {
  const bibleDesignSystem = fs.readFileSync(bibleDesignSystemPath, "utf8");
  for (const token of [
    ".bible-hero-card",
    ".bible-book-hero-card",
    ".bible-chapter-hero-card",
    ".bible-chapter-jump",
    "var(--ui-control-height",
    "var(--ui-card-radius",
    "backdrop-filter: none",
  ]) {
    if (!bibleDesignSystem.includes(token)) problems.push(`BibleDesignSystem.astro: falta guardrail bíblico compartido (${token})`);
  }
}

const detailDesignSystemPath = path.join(root, "src", "components", "DetailDesignSystem.astro");
if (!fs.existsSync(detailDesignSystemPath)) {
  problems.push("falta src/components/DetailDesignSystem.astro");
} else {
  const detailDesignSystem = fs.readFileSync(detailDesignSystemPath, "utf8");
  for (const token of [
    "main.page[data-detail-root]",
    "--detail-gap",
    ".book-hero-card",
    ".passage-reader-card",
    ".visual-resource-status-card",
    "@media (max-width: 680px)",
    "prefers-reduced-motion: reduce",
    "forced-colors: active",
    "var(--ui-section-gap",
    "var(--ui-hero-radius",
    "var(--ui-card-radius",
  ]) {
    if (!detailDesignSystem.includes(token)) problems.push(`DetailDesignSystem.astro: falta guardrail del sistema de detalle (${token})`);
  }
}

const detailPagePaths = [
  ["libro", path.join(root, "src", "pages", "libros", "[slug].astro"), 'data-detail-kind="book"'],
  ["personaje", path.join(root, "src", "pages", "personajes", "[slug].astro"), 'data-detail-kind="person"'],
  ["tema", path.join(root, "src", "pages", "temas", "[slug].astro"), 'data-detail-kind="topic"'],
  ["evento", path.join(root, "src", "pages", "eventos", "[slug].astro"), 'data-detail-kind="event"'],
  ["lugar", path.join(root, "src", "pages", "lugares", "[slug].astro"), 'data-detail-kind="place"'],
  ["pasaje", path.join(root, "src", "pages", "pasajes", "[slug].astro"), 'data-detail-kind="passage"'],
  ["recurso", path.join(root, "src", "pages", "recursos", "[slug].astro"), 'data-detail-kind="resource"'],
];
for (const [detailName, detailPath, kindToken] of detailPagePaths) {
  if (!fs.existsSync(detailPath)) {
    problems.push(`falta detalle ${detailName}`);
    continue;
  }
  const detailContent = fs.readFileSync(detailPath, "utf8");
  for (const token of ["data-detail-root", kindToken]) {
    if (!detailContent.includes(token)) problems.push(`${detailName}: falta integración con el sistema visual de detalle (${token})`);
  }
}

const catalogIndexPaths = [
  ["libros", path.join(root, "src", "pages", "libros", "index.astro")],
  ["personajes", path.join(root, "src", "pages", "personajes", "index.astro")],
  ["temas", path.join(root, "src", "pages", "temas", "index.astro")],
  ["eventos", path.join(root, "src", "pages", "eventos", "index.astro")],
  ["lugares", path.join(root, "src", "pages", "lugares", "index.astro")],
  ["pasajes", path.join(root, "src", "pages", "pasajes", "index.astro")],
  ["recursos", path.join(root, "src", "pages", "recursos", "index.astro")],
  ["explorar", path.join(root, "src", "pages", "explorar", "index.astro")],
];
for (const [catalogName, catalogPath] of catalogIndexPaths) {
  if (!fs.existsSync(catalogPath)) {
    problems.push(`falta catálogo ${catalogName}/index.astro`);
    continue;
  }
  const catalogContent = fs.readFileSync(catalogPath, "utf8");
  if (!catalogContent.includes("data-catalog-root")) {
    problems.push(`${catalogName}/index.astro: falta integración con el sistema visual de catálogos`);
  }
}

const routeIndexPath = path.join(root, "src", "pages", "rutas", "index.astro");
if (!fs.existsSync(routeIndexPath)) {
  problems.push("falta src/pages/rutas/index.astro");
} else {
  const routeIndex = fs.readFileSync(routeIndexPath, "utf8");
  for (const token of ["route-index-page", "route-card", "progress-track", "data-catalog-root", "catalog-index-hero", "catalog-learning-summary", 'role="progressbar"', "refreshRouteProgress", 'window.addEventListener("storage"', 'window.addEventListener("pageshow"', "MutationObserver", 'observer.observe(shell, { childList: true, subtree: true })', 'card.dataset.persistedReady = "true"', 'count >= ids.length ? "Revisar"']) {
    if (!routeIndex.includes(token)) problems.push(`rutas/index.astro: falta UI moderna (${token})`);
  }
}

const routeDetailPath = path.join(root, "src", "pages", "rutas", "[slug].astro");
if (!fs.existsSync(routeDetailPath)) {
  problems.push("falta src/pages/rutas/[slug].astro");
} else {
  const routeDetail = fs.readFileSync(routeDetailPath, "utf8");
  for (const token of ["route-hero-modern", "progress-card", "module-card", "moduleText", "data-route-filter-empty", "[data-route-lesson-id][hidden]", "var(--header-height", "data-detail-root", 'data-detail-kind="route"', '[data-route-continue]', 'syncRouteProgress', 'window.addEventListener("pageshow"', "MutationObserver", 'queueMicrotask(() => hydrate(shell))', 'shell.dataset.persistedReady = "true"', 'count === ids.length', 'textContent = "Revisar"', 'textContent = "Comenzar"', 'data-route-complete-toggle', 'data-complete-lesson-id', 'writeProgress(progress)', 'aria-pressed']) {
    if (!routeDetail.includes(token)) problems.push(`rutas/[slug].astro: falta guardrail de filtro (${token})`);
  }
}

const lessonIndexPath = path.join(root, "src", "pages", "lecciones", "index.astro");
if (!fs.existsSync(lessonIndexPath)) {
  problems.push("falta src/pages/lecciones/index.astro");
} else {
  const lessonIndex = fs.readFileSync(lessonIndexPath, "utf8");
  for (const token of ["moduleText", "routeText", "data-lesson-filter-empty", "[data-lesson-id][hidden]", "data-catalog-root", "catalog-index-hero", "catalog-learning-summary", "new WeakMap", "requestAnimationFrame", "data-lesson-filter-clear", "tokens.every"]) {
    if (!lessonIndex.includes(token)) problems.push(`lecciones/index.astro: falta guardrail de filtro (${token})`);
  }
}


const lessonDetailPath = path.join(root, "src", "pages", "lecciones", "[slug].astro");
if (!fs.existsSync(lessonDetailPath)) {
  problems.push("falta src/pages/lecciones/[slug].astro");
} else {
  const lessonDetail = fs.readFileSync(lessonDetailPath, "utf8");
  for (const token of ["learning-page", "learning-grid", "lesson-toc-card", "lesson-toc", "current-section-status", "var(--header-height", "data-detail-root", 'data-detail-kind="lesson"', "data-persisted-root", "data-persisted-value", 'shell.dataset.persistedReady = "true"', 'completeButton.dataset.persistedReady = "true"', 'progressValue.dataset.persistedReady = "true"', ".lesson-section.is-prayer h2", "font-style: normal", 'window.addEventListener("pageshow"', 'lesson-mobile-dock', 'data-dock-action="reader"', 'data-dock-action="tts"', 'data-lesson-sheet-open', 'lesson-heading-icon', 'lesson-heading-icon svg', 'svgPaths: Record<string, string>', 'bibli:reader-preferences-open', 'bibli:tts-open', 'bibli:global-search-toggle', 'cleanHeadingLabel', 'Context navigator v3', 'position:fixed !important', 'data-has-aids={hasStudyAids ? "true" : "empty"}', 'location:', 'explanation:', 'connection:', 'reflection:', 'prayer:', 'text-align:left', ':global(html[data-lesson-toc="visible"])', ':global(html[data-study-aids="visible"])', 'focusAidsTrigger', 'focusTocTrigger', 'data-tts-lesson-title', 'data-tts-lesson-reference', 'lesson-dock-step', 'bottom:calc(100% + 8px)', 'document.dispatchEvent(new CustomEvent("bibli:tts-close"))']) {
    if (!lessonDetail.includes(token)) problems.push(`lecciones/[slug].astro: falta UI moderna de lección (${token})`);
  }
  if (!(lessonDetail.includes('function setAids(visible: boolean, _persist = false, closeTransient = true)')
    && lessonDetail.includes('function setToc(visible: boolean, _persist = false, closeTransient = true)')
    && lessonDetail.includes('setAids(aidsMedia.matches ? false : true, false, false)')
    && lessonDetail.includes('setToc(tocMedia.matches ? false : true, false, false)'))) {
    problems.push("lecciones/[slug].astro: cambiar Estudio/Lectura no debe cerrar el reproductor TTS al restaurar Contenido/Ayudas");
  }
  if (lessonDetail.includes('class="lesson-pagination"')) problems.push("lecciones/[slug].astro: la navegación anterior/siguiente inferior debe vivir solo en el dock/toolbar");
  if (lessonDetail.includes('data-route-progress-value data-persisted-value')) problems.push("lecciones/[slug].astro: el progreso 0% no debe ocultarse durante la hidratación");
  for (const forbidden of ["bibli-study-aids-v1", "bibli-lesson-toc-v1", 'style="visibility:hidden"']) {
    if (lessonDetail.includes(forbidden)) problems.push(`lecciones/[slug].astro: no debe persistir/ocultar UI estructural al iniciar (${forbidden})`);
  }
}

const readerPreferencesPath = path.join(root, "src", "components", "ReaderPreferences.astro");
if (!fs.existsSync(readerPreferencesPath)) {
  problems.push("falta src/components/ReaderPreferences.astro");
} else {
  const readerPreferences = fs.readFileSync(readerPreferencesPath, "utf8");
  for (const key of ["bibli-reader-size-v1", "bibli-reader-font-v1", "bibli-reader-align-v1", "bibli-reader-spacing-v1"]) {
    if (!readerPreferences.includes(key)) problems.push(`ReaderPreferences.astro: falta ${key}`);
  }
  for (const token of ["data-reader-spacing-choice", "Interlineado", "Line spacing", "data-reader-preferences-backdrop", "data-reader-preferences-close", "document.body.append(backdrop, panel)", "reader-preferences-panel-head", "position:fixed", 'aria-modal="false"', 'html[data-reader-preferences-open="true"]', 'max-width:920px', 'grid-template-columns:repeat(2', 'bibli:reader-preferences-open', 'bibli:reader-preferences-opening', 'lessonDockActive', 'data-lesson-dock="true"', 'Lesson dock integration', 'bottom:calc(84px + env(safe-area-inset-bottom))', 'bibli:tts-opening', 'var(--ui-control-radius', 'var(--ui-panel-radius', 'var(--ui-control-height', 'var(--ui-shadow-panel']) {
    if (!readerPreferences.includes(token)) problems.push(`ReaderPreferences.astro: falta control de interlineado (${token})`);
  }
}

const bibleChapterPaths = [
  ["Biblia ES", path.join(root, "src", "pages", "es", "biblia", "[versionId]", "[bookCode]", "[chapter].astro")],
  ["Bible EN", path.join(root, "src", "pages", "en", "bible", "[versionId]", "[bookCode]", "[chapter].astro")],
];
for (const [readerName, chapterPath] of bibleChapterPaths) {
  if (!fs.existsSync(chapterPath)) {
    problems.push(`falta lector ${readerName}`);
    continue;
  }
  const chapterContent = fs.readFileSync(chapterPath, "utf8");
  for (const token of ["ReaderPreferences", "data-reader-content", 'data-reader-surface="bible"', ".verse-text"]) {
    if (!chapterContent.includes(token)) problems.push(`${readerName}: falta integración de preferencias de lectura (${token})`);
  }
}

const studyAidsPath = path.join(root, "src", "components", "learning", "StudyAids.astro");
if (fs.existsSync(studyAidsPath)) {
  const studyAids = fs.readFileSync(studyAidsPath, "utf8");
  for (const token of ["Sin ayudas relacionadas", "study-aids-empty"]) {
    if (!studyAids.includes(token)) problems.push(`StudyAids.astro: falta estado vacío estable (${token})`);
  }
}

const iconCatalogPath = path.join(root, "src", "components", "Icon.astro");
if (fs.existsSync(iconCatalogPath)) {
  const iconCatalog = fs.readFileSync(iconCatalogPath, "utf8");
  for (const token of ['"book-text"', '"cross"', '"target"', '"list-checks"', '"map-pin"', '"waypoints"', '"lightbulb"', '"hands-praying"', '"home"']) {
    if (!iconCatalog.includes(token)) problems.push(`Icon.astro: falta iconografía semántica de estudio (${token})`);
  }
}

const globalTtsPath = path.join(root, "src", "components", "GlobalTTS.astro");
if (!fs.existsSync(globalTtsPath)) {
  problems.push("falta src/components/GlobalTTS.astro");
} else {
  const globalTts = fs.readFileSync(globalTtsPath, "utf8");
  for (const token of ["speechSynthesis", "SpeechSynthesisUtterance", "bibli-tts-voice-", "bibli-tts-rate-v1", "--header-height", "visualViewport", "syncFloatingUiOffset", "--tts-player-offset", "profile:auto", "Bibli · Automática", "Bibli · Automatic", "prepareSpeechText", "bibleReferencePattern", "Extended_Pictographic", "getBestVoice", "getCuratedProfileVoices", ".tts-launcher[hidden]", 'root.classList.add("is-open")', 'root.hidden = false', 'player.hidden = false', 'hasReadableContent || lessonDockActive()', 'rateMultiplier', 'legacyName', 'bibli:tts-open', 'bibli:tts-opening', 'data-lesson-dock="true"', 'data-tts-lesson-title', 'data-tts-lesson-reference', 'lessonIntro', 'bibli:reader-preferences-opening']) {
    if (!globalTts.includes(token)) problems.push(`GlobalTTS.astro: falta soporte requerido (${token})`);
  }
  const hasTtsPlayerOpenState =
    globalTts.includes("data-tts-player-open") ||
    /dataset\.ttsPlayerOpen\s*=/.test(globalTts);
  if (!hasTtsPlayerOpenState) {
    problems.push("GlobalTTS.astro: falta soporte requerido (estado data-tts-player-open)");
  }
  if (/\blet\s+mediaSession\s*:|\blet\s+audioSession\s*:|\bnavigator\s+as\s+Navigator/.test(globalTts)) {
    problems.push("GlobalTTS.astro: el script define:vars debe ser JavaScript válido en navegador, sin sintaxis TypeScript");
  }
  if (!globalTts.includes('document.addEventListener("bibli:tts-toggle"')) {
    problems.push("GlobalTTS.astro: falta el listener del botón Escuchar");
  }
  if (!(globalTts.includes('const playerWasOpen = !player.hidden')
    && globalTts.includes('stopSpeech({ reset: true })')
    && globalTts.includes('detail: { open: !player.hidden, active: false }'))) {
    problems.push("GlobalTTS.astro: al cambiar Estudio/Lectura debe detener el audio sin cerrar la superficie del reproductor");
  }
  for (const token of ['root.classList.toggle("is-mini", miniVisible)', '.global-tts.is-mini { z-index:110; }']) {
    if (!globalTts.includes(token)) problems.push(`GlobalTTS.astro: el minireproductor debe ceder prioridad visual a menús temporales (${token})`);
  }
  for (const token of ['bottom:calc(78px + env(safe-area-inset-bottom))', 'bottom:calc(82px + env(safe-area-inset-bottom))']) {
    if (!globalTts.includes(token)) problems.push(`GlobalTTS.astro: reproductor y minireproductor deben conservar la misma separación del dock que los demás menús (${token})`);
  }
}

const notFoundPath = path.join(root, "src", "pages", "404.astro");
if (!fs.existsSync(notFoundPath)) {
  problems.push("falta src/pages/404.astro");
} else {
  const notFound = fs.readFileSync(notFoundPath, "utf8");
  for (const token of ["BaseLayout", "sitePath", "/buscar/", "/explorar/", "/es/biblia/", "/rutas/", "/en/", 'robots="noindex, follow"']) {
    if (!notFound.includes(token)) problems.push(`404.astro: falta recuperación requerida (${token})`);
  }
}

const pwaRequiredFiles = [
  "src/pages/manifest.webmanifest.ts",
  "src/pages/sw.js.ts",
  "src/pages/offline.astro",
  "public/icons/icon-192.png",
  "public/icons/icon-512.png",
  "public/icons/icon-maskable-512.png",
  "public/icons/apple-touch-icon.png",
];

for (const requiredFile of pwaRequiredFiles) {
  if (!fs.existsSync(path.join(root, requiredFile))) {
    problems.push(`falta el archivo PWA requerido: ${requiredFile}`);
  }
}

const offlineFallbackPath = path.join(root, "src", "pages", "offline.astro");
if (fs.existsSync(offlineFallbackPath)) {
  const offlineFallback = fs.readFileSync(offlineFallbackPath, "utf8");
  for (const token of ["viewport-fit=cover", "data-offline-copy", "/descargar/", "/en/download/", "bibli-accent", "bibli-theme"]) {
    if (!offlineFallback.includes(token)) problems.push(`offline.astro: falta soporte requerido (${token})`);
  }
  if (offlineFallback.includes("fase posterior")) {
    problems.push("offline.astro: conserva texto obsoleto sobre paquetes offline futuros");
  }
  for (const token of ['data-accent="earth"', ': "earth";', '--accent:#7b5439;', 'min-height:44px']) {
    if (!offlineFallback.includes(token)) problems.push(`offline.astro: falta coherencia con el énfasis Tierra y controles globales (${token})`);
  }
}

const offlinePackageRequiredFiles = [
  "src/pages/offline-packages.json.ts",
  "src/components/OfflinePackages.astro",
  "src/pages/descargar/index.astro",
  "src/pages/en/download/index.astro",
];
for (const requiredFile of offlinePackageRequiredFiles) {
  if (!fs.existsSync(path.join(root, requiredFile))) {
    problems.push(`falta el archivo de paquetes offline: ${requiredFile}`);
  }
}

const serviceWorkerPath = path.join(root, "src", "pages", "sw.js.ts");
if (fs.existsSync(serviceWorkerPath)) {
  const serviceWorker = fs.readFileSync(serviceWorkerPath, "utf8");
  for (const token of ["PACKAGE_CACHE_PREFIX", "CACHE_VERSION", 'BASE + "/en/"', "Promise.allSettled", "warmShell", "status: 503", "Search index unavailable offline"]) {
    if (!serviceWorker.includes(token)) {
      problems.push(`sw.js.ts: falta requisito PWA (${token})`);
    }
  }
}


const mapPagePath = path.join(root, "src", "pages", "mapa", "index.astro");
if (!fs.existsSync(mapPagePath)) {
  problems.push("falta src/pages/mapa/index.astro");
} else {
  const mapPage = fs.readFileSync(mapPagePath, "utf8");
  for (const token of ["<style is:global>", ".map-shell {", 'html[data-theme="dark"] .map-layer-switcher', "@media (max-width: 760px)", "66dvh", ".leaflet-control-zoom a {", "prefers-reduced-motion", "animate: !reducedMotionMedia.matches"]) {
    if (!mapPage.includes(token)) problems.push(`mapa/index.astro: falta CSS cartográfica local (${token})`);
  }
}


const map3dPagePath = path.join(root, "src", "pages", "mapa-3d", "index.astro");
if (!fs.existsSync(map3dPagePath)) {
  problems.push("falta src/pages/mapa-3d/index.astro");
} else {
  const map3dPage = fs.readFileSync(map3dPagePath, "utf8");
  for (const token of ["68dvh", "safe-area-inset-top", ".maplibregl-ctrl-group button", "width: 44px", "height: 44px", "prefers-reduced-motion", "map.jumpTo"]) {
    if (!map3dPage.includes(token)) problems.push(`mapa-3d/index.astro: falta ergonomía móvil requerida (${token})`);
  }
}

const placesIndexPath = path.join(root, "src", "pages", "lugares", "index.astro");
const placeDetailPath = path.join(root, "src", "pages", "lugares", "[slug].astro");
for (const [rel, filePath, tokens] of [
  ["lugares/index.astro", placesIndexPath, ["<style is:global>", ".places-index-hero {", 'html[data-theme="dark"] .places-index-hero-card']],
  ["lugares/[slug].astro", placeDetailPath, ["<style is:global>", ".place-hero {", 'html[data-theme="dark"] .place-hero-card']],
]) {
  if (!fs.existsSync(filePath)) {
    problems.push(`falta src/pages/${rel}`);
    continue;
  }
  const content = fs.readFileSync(filePath, "utf8");
  for (const token of tokens) {
    if (!content.includes(token)) problems.push(`${rel}: falta CSS local de Lugares (${token})`);
  }
}

const advancedSearchPath = path.join(root, "src", "pages", "buscar", "index.astro");
if (!fs.existsSync(advancedSearchPath)) {
  problems.push("falta src/pages/buscar/index.astro");
} else {
  const advancedSearch = fs.readFileSync(advancedSearchPath, "utf8");
  for (const token of ["<style is:global>", ".search-input {", ".search-result {", ".search-result-type {"]) {
    if (!advancedSearch.includes(token)) problems.push(`buscar/index.astro: falta CSS global para resultados dinámicos (${token})`);
  }
}

const explorePath = path.join(root, "src", "pages", "explorar", "index.astro");
if (!fs.existsSync(explorePath)) {
  problems.push("falta src/pages/explorar/index.astro");
} else {
  const explore = fs.readFileSync(explorePath, "utf8");
  for (const token of ["explore-page", "explore-feature-card", "explore-card", "var(--shadow-card)"]) {
    if (!explore.includes(token)) problems.push(`explorar/index.astro: falta UI local moderna (${token})`);
  }
}

const timelinePath = path.join(root, "src", "pages", "linea-de-tiempo", "index.astro");
if (!fs.existsSync(timelinePath)) {
  problems.push("falta src/pages/linea-de-tiempo/index.astro");
} else {
  const timeline = fs.readFileSync(timelinePath, "utf8");
  for (const token of [".timeline-marker", ".timeline-period", ".timeline-list::before", "var(--shadow-card)"]) {
    if (!timeline.includes(token)) problems.push(`linea-de-tiempo/index.astro: falta diseño local moderno (${token})`);
  }
}

const surfaceTokenPages = [
  "src/pages/buscar/index.astro",
  "src/pages/libros/index.astro",
  "src/pages/personajes/index.astro",
  "src/pages/temas/index.astro",
  "src/pages/eventos/index.astro",
  "src/pages/explorar/index.astro",
  "src/pages/linea-de-tiempo/index.astro",
  "src/pages/lugares/index.astro",
  "src/pages/lugares/[slug].astro",
  "src/pages/pasajes/index.astro",
  "src/pages/recursos/index.astro",
  "src/pages/es/biblia/index.astro",
  "src/pages/en/bible/index.astro",
];
const retiredShadowLiterals = [
  "0 14px 34px rgba(15, 23, 42, 0.05)",
  "0 14px 30px rgba(15, 23, 42, 0.08)",
  "0 18px 42px rgba(15, 23, 42, 0.1)",
  "0 20px 60px rgba(0, 0, 0, 0.28)",
];
for (const rel of surfaceTokenPages) {
  const filePath = path.join(root, rel);
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, "utf8");
  for (const literal of retiredShadowLiterals) {
    if (content.includes(literal)) problems.push(`${rel}: debe usar tokens globales de sombra en lugar de ${literal}`);
  }
}


const utilityDesignSystemPath = path.join(root, "src", "components", "UtilityDesignSystem.astro");
if (!fs.existsSync(utilityDesignSystemPath)) {
  problems.push("falta src/components/UtilityDesignSystem.astro");
} else {
  const utilityDesignSystem = fs.readFileSync(utilityDesignSystemPath, "utf8");
  for (const token of [
    "main[data-utility-root]",
    'data-utility-kind="search"',
    ".timeline-period-nav",
    ".map-jump-toolbar",
    'data-utility-kind="offline-library"',
    "var(--ui-section-gap",
    "var(--ui-control-height",
    "backdrop-filter: none",
    "prefers-reduced-motion: reduce",
    "forced-colors: active",
  ]) {
    if (!utilityDesignSystem.includes(token)) problems.push(`UtilityDesignSystem.astro: falta guardrail de superficies utilitarias (${token})`);
  }
}

const utilityPages = [
  ["búsqueda ES", path.join(root, "src", "pages", "buscar", "index.astro"), 'data-utility-kind="search"'],
  ["búsqueda EN", path.join(root, "src", "pages", "en", "search", "index.astro"), 'data-utility-kind="search"'],
  ["línea de tiempo", path.join(root, "src", "pages", "linea-de-tiempo", "index.astro"), 'data-utility-kind="timeline"'],
  ["mapa 2D", path.join(root, "src", "pages", "mapa", "index.astro"), 'data-utility-kind="map"'],
  ["mapa 3D", path.join(root, "src", "pages", "mapa-3d", "index.astro"), 'data-utility-kind="map-3d"'],
  ["descargas ES", path.join(root, "src", "pages", "descargar", "index.astro"), 'data-utility-kind="offline-library"'],
  ["descargas EN", path.join(root, "src", "pages", "en", "download", "index.astro"), 'data-utility-kind="offline-library"'],
  ["acerca", path.join(root, "src", "pages", "acerca", "index.astro"), 'data-utility-kind="about"'],
  ["legal", path.join(root, "src", "pages", "legal", "index.astro"), 'data-utility-kind="legal"'],
  ["404", path.join(root, "src", "pages", "404.astro"), 'data-utility-kind="not-found"'],
];
for (const [name, filePath, kindToken] of utilityPages) {
  if (!fs.existsSync(filePath)) {
    problems.push(`falta superficie utilitaria: ${name}`);
    continue;
  }
  const content = fs.readFileSync(filePath, "utf8");
  for (const token of ["data-utility-root", kindToken]) {
    if (!content.includes(token)) problems.push(`${name}: falta integración con UtilityDesignSystem (${token})`);
  }
}

for (const [name, filePath] of [
  ["búsqueda ES", path.join(root, "src", "pages", "buscar", "index.astro")],
  ["búsqueda EN", path.join(root, "src", "pages", "en", "search", "index.astro")],
]) {
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, "utf8");
  for (const token of ["data-search-clear", "clearSearch", 'aria-pressed=', 'enterkeyhint="search"']) {
    if (!content.includes(token)) problems.push(`${name}: falta paridad funcional de búsqueda (${token})`);
  }
}

const englishSearchPath = path.join(root, "src", "pages", "en", "search", "index.astro");
if (fs.existsSync(englishSearchPath)) {
  const englishSearch = fs.readFileSync(englishSearchPath, "utf8");
  for (const token of ["highlightMatches", "search-result-type", "Search in Spanish"]) {
    if (!englishSearch.includes(token)) problems.push(`en/search/index.astro: falta paridad visual/funcional con la búsqueda ES (${token})`);
  }
}

if (fs.existsSync(timelinePath)) {
  const timeline = fs.readFileSync(timelinePath, "utf8");
  for (const token of ["timeline-period-nav", "timeline-period-${index + 1}", "IntersectionObserver"]) {
    if (!timeline.includes(token)) problems.push(`linea-de-tiempo/index.astro: falta navegación rápida por períodos (${token})`);
  }
  const hasTimelineCurrentPeriodState =
    timeline.includes('aria-current="location"') ||
    /setAttribute\(\s*["']aria-current["']\s*,\s*["']location["']\s*\)/.test(timeline);
  if (!hasTimelineCurrentPeriodState) {
    problems.push('linea-de-tiempo/index.astro: falta navegación rápida por períodos (aria-current="location")');
  }
}

if (fs.existsSync(mapPagePath)) {
  const mapPage = fs.readFileSync(mapPagePath, "utf8");
  for (const token of ["data-map-place-select", "data-map-reset", "syncSelectedPlaceUi", "focusPlace", "fitAllPlaces", "window.history.replaceState", "const visiblePlaces = places"]) {
    if (!mapPage.includes(token)) problems.push(`mapa/index.astro: falta navegación profunda por lugares (${token})`);
  }
}

if (fs.existsSync(map3dPagePath)) {
  const map3dPage = fs.readFileSync(map3dPagePath, "utf8");
  for (const token of ['data-map-action="overview"', 'aria-pressed="true"', "data-map3d-status-text", "labels: Record<string, string>"]) {
    if (!map3dPage.includes(token)) problems.push(`mapa-3d/index.astro: falta estado accesible de cámara (${token})`);
  }
}

const offlinePackagesPath = path.join(root, "src", "components", "OfflinePackages.astro");
if (fs.existsSync(offlinePackagesPath)) {
  const offlinePackages = fs.readFileSync(offlinePackagesPath, "utf8");
  for (const token of ["data-offline-summary", "updateAvailable", 'role="progressbar"', 'aria-valuenow="0"', "info?.meta?.revision !== pkg.revision", "!navigator.onLine", 'var(--ui-card-radius', 'var(--ui-control-height', 'var(--ui-control-radius', 'var(--ui-shadow-card']) {
    if (!offlinePackages.includes(token)) problems.push(`OfflinePackages.astro: falta estado/versionado offline (${token})`);
  }
}

if (fs.existsSync(offlineFallbackPath)) {
  const offlineFallback = fs.readFileSync(offlineFallbackPath, "utf8");
  for (const token of ["BibliLogo", "data-theme-color", "accentColors", "data-offline-network", 'addEventListener("online"']) {
    if (!offlineFallback.includes(token)) problems.push(`offline.astro: falta coherencia visual/estado de red (${token})`);
  }
}

const baseLayoutPath = path.join(root, "src", "layouts", "BaseLayout.astro");
let baseLayout = "";
if (!fs.existsSync(baseLayoutPath)) {
  problems.push("falta src/layouts/BaseLayout.astro");
} else {
  baseLayout = fs.readFileSync(baseLayoutPath, "utf8");
  if (!baseLayout.includes("viewport-fit=cover")) {
    problems.push("BaseLayout.astro: el viewport debe conservar viewport-fit=cover para safe areas");
  }
  for (const token of ["--shadow-card:", "--shadow-card-hover:", "--shadow-panel:"]) {
    if (!baseLayout.includes(token)) problems.push(`BaseLayout.astro: falta token global de superficie (${token})`);
  }
  for (const token of ["--ui-control-height", "--ui-control-radius", "--ui-card-radius", "--ui-panel-radius", "--ui-hero-radius", "--ui-section-gap", "--ui-shadow-panel"]) {
    if (!baseLayout.includes(token)) problems.push(`BaseLayout.astro: falta token de uniformización UI (${token})`);
  }
  if (baseLayout.includes("\n  .map-shell {") || baseLayout.includes("\n  .map-layer-switcher {")) {
    problems.push("BaseLayout.astro: la CSS específica del mapa 2D debe permanecer aislada en mapa/index.astro");
  }
  if (baseLayout.includes("\n  .place-hero {") || baseLayout.includes("\n  .places-index-hero {")) {
    problems.push("BaseLayout.astro: la CSS específica de Lugares debe permanecer aislada en sus páginas");
  }
  if (baseLayout.includes("\n  .timeline {") || baseLayout.includes("\n  .timeline-item {") || baseLayout.includes("\n  .timeline-card::before {")) {
    problems.push("BaseLayout.astro: no debe reintroducir el layout legacy de Línea de tiempo");
  }
  if (baseLayout.includes("\n  .route-hero {") || baseLayout.includes("\n  .route-progress {") || baseLayout.includes("\n  .route-overview {") || baseLayout.includes("\n  .route-stat {") || baseLayout.includes("\n  .route-intro {")) {
    problems.push("BaseLayout.astro: no debe reintroducir el layout legacy de Rutas");
  }
  if (baseLayout.includes("\n  .explore-group {") || baseLayout.includes("\n  .explore-card {") || baseLayout.includes("\n  .explore-grid {")) {
    problems.push("BaseLayout.astro: no debe reintroducir el layout legacy de Explorar");
  }
  if (baseLayout.includes("\n  .search-panel {") || baseLayout.includes("\n  .search-input {") || baseLayout.includes("\n  .search-result {") || baseLayout.includes("\n  .search-empty {")) {
    problems.push("BaseLayout.astro: la CSS de búsqueda avanzada debe permanecer aislada en buscar/index.astro");
  }


  const postCriticalLayout = baseLayout.slice(baseLayout.indexOf("</style>") + "</style>".length);
  const isolatedSurfaceSelectors = [
    "map-shell",
    "map-popup",
    "search-input",
    "search-result",
    "search-result-type",
    "search-empty",
    "search-help",
    "explore-card",
    "explore-count",
    "explore-heading",
    "route-stat",
    "route-progress",
    "route-progress-bar",
    "route-progress-header",
    "route-hero",
    "route-intro",
    "timeline-card",
    "timeline-date",
    "timeline-meta",
    "timeline-order",
  ];
  for (const className of isolatedSurfaceSelectors) {
    const selectorPattern = new RegExp(`\\.${className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![-_a-zA-Z0-9])`);
    if (selectorPattern.test(postCriticalLayout)) {
      problems.push(`BaseLayout.astro: ${className} debe permanecer aislado fuera del CSS global`);
    }
  }

  const legacyLessonSelectors = [
    "lesson-track",
    "storyline",
    "main-idea-section",
    "main-idea-card",
    "lesson-points-section",
    "lesson-points-list",
    "passage-study-section",
    "passage-study-grid",
    "passage-study-card",
    "connections-section",
    "connections-grid",
    "connection-card",
    "connection-list",
    "lesson-study-panel",
    "study-card",
    "lesson-toc",
    "lesson-progress-panel",
    "lesson-progress-main",
    "lesson-progress-bar",
    "lesson-progress-actions",
    "lesson-nav",
    "lesson-nav-card",
  ];
  for (const className of legacyLessonSelectors) {
    const selectorPattern = new RegExp(`\\.${className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![-_a-zA-Z0-9])`);
    if (selectorPattern.test(baseLayout)) {
      problems.push(`BaseLayout.astro: no debe reintroducir CSS legacy de Lecciones (.${className})`);
    }
  }

  if (!baseLayout.includes('name="robots"') || !baseLayout.includes("robots?: string")) {
    problems.push("BaseLayout.astro: falta soporte opcional de robots para páginas especiales");
  }
  if (!baseLayout.includes("/manifest.webmanifest")) {
    problems.push("BaseLayout.astro: falta el enlace al manifest PWA");
  }
  if (!baseLayout.includes("serviceWorker.register")) {
    problems.push("BaseLayout.astro: falta el registro del service worker");
  }
  if (!baseLayout.includes("GlobalTTS")) {
    problems.push("BaseLayout.astro: falta el reproductor TTS global");
  }
  if (!baseLayout.includes("BibleDesignSystem")) {
    problems.push("BaseLayout.astro: falta el sistema visual compartido de Biblia ES/EN");
  }
  if (!baseLayout.includes("bibli-reader-size-v1") || !baseLayout.includes("bibli-reader-spacing-v1")) {
    problems.push("BaseLayout.astro: falta inicialización temprana de preferencias de lectura");
  }
  if (!baseLayout.includes("/descargar/") || !baseLayout.includes("/en/download/")) {
    problems.push("BaseLayout.astro: falta navegación hacia paquetes offline ES/EN");
  }
  if (!baseLayout.includes('lang === "es" ? sitePath("/en/") : sitePath("/")')) {
    problems.push("BaseLayout.astro: el cambio de idioma sin equivalente debe volver a las portadas ES/EN");
  }
  for (const legacyShellSelector of [".nav {", ".header-search", ".theme-toggle-icon", ".menu-theme-row", ".menu-theme-toggle", ".floating-theme-toggle"]) {
    if (baseLayout.includes(legacyShellSelector)) {
      problems.push(`BaseLayout.astro: conserva CSS de shell retirado (${legacyShellSelector})`);
    }
  }
  for (const token of ["data-connection-status", "navigator.onLine", "addEventListener(\"offline\"", "addEventListener(\"online\""]) {
    if (!baseLayout.includes(token)) problems.push(`BaseLayout.astro: falta estado global de conexión (${token})`);
  }
}

assertContains(
  baseLayout,
  'property="og:title"',
  'BaseLayout debe conservar metadatos Open Graph compartidos',
);
assertContains(
  baseLayout,
  'name="twitter:card"',
  'BaseLayout debe conservar metadatos Twitter compartidos',
);
assertContains(
  baseLayout,
  'data-theme-color',
  'BaseLayout debe mantener theme-color sincronizable con el tema efectivo',
);
assertContains(
  baseLayout,
  'aria-keyshortcuts="/ Control+K Meta+K"',
  'La búsqueda global debe anunciar sus atajos de teclado',
);
assertContains(
  baseLayout,
  'function getSearchNavigationLinks()',
  'La búsqueda global debe conservar navegación por teclado entre resultados',
);

if (/\[data-lesson-id\]\s*\{\s*content-visibility:\s*auto/.test(baseLayout)) {
  problems.push("BaseLayout: no debe aplicar content-visibility al shell completo de una lección porque rompe position:fixed y la restauración visual");
}

if (!/\.site-header\s*\{[\s\S]{0,900}?env\(safe-area-inset-top\)[\s\S]{0,900}?env\(safe-area-inset-right\)[\s\S]{0,900}?env\(safe-area-inset-left\)/.test(baseLayout)) {
  problems.push("El header debe respetar safe areas laterales en PWA móvil");
}

for (const [token, message] of [
  ["BibliLogo", "BaseLayout debe usar el componente de marca BibliLogo"],
  ["data-brand-logo", "BaseLayout debe identificar el wordmark accesible de Bibli"],
  ["logo-wordmark", "BaseLayout debe conservar el texto ibli junto al isotipo B"],
  ["data-dynamic-favicon", "BaseLayout debe declarar el favicon dinámico"],
  ["function updateDynamicFavicon", "BaseLayout debe generar el favicon según el énfasis"],
  ["bibli:accent-change", "BaseLayout debe sincronizar favicon y énfasis en tiempo real"],
  ['window.addEventListener("storage"', "BaseLayout debe sincronizar tema y énfasis entre pestañas"],
  ["content-visibility: auto", "BaseLayout debe conservar la optimización de catálogos largos"],
  ["[data-route-lesson-id]", "BaseLayout debe limitar content-visibility a items de listados"],
  ["bibli-popover-in", "BaseLayout debe conservar animaciones discretas de shell"],
  ["prefers-reduced-motion: no-preference", "Las animaciones del shell deben respetar reduced motion"],
  ["--header-height", "BaseLayout debe exponer la altura real del header para superficies sticky"],
  ["ResizeObserver", "BaseLayout debe sincronizar la altura del header de forma responsive"],
  ["window.visualViewport?.addEventListener(\"resize\", syncViewportMetrics", "BaseLayout debe reaccionar a cambios reales del viewport móvil"],
  ["orientationchange", "BaseLayout debe recalcular métricas al cambiar orientación"],
  ["document.fonts?.ready.then(syncHeaderMetrics)", "BaseLayout debe recalcular el header después de cargar tipografías"],
  ["data-reader-spacing", "BaseLayout debe aplicar el interlineado de lectura"],
  ['[data-reader-content] .verse-text', "BaseLayout debe aplicar tamaño de lectura directamente al texto bíblico"],
  [':where(p, li, blockquote, .verse-text)', "BaseLayout debe propagar fuente y alineación al contenido lector"],
  ["CatalogDesignSystem", "BaseLayout debe cargar el sistema visual compartido de catálogos"],
  ["DetailDesignSystem", "BaseLayout debe cargar el sistema visual compartido de páginas de detalle"],
  ['data-theme-changing="true"', "BaseLayout debe bloquear transiciones durante el cambio de tema"],
  ["themeSwitchCleanupFrame", "BaseLayout debe limpiar el estado transitorio de tema tras el repintado"],
  ["font-family: Baskerville", "El wordmark ibli debe usar una serif editorial más fina y orgánica"],
  ["letter-spacing: .01em", "El wordmark ibli debe conservar una separación sutil y uniforme entre letras"],
  ["faviconBodyPath", "El favicon dinámico debe usar geometría compuesta sin costuras"],
  ["faviconSparkPath", "El favicon dinámico debe separar la estrella de la B"],
    ['button.setAttribute("aria-pressed", String(isActive))', "Los filtros de búsqueda global deben exponer su estado accesible"],
  ['event.key !== "ArrowDown"', "El menú global debe permitir apertura y foco por teclado con Flecha abajo"],
  ['role="group"', "Los filtros de búsqueda global deben exponer semántica de grupo"],
  ['enterkeyhint="search"', "La búsqueda global debe optimizar el teclado móvil"],
  ['data-global-search-clear', "La búsqueda global debe incluir un control explícito para borrar el texto"],
  ['focusSearchInput()', "La búsqueda global debe enfocar el campo al abrirse"],
  ['searchShell.removeAttribute("inert")', "La búsqueda global debe hacerse enfocable antes de mover el foco"],
  ['searchShell.setAttribute("inert", "")', "La búsqueda global cerrada debe quedar fuera de la navegación por foco"],
  ['void searchShell.offsetWidth', "La búsqueda global debe materializar su estado abierto antes de enfocar el campo"],
  ['bibli:global-search-close', "La búsqueda global debe poder cerrarse al abrir otra herramienta"],
  ['grid-template-rows:auto minmax(0,1fr) auto', "La búsqueda global debe mantener filtros/resultados/acción avanzada dentro del viewport"],
  ['flex-wrap:nowrap !important', "Los filtros de búsqueda móvil deben permanecer en una sola fila desplazable"],
  ['autocapitalize="none"', "La búsqueda global no debe alterar consultas mediante autocapitalización"],
  ['searchResults.setAttribute("aria-busy", "true")', "La búsqueda global debe anunciar cuando está cargando su índice"],
  ['role="status"', "El aviso de actualización debe exponerse como estado accesible"],
  ['aria-atomic="true"', "Los estados globales deben anunciarse de forma atómica"],
  ["warmSearchIndex", "La búsqueda global debe precargar su índice al detectar intención"],
  ["searchLoadFailed", "La búsqueda global debe distinguir fallos de red de búsquedas sin resultados"],
  ["if (!response.ok) throw new Error", "La búsqueda global debe tratar respuestas HTTP fallidas como error"],
  ["data-error-label", "La búsqueda global debe ofrecer un mensaje localizado cuando falla el índice"],
  ['addEventListener("pointerdown", warmSearchIndex', "La búsqueda global debe precargar también en interacción táctil"],
  ['addEventListener("focusin", warmSearchIndex', "La búsqueda global debe precargar también para navegación por teclado"],
  ['globalMenu?.addEventListener("keydown"', "El menú global debe permitir navegación interna por teclado"],
  ['["ArrowDown", "ArrowUp", "Home", "End"]', "El menú global debe soportar Flechas, Inicio y Fin"],
  ["--brand-color: var(--accent)", "La marca debe partir del color normal de énfasis en ambos temas"],
  ["--brand-hover: var(--accent-hover)", "El hover de marca debe seguir la dirección cromática propia de cada tema"],
  ["top: .06em", "El wordmark ibli debe quedar centrado ópticamente respecto a la B sin una transformación independiente"],
  ['html[data-theme="dark"] .logo:hover', "El hover de la marca debe aclararse explícitamente en modo oscuro"],
  ["transition: color 220ms var(--ease-out)", "El logo completo debe responder por color sin reescalar el wordmark"],
  ["transform: scale(1.05)", "La estrella debe añadir un énfasis sutil al hover sin mover el wordmark"],
  ["transform: scale(1.10)", "Al presionar, la estrella debe recibir un énfasis adicional controlado"],
  ["languageBaseHref", "El selector de idioma debe conservar su destino base antes de añadir contexto"],
  ["syncLanguageSwitchContext", "El selector de idioma debe conservar query y hash cuando corresponda"],
  ["focusHashTarget", "La navegación por hash debe transferir foco accesible al destino"],
  ['window.addEventListener("hashchange", () => {', "El selector de idioma y el foco deben resincronizarse cuando cambia el hash"],
  ["requestAnimationFrame(focusHashTarget)", "La navegación por hash debe enfocar el destino después del salto del navegador"],
  ['window.addEventListener("popstate", () => {', "El selector de idioma debe resincronizarse con Atrás/Adelante"],
  ['window.addEventListener("pagehide"', "BaseLayout debe limpiar UI transitoria antes de guardar una página en BFCache"],
  ["if (event.persisted)", "BaseLayout debe normalizar el shell cuando una página vuelve desde BFCache"],
  ["data-app-update", "BaseLayout debe ofrecer aviso de actualización de la PWA"],
  ["controllerchange", "BaseLayout debe detectar una nueva versión activa del service worker"],
  ["checkForServiceWorkerUpdate", "BaseLayout debe volver a consultar actualizaciones en sesiones largas"],
  ['document.addEventListener("visibilitychange"', "BaseLayout debe comprobar actualizaciones al volver a primer plano"],
  ["SERVICE_WORKER_UPDATE_INTERVAL", "BaseLayout debe limitar la frecuencia de comprobación de actualizaciones"],
  ["data-app-update-now", "El aviso de actualización debe permitir recargar Bibli"],
  ["flex: 0 0 auto", "El logo debe limitar su caja interactiva al ancho real de la marca"],
  ["UtilityDesignSystem", "BaseLayout debe cargar el sistema visual compartido de superficies utilitarias"],
  ['html[data-tts-player-open="true"] .app-update-status', "El aviso de actualización debe evitar superponerse al reproductor TTS en móvil"],
  ["--tts-player-offset", "BaseLayout debe reservar espacio dinámico para el reproductor TTS"],
  ["top:calc(var(--header-height,62px) + 8px)", "Los overlays móviles deben posicionarse con la altura real del header"],
  ["max-height:calc(100dvh - var(--header-height,62px) - 18px)", "Los overlays móviles deben respetar viewports bajos y orientación horizontal"],
  [".global-search-form input { font-size:16px; }", "La búsqueda global debe evitar el zoom automático de Safari iOS"],
  ["padding: 32px max(0px,env(safe-area-inset-right)) 72px max(0px,env(safe-area-inset-left))", "El contenido principal debe respetar safe areas laterales"],
  ["left: max(16px, env(safe-area-inset-left))", "El skip-link debe evitar el notch lateral"],
  ["top: calc(var(--header-height,62px) + 10px)", "El estado de conexión debe posicionarse con la altura real del header"],
  ['html.js [data-persisted-value],', "BaseLayout debe conservar visibles los valores persistidos durante el arranque"],
  ['html.js [data-persisted-root] [data-persisted-value]', "BaseLayout debe mantener pintables los grupos de estado persistido durante la hidratación temprana"],
  ['visibility: visible !important;', "BaseLayout debe evitar ocultar valores persistidos cuando la página ya los hidrata antes del primer frame"],
  ["searchRenderGeneration", "La búsqueda global debe invalidar renderizados asíncronos obsoletos"],
  ["canOpenSearchPopover", "La búsqueda global no debe reabrirse mientras el menú está visible"],
  ["padding: 5px 7px 5px 5px", "Los resultados de búsqueda deben reservar espacio para el anillo de foco"],
  [".global-menu .menu-links a .bibli-icon { color: var(--accent); }", "Los iconos del menú deben seguir el color de énfasis también en tema claro"],
  ["Accent parity across light and dark shell controls", "El shell debe uniformizar el color de énfasis entre tema claro y oscuro"],
  [".global-menu .menu-links a {", "Los textos del menú deben tener una regla de énfasis compartida"],
]) {
  assertContains(baseLayout, token, message);
}


if (!/\.global-search-submit,\s*\n\s*\.global-search-toggle,\s*\n\s*\.menu-toggle,\s*\n\s*\.language-switch\s*\{[\s\S]*?color:\s*var\(--accent\);/.test(baseLayout)) {
  problems.push("BaseLayout.astro: los controles del header deben seguir el color de énfasis en tema claro y oscuro");
}

for (const forbiddenBrandToken of ["transform: translateY(.06em)"]) {
  if (baseLayout.includes(forbiddenBrandToken)) {
    problems.push(`BaseLayout.astro: el wordmark ibli no debe volver a usar una transformación independiente (${forbiddenBrandToken})`);
  }
}

for (const legacyBrandMotion of ["bibli-brand-glint", "rotate(-1.25deg)", "animation: bibli-brand-glint"]) {
  if (baseLayout.includes(legacyBrandMotion)) {
    problems.push(`BaseLayout.astro: la marca no debe volver a mover/rotar la B (${legacyBrandMotion})`);
  }
}

for (const legacyBrandToken of ["--brand-color: var(--accent-hover)", "--brand-hover: color-mix", "transform: scale(1.24)", "transform: scale(1.12)", "transform: scale(1.015)", "scale: 1.01", "scale: 1.008", "scale: 1.006", "will-change: transform", "backface-visibility: hidden"]) {
  if (baseLayout.includes(legacyBrandToken)) {
    problems.push(`BaseLayout.astro: la interacción/color de marca no debe volver al comportamiento anterior (${legacyBrandToken})`);
  }
}

const offlineFallbackBrandPath = path.join(root, "src", "pages", "offline.astro");
if (fs.existsSync(offlineFallbackBrandPath)) {
  const offlineFallbackBrand = fs.readFileSync(offlineFallbackBrandPath, "utf8");
  for (const token of ["Baskerville", "letter-spacing:.01em", "transform:translateY(.06em)", "BibliLogo"]) {
    if (!offlineFallbackBrand.includes(token)) problems.push(`offline.astro: la marca fallback debe coincidir con el wordmark principal (${token})`);
  }
}

const homeEsPath = path.join(root, "src", "pages", "index.astro");
const homeEnPath = path.join(root, "src", "pages", "en", "index.astro");
for (const [homeName, homePath] of [["Inicio ES", homeEsPath], ["Inicio EN", homeEnPath]]) {
  if (!fs.existsSync(homePath)) {
    problems.push(`falta ${homeName}`);
    continue;
  }
  const home = fs.readFileSync(homePath, "utf8");
  for (const token of ["data-home-root", "HomeStudyVisual"]) {
    if (!home.includes(token)) problems.push(`${homeName}: falta mejora de portada (${token})`);
  }
}
if (fs.existsSync(homeEsPath)) {
  const homeEs = fs.readFileSync(homeEsPath, "utf8");
  for (const token of ["data-home-continue", "bibli-learning-progress-v1", "syncHomeContinuation", "bibli:learning-progress-change", "homePrimaryRouteState", "home-route-label", 'is:inline define:vars', 'window.addEventListener("pageshow"', 'HomeStudyVisual', "allCompleted", "data-route-href"]) {
    if (!homeEs.includes(token)) problems.push(`Inicio ES: falta continuación inteligente de ruta (${token})`);
  }
}


const homeStudyVisualPath = path.join(root, "src", "components", "HomeStudyVisual.astro");
if (!fs.existsSync(homeStudyVisualPath)) {
  problems.push("falta src/components/HomeStudyVisual.astro");
} else {
  const homeStudyVisual = fs.readFileSync(homeStudyVisualPath, "utf8");
  for (const token of ["study-book", "study-lens", "page-highlight", "tool-observe", "tool-context", "tool-connect", "@media (max-width: 900px)"]) {
    if (!homeStudyVisual.includes(token)) problems.push(`HomeStudyVisual.astro: falta ilustración editorial responsive (${token})`);
  }
}

for (const token of ["foldSearchTextWithMap", "highlightMatches", "bibli:global-search-toggle"]) {
  if (!baseLayout.includes(token)) problems.push(`BaseLayout.astro: falta soporte robusto de búsqueda (${token})`);
}


const contextDockPath = path.join(root, "src", "components", "ContextDock.astro");
if (!fs.existsSync(contextDockPath)) {
  problems.push("falta src/components/ContextDock.astro");
} else {
  const contextDock = fs.readFileSync(contextDockPath, "utf8");
  for (const token of ["data-context-dock", "position: fixed", "Navegación rápida de Bibli", "contextualItem", "aria-current", "bibli:global-search-toggle", "(hover: none)", ':not([aria-expanded="true"])']) {
    if (!contextDock.includes(token)) problems.push(`ContextDock.astro: falta navegador contextual global (${token})`);
  }
  for (const token of ['.context-dock-search:active { transform:none; }', '.context-dock-search :global(.bibli-icon) { width:19px; height:19px; flex:0 0 19px; }']) {
    if (!contextDock.includes(token)) problems.push(`ContextDock.astro: la lupa de Buscar debe permanecer estable durante el toque (${token})`);
  }
}
if (!baseLayout.includes("ContextDock") || !baseLayout.includes("!isLessonDetail")) {
  problems.push("BaseLayout.astro: debe montar el dock global fuera de los detalles de Lección");
}
for (const token of ["compactLessonLayout", 'dataset.studyAids = compactLessonLayout ? "hidden" : "visible"', 'dataset.lessonToc = compactLessonLayout ? "hidden" : "visible"']) {
  if (!baseLayout.includes(token)) problems.push(`BaseLayout.astro: falta estado inicial estable de paneles de Lección (${token})`);
}

const bibleSwitcherPath = path.join(root, "src", "components", "BibleVersionSwitcher.astro");
if (!fs.existsSync(bibleSwitcherPath)) {
  problems.push("falta src/components/BibleVersionSwitcher.astro");
} else {
  const bibleSwitcher = fs.readFileSync(bibleSwitcherPath, "utf8");
  for (const token of ["data-bible-version-switcher", "target.search = window.location.search", "target.hash = window.location.hash", ":focus-visible", "min-height: 44px"]) {
    if (!bibleSwitcher.includes(token)) problems.push(`BibleVersionSwitcher.astro: falta navegación/contexto accesible (${token})`);
  }
}

const discoveryContracts = [
  ["Biblia ES", path.join(root, "src", "pages", "es", "biblia", "index.astro"), 'data-catalog-kind="bible-root"'],
  ["Bible EN", path.join(root, "src", "pages", "en", "bible", "index.astro"), 'data-catalog-kind="bible-root"'],
  ["Versión ES", path.join(root, "src", "pages", "es", "biblia", "[versionId]", "index.astro"), 'data-catalog-kind="bible-version"'],
  ["Version EN", path.join(root, "src", "pages", "en", "bible", "[versionId]", "index.astro"), 'data-catalog-kind="bible-version"'],
  ["Libro bíblico ES", path.join(root, "src", "pages", "es", "biblia", "[versionId]", "[bookCode]", "index.astro"), 'data-detail-kind="bible-book"'],
  ["Bible book EN", path.join(root, "src", "pages", "en", "bible", "[versionId]", "[bookCode]", "index.astro"), 'data-detail-kind="bible-book"'],
  ["Glosario", path.join(root, "src", "pages", "glosario", "index.astro"), 'data-catalog-kind="glossary"'],
  ["Detalle glosario", path.join(root, "src", "pages", "glosario", "[slug].astro"), 'data-detail-kind="glossary"'],
];
for (const [surfaceName, surfacePath, contract] of discoveryContracts) {
  if (!fs.existsSync(surfacePath)) {
    problems.push(`falta ${surfaceName}`);
    continue;
  }
  const content = fs.readFileSync(surfacePath, "utf8");
  if (!content.includes(contract)) problems.push(`${surfaceName}: falta contrato visual (${contract})`);
}

const lessonDockHoverPath = path.join(root, "src", "pages", "lecciones", "[slug].astro");
if (fs.existsSync(lessonDockHoverPath)) {
  const lessonDockHover = fs.readFileSync(lessonDockHoverPath, "utf8");
  for (const token of ["(hover:none)", ':not([aria-expanded="true"]):not([aria-pressed="true"])']) {
    if (!lessonDockHover.includes(token)) problems.push(`Lección: los botones del dock táctil no deben conservar hover al cerrarse (${token})`);
  }
  for (const token of ['[data-dock-action="search"]:active { transform:none !important; }', '[data-dock-action="search"] :global(.bibli-icon) { width:19px; height:19px; flex:0 0 19px; }']) {
    if (!lessonDockHover.includes(token)) problems.push(`Lección: la lupa de Buscar debe permanecer estable durante el toque (${token})`);
  }
}

if (problems.length > 0) {
  console.error("Validación UI: FAIL");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log("Validación UI: PASS");
console.log("Marca canónica, hero editorial, estados personalizados sin flash, favicon/PWA coherentes, shell accesible, Biblia/Glosario, catálogos, detalles y utilidades uniformes, lectura, mapas, búsquedas, offline, TTS y responsive: OK");
