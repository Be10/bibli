import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import Database from 'better-sqlite3';

const root = process.cwd();
const dist = path.join(root, 'dist');
const dbPath = path.join(root, 'data', 'bibli.sqlite');
const base = '/bibli';
const errors = [];
const projectKey = createHash('sha1').update(root).digest('hex').slice(0, 12);
const buildSnapshotDir = path.join(os.tmpdir(), `bibli-build-audit-${projectKey}`);
const buildSnapshotPath = path.join(buildSnapshotDir, 'snapshot.json');
const SNAPSHOT_MAX_AGE_MS = 30 * 60 * 1000;

function sha256File(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function loadBuildSnapshot() {
  if (!fs.existsSync(buildSnapshotPath)) return null;
  try {
    const snapshot = JSON.parse(fs.readFileSync(buildSnapshotPath, 'utf8'));
    if (snapshot?.schemaVersion !== 1 || snapshot.root !== root || snapshot.base !== base) return null;
    if (!Number.isFinite(snapshot.createdAtMs) || Date.now() - snapshot.createdAtMs > SNAPSHOT_MAX_AGE_MS) return null;
    if (!Array.isArray(snapshot.routes) || !Array.isArray(snapshot.files) || !snapshot.idsByRoute) return null;
    for (const [rel, meta] of Object.entries(snapshot.generatedFiles ?? {})) {
      const file = path.join(buildSnapshotDir, 'generated', ...rel.split('/'));
      if (!fs.existsSync(file) || fs.statSync(file).size !== meta.size || sha256File(file) !== meta.sha256) return null;
    }
    return snapshot;
  } catch {
    return null;
  }
}

const buildSnapshot = loadBuildSnapshot();
const useBuildSnapshot = Boolean(buildSnapshot);

function fail(message) {
  errors.push(message);
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function readJson(file, label) {
  if (!fs.existsSync(file)) {
    fail(`${label}: falta ${path.relative(root, file).replaceAll(path.sep, '/')}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`${label}: JSON inválido (${error.message})`);
    return null;
  }
}

if (!fs.existsSync(dist) && !useBuildSnapshot) {
  console.error('Validación de salidas derivadas: FAIL');
  console.error('- falta dist/ y no existe un snapshot reciente de site:audit. Ejecuta primero npm run build.');
  process.exit(1);
}
if (!fs.existsSync(dbPath)) {
  console.error('Validación de salidas derivadas: FAIL');
  console.error('- falta data/bibli.sqlite.');
  process.exit(1);
}

const files = useBuildSnapshot ? [] : (fs.existsSync(dist) ? walk(dist) : []);
const htmlFiles = files.filter((file) => file.endsWith('.html'));
const relativeToDist = (file) => path.relative(dist, file).replaceAll(path.sep, '/');
const routeForHtml = (file) => {
  const rel = relativeToDist(file);
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'/index.html'.length)}/`;
  return `/${rel.replace(/\.html$/, '')}`;
};
const liveRouteToFile = new Map(htmlFiles.map((file) => [routeForHtml(file), file]));
const routeToFile = useBuildSnapshot
  ? new Map(buildSnapshot.routes.map((route) => [route, null]))
  : liveRouteToFile;
const snapshotFileSet = new Set(buildSnapshot?.files ?? []);
const idsByRoute = new Map();

function stripBase(pathname) {
  if (pathname === base || pathname === `${base}/`) return '/';
  if (pathname.startsWith(`${base}/`)) return pathname.slice(base.length) || '/';
  return null;
}

function normalizeRoute(pathname) {
  const stripped = stripBase(pathname);
  if (stripped === null) return null;
  let route = stripped.split('?')[0].split('#')[0] || '/';
  try { route = decodeURI(route); } catch {}
  if (!route.startsWith('/')) route = `/${route}`;
  return route;
}

function routeFileForPathname(pathname) {
  const route = normalizeRoute(pathname);
  if (route === null) return null;
  if (routeToFile.has(route)) return { route, file: routeToFile.get(route) };
  if (!route.endsWith('/') && routeToFile.has(`${route}/`)) {
    return { route: `${route}/`, file: routeToFile.get(`${route}/`) };
  }
  return null;
}

function fileForPathname(pathname) {
  const routeTarget = routeFileForPathname(pathname);
  if (routeTarget) return routeTarget.file ?? `snapshot:${routeTarget.route}`;
  const route = normalizeRoute(pathname);
  if (route === null) return null;
  const rel = route.replace(/^\//, '');
  if (useBuildSnapshot) {
    if (snapshotFileSet.has(rel)) return `snapshot:${rel}`;
    if (snapshotFileSet.has(`${rel}.html`)) return `snapshot:${rel}.html`;
    return null;
  }
  const file = path.join(dist, rel);
  if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  if (fs.existsSync(`${file}.html`) && fs.statSync(`${file}.html`).isFile()) return `${file}.html`;
  return null;
}

function idsForRoute(route, file) {
  if (idsByRoute.has(route)) return idsByRoute.get(route);
  if (useBuildSnapshot) {
    const ids = new Set(buildSnapshot.idsByRoute?.[route] ?? []);
    idsByRoute.set(route, ids);
    return ids;
  }
  const html = fs.readFileSync(file, 'utf8');
  const ids = new Set([...html.matchAll(/\sid=["']([^"']+)["']/gi)].map((match) => match[1]));
  idsByRoute.set(route, ids);
  return ids;
}

function generatedArtifactPath(relativePath) {
  if (useBuildSnapshot) {
    const snapshotFile = path.join(buildSnapshotDir, 'generated', ...relativePath.split('/'));
    if (fs.existsSync(snapshotFile)) return snapshotFile;
  }
  return path.join(dist, relativePath);
}

function validatePublicTarget(rawUrl, label) {
  let parsed;
  try {
    parsed = new URL(rawUrl, 'https://example.test');
  } catch {
    fail(`${label}: URL inválida ${rawUrl}`);
    return;
  }
  if (parsed.origin !== 'https://example.test') {
    fail(`${label}: URL externa inesperada ${rawUrl}`);
    return;
  }
  if (!(parsed.pathname === base || parsed.pathname.startsWith(`${base}/`))) {
    fail(`${label}: URL fuera del base público ${rawUrl}`);
    return;
  }
  const targetFile = fileForPathname(parsed.pathname);
  if (!targetFile) {
    fail(`${label}: destino inexistente ${rawUrl}`);
    return;
  }
  if (!parsed.hash) return;

  const routeTarget = routeFileForPathname(parsed.pathname);
  if (!routeTarget) {
    fail(`${label}: el fragmento apunta a un recurso no HTML ${rawUrl}`);
    return;
  }
  let fragment = parsed.hash.slice(1);
  try { fragment = decodeURIComponent(fragment); } catch {}
  if (fragment && !idsForRoute(routeTarget.route, routeTarget.file).has(fragment)) {
    fail(`${label}: ancla inexistente ${rawUrl}`);
  }
}

function compareSets(label, expected, actual) {
  const missing = [...expected].filter((value) => !actual.has(value));
  const extra = [...actual].filter((value) => !expected.has(value));
  if (missing.length) {
    fail(`${label}: faltan ${missing.length} elemento(s) (${missing.slice(0, 4).join(', ')})`);
  }
  if (extra.length) {
    fail(`${label}: sobran ${extra.length} elemento(s) (${extra.slice(0, 4).join(', ')})`);
  }
}

function compactItemShapeIsValid(item) {
  if (!Array.isArray(item) || item.length !== 10) return false;
  for (let index = 0; index <= 5; index += 1) {
    if (typeof item[index] !== 'string' || item[index].trim() === '') return false;
  }
  for (let index = 6; index <= 9; index += 1) {
    if (!Number.isFinite(item[index])) return false;
  }
  return true;
}

function siteUrl(route) {
  return `${base}${route}`;
}

function getDefaultVersionIds() {
  const configPath = path.join(root, 'src', 'lib', 'bible-config.ts');
  if (!fs.existsSync(configPath)) {
    fail('búsqueda: falta src/lib/bible-config.ts');
    return { es: null, en: null };
  }
  const source = fs.readFileSync(configPath, 'utf8');
  const read = (language) => {
    const match = source.match(new RegExp(`${language}\\s*:\\s*\\{[\\s\\S]*?defaultBibleVersionId\\s*:\\s*["']([^"']+)["']`));
    if (!match) fail(`búsqueda: no se pudo resolver la versión bíblica por defecto para ${language}`);
    return match?.[1] ?? null;
  };
  return { es: read('es'), en: read('en') };
}

const db = new Database(dbPath, { readonly: true });
let searchEsCount = 0;
let searchEnCount = 0;
let searchTargetsChecked = 0;
let offlinePackageCount = 0;
let offlineUrlCount = 0;

try {
  const defaultVersions = getDefaultVersionIds();

  function publishedSlugs(table) {
    return db.prepare(`SELECT slug FROM ${table} WHERE status <> 'Borrador' ORDER BY id`).all();
  }

  function localizedBooks(language) {
    return db.prepare(`
      SELECT b.id, b.usfm_code, b.order_number, bt.slug
      FROM books b
      JOIN book_translations bt
        ON bt.book_id = b.id
       AND bt.language = ?
      WHERE b.status <> 'Borrador'
      ORDER BY b.order_number
    `).all(language);
  }

  function verseUrls(language, versionId) {
    if (!versionId) return new Set();
    const version = db.prepare(`
      SELECT id, language
      FROM bible_versions
      WHERE id = ? AND status <> 'Borrador'
    `).get(versionId);
    if (!version) {
      fail(`búsqueda: la versión por defecto ${versionId} no existe o está en Borrador`);
      return new Set();
    }
    if (version.language !== language) {
      fail(`búsqueda: ${versionId} declara idioma ${version.language}, se esperaba ${language}`);
    }
    const prefix = language === 'es' ? '/es/biblia' : '/en/bible';
    const rows = db.prepare(`
      SELECT b.usfm_code, v.chapter_number, v.verse_number
      FROM bible_verses v
      JOIN books b ON b.id = v.book_id
      WHERE v.version_id = ?
      ORDER BY b.order_number, v.chapter_number, v.verse_number
    `).all(versionId);
    return new Set(rows.map((row) => siteUrl(`${prefix}/${versionId}/${String(row.usfm_code).toLowerCase()}/${row.chapter_number}/#v${row.verse_number}`)));
  }

  function expectedSearchUrls(language, versionId) {
    const books = localizedBooks(language);
    const biblePrefix = language === 'es' ? '/es/biblia' : '/en/bible';
    if (language === 'en') {
      return new Map([
        ['Sección', new Set([siteUrl('/en/bible/')])],
        ['Libro', new Set(books.map((book) => siteUrl(`${biblePrefix}/${versionId}/${String(book.usfm_code).toLowerCase()}/`)))],
        ['Versículo', verseUrls(language, versionId)],
      ]);
    }

    return new Map([
      ['Sección', new Set([
        '/lecciones/', '/es/biblia/', '/libros/', '/pasajes/', '/eventos/', '/temas/', '/personajes/',
        '/lugares/', '/mapa/', '/rutas/', '/recursos/', '/glosario/', '/linea-de-tiempo/', '/explorar/',
      ].map(siteUrl))],
      ['Ruta', new Set(publishedSlugs('routes').map((row) => siteUrl(`/rutas/${row.slug}/`)))],
      ['Lección', new Set(publishedSlugs('study_lessons').map((row) => siteUrl(`/lecciones/${row.slug}/`)))],
      ['Libro', new Set(books.map((book) => siteUrl(`/libros/${book.slug}/`)))],
      ['Pasaje', new Set(publishedSlugs('passages').map((row) => siteUrl(`/pasajes/${row.slug}/`)))],
      ['Evento', new Set(publishedSlugs('events').map((row) => siteUrl(`/eventos/${row.slug}/`)))],
      ['Tema', new Set(publishedSlugs('topics').map((row) => siteUrl(`/temas/${row.slug}/`)))],
      ['Personaje', new Set(publishedSlugs('people').map((row) => siteUrl(`/personajes/${row.slug}/`)))],
      ['Lugar', new Set(publishedSlugs('places').map((row) => siteUrl(`/lugares/${row.slug}/`)))],
      ['Recurso', new Set(publishedSlugs('visual_resources').map((row) => siteUrl(`/recursos/${row.slug}/`)))],
      ['Glosario', new Set(publishedSlugs('glossary_terms').map((row) => siteUrl(`/glosario/${row.slug}/`)))],
      ['Versículo', verseUrls(language, versionId)],
    ]);
  }

  function validateSearchIndex(language, relativePath, versionId) {
    const file = generatedArtifactPath(relativePath);
    const payload = readJson(file, `búsqueda ${language.toUpperCase()}`);
    if (!payload) return 0;
    if (payload.version !== 1 || !Array.isArray(payload.items)) {
      fail(`búsqueda ${language.toUpperCase()}: se esperaba payload compacto v1`);
      return 0;
    }

    const actualByType = new Map();
    const seenUrls = new Set();
    let duplicateUrls = 0;

    payload.items.forEach((item, index) => {
      if (!compactItemShapeIsValid(item)) {
        fail(`búsqueda ${language.toUpperCase()}: item ${index} no cumple el esquema compacto de 10 campos`);
        return;
      }
      const type = item[1];
      const url = item[3];
      if (!actualByType.has(type)) actualByType.set(type, new Set());
      actualByType.get(type).add(url);
      if (seenUrls.has(url)) duplicateUrls += 1;
      else seenUrls.add(url);
      validatePublicTarget(url, `búsqueda ${language.toUpperCase()}`);
      searchTargetsChecked += 1;
    });

    if (duplicateUrls) fail(`búsqueda ${language.toUpperCase()}: ${duplicateUrls} URL(s) duplicadas`);

    const expectedByType = expectedSearchUrls(language, versionId);
    for (const [type, expected] of expectedByType) {
      compareSets(`búsqueda ${language.toUpperCase()} · ${type}`, expected, actualByType.get(type) ?? new Set());
    }
    for (const type of actualByType.keys()) {
      if (!expectedByType.has(type)) fail(`búsqueda ${language.toUpperCase()}: tipo inesperado ${type}`);
    }

    return payload.items.length;
  }

  searchEsCount = validateSearchIndex('es', 'buscar/datos.json', defaultVersions.es);
  searchEnCount = validateSearchIndex('en', 'en/search/data.json', defaultVersions.en);

  function expectedOfflinePackages() {
    const appUrls = new Set([
      '/', '/en/', '/mi-bibli/', '/en/my-bibli/', '/buscar/', '/en/search/', '/explorar/', '/rutas/', '/lecciones/', '/recursos/',
      '/glosario/', '/linea-de-tiempo/', '/es/biblia/', '/en/bible/', '/acerca/', '/legal/', '/descargar/',
      '/en/download/', '/offline/', '/buscar/datos.json', '/en/search/data.json',
    ].map(siteUrl));

    const lessonUrls = new Set([siteUrl('/lecciones/'), siteUrl('/rutas/')]);
    for (const route of publishedSlugs('routes')) lessonUrls.add(siteUrl(`/rutas/${route.slug}/`));
    const lessons = db.prepare(`
      SELECT DISTINCT sl.slug
      FROM study_lessons sl
      JOIN route_lessons rl ON rl.lesson_id = sl.id
      JOIN routes r ON r.id = rl.route_id
      WHERE sl.status <> 'Borrador'
        AND r.status <> 'Borrador'
      ORDER BY sl.slug
    `).all();
    for (const lesson of lessons) lessonUrls.add(siteUrl(`/lecciones/${lesson.slug}/`));

    const packages = new Map([
      ['app', appUrls],
      ['lessons-es', lessonUrls],
    ]);

    const versions = db.prepare(`
      SELECT id, language
      FROM bible_versions
      WHERE status <> 'Borrador'
      ORDER BY id
    `).all();
    for (const version of versions) {
      if (!['es', 'en'].includes(version.language)) {
        fail(`offline: versión ${version.id} usa idioma no soportado (${version.language})`);
        continue;
      }
      const prefix = version.language === 'es' ? '/es/biblia' : '/en/bible';
      const urls = new Set([
        siteUrl(`${prefix}/`),
        siteUrl(`${prefix}/${version.id}/`),
      ]);
      const books = localizedBooks(version.language);
      for (const book of books) {
        const code = String(book.usfm_code).toLowerCase();
        urls.add(siteUrl(`${prefix}/${version.id}/${code}/`));
        const chapters = db.prepare(`
          SELECT chapter_number
          FROM bible_chapters
          WHERE book_id = ?
          ORDER BY chapter_number
        `).all(book.id);
        for (const chapter of chapters) {
          urls.add(siteUrl(`${prefix}/${version.id}/${code}/${chapter.chapter_number}/`));
        }
      }
      packages.set(`bible-${version.id}`, urls);
    }
    return packages;
  }

  const offlinePath = generatedArtifactPath('offline-packages.json');
  const offline = readJson(offlinePath, 'offline');
  if (offline) {
    if (offline.schemaVersion !== '1.1.0' || offline.revisionStrategy !== 'content-v2') {
      fail('offline: se esperaba schemaVersion 1.1.0 con revisionStrategy content-v2');
    }
    if (!Array.isArray(offline.packages)) {
      fail('offline: packages debe ser un arreglo');
    } else {
      const expectedPackages = expectedOfflinePackages();
      const actualPackageIds = new Set();
      for (const pkg of offline.packages) {
        if (!pkg || typeof pkg.id !== 'string' || !Array.isArray(pkg.urls)) {
          fail('offline: paquete con estructura inválida');
          continue;
        }
        if (actualPackageIds.has(pkg.id)) fail(`offline: paquete duplicado ${pkg.id}`);
        actualPackageIds.add(pkg.id);
        if (pkg.urlCount !== pkg.urls.length) {
          fail(`offline ${pkg.id}: urlCount=${pkg.urlCount} pero contiene ${pkg.urls.length} URLs`);
        }
        const actualUrls = new Set(pkg.urls);
        if (actualUrls.size !== pkg.urls.length) {
          fail(`offline ${pkg.id}: contiene ${pkg.urls.length - actualUrls.size} URL(s) duplicadas`);
        }
        for (const url of actualUrls) validatePublicTarget(url, `offline ${pkg.id}`);
        offlineUrlCount += actualUrls.size;

        const expectedUrls = expectedPackages.get(pkg.id);
        if (!expectedUrls) {
          fail(`offline: paquete inesperado ${pkg.id}`);
        } else {
          compareSets(`offline ${pkg.id}`, expectedUrls, actualUrls);
        }
      }
      for (const packageId of expectedPackages.keys()) {
        if (!actualPackageIds.has(packageId)) fail(`offline: falta paquete ${packageId}`);
      }
      offlinePackageCount = offline.packages.length;
    }
  }
} finally {
  db.close();
}

if (errors.length) {
  console.error('Validación de salidas derivadas: FAIL');
  for (const error of errors.slice(0, 120)) console.error(`- ${error}`);
  if (errors.length > 120) console.error(`- ... ${errors.length - 120} errores adicionales`);
  process.exit(1);
}

console.log('Validación de salidas derivadas: PASS');
console.log(`Búsqueda: ES ${searchEsCount} · EN ${searchEnCount} · ${searchTargetsChecked} destinos/anclas verificados`);
console.log(`Offline: ${offlinePackageCount} paquetes · ${offlineUrlCount} URLs verificadas`);
if (useBuildSnapshot) console.log('Destinos del build: snapshot coherente de site:audit (protección contra mutaciones de OneDrive)');
