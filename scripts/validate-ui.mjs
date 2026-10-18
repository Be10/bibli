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

if (!fs.existsSync(srcRoot)) {
  problems.push("falta el directorio src/");
} else {
  for (const file of walk(srcRoot)) {
    const rel = relative(file);
    const content = fs.readFileSync(file, "utf8");

    if (rel !== "src/components/Icon.astro" && /<svg\b/i.test(content)) {
      problems.push(`${rel}: contiene SVG inline fuera de components/Icon.astro`);
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
}


const readerPreferencesPath = path.join(root, "src", "components", "ReaderPreferences.astro");
if (!fs.existsSync(readerPreferencesPath)) {
  problems.push("falta src/components/ReaderPreferences.astro");
} else {
  const readerPreferences = fs.readFileSync(readerPreferencesPath, "utf8");
  for (const key of ["bibli-reader-size-v1", "bibli-reader-font-v1", "bibli-reader-align-v1"]) {
    if (!readerPreferences.includes(key)) problems.push(`ReaderPreferences.astro: falta ${key}`);
  }
}

const globalTtsPath = path.join(root, "src", "components", "GlobalTTS.astro");
if (!fs.existsSync(globalTtsPath)) {
  problems.push("falta src/components/GlobalTTS.astro");
} else {
  const globalTts = fs.readFileSync(globalTtsPath, "utf8");
  for (const token of ["speechSynthesis", "SpeechSynthesisUtterance", "bibli-tts-voice-", "bibli-tts-rate-v1"]) {
    if (!globalTts.includes(token)) problems.push(`GlobalTTS.astro: falta soporte requerido (${token})`);
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
  if (!serviceWorker.includes("PACKAGE_CACHE_PREFIX")) {
    problems.push("sw.js.ts: debe preservar los paquetes offline descargados");
  }
}

const baseLayoutPath = path.join(root, "src", "layouts", "BaseLayout.astro");
if (fs.existsSync(baseLayoutPath)) {
  const baseLayout = fs.readFileSync(baseLayoutPath, "utf8");
  if (!baseLayout.includes("/manifest.webmanifest")) {
    problems.push("BaseLayout.astro: falta el enlace al manifest PWA");
  }
  if (!baseLayout.includes("serviceWorker.register")) {
    problems.push("BaseLayout.astro: falta el registro del service worker");
  }
  if (!baseLayout.includes("GlobalTTS")) {
    problems.push("BaseLayout.astro: falta el reproductor TTS global");
  }
  if (!baseLayout.includes("bibli-reader-size-v1")) {
    problems.push("BaseLayout.astro: falta inicialización temprana de preferencias de lectura");
  }
  if (!baseLayout.includes("/descargar/") || !baseLayout.includes("/en/download/")) {
    problems.push("BaseLayout.astro: falta navegación hacia paquetes offline ES/EN");
  }
}

if (problems.length > 0) {
  console.error("Validación UI: FAIL");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log("Validación UI: PASS");
console.log("Iconos centralizados, búsquedas, lectura, TTS, PWA/paquetes offline y paleta legacy: OK");
