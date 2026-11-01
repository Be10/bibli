import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import Database from 'better-sqlite3';

const root = process.cwd();
const dist = path.join(root, 'dist');
const base = '/bibli';
const errors = [];
const warnings = [];
const projectKey = createHash('sha1').update(root).digest('hex').slice(0, 12);
const buildSnapshotDir = path.join(os.tmpdir(), `bibli-build-audit-${projectKey}`);
const buildSnapshotPath = path.join(buildSnapshotDir, 'snapshot.json');
const snapshotArtifactRels = ['buscar/datos.json', 'en/search/data.json', 'offline-packages.json'];

const glossaryRoutingPath =
  path.join(
    root,
    'content',
    'glossary-route-map.json'
  );

const glossaryRouting =
  JSON.parse(
    fs.readFileSync(
      glossaryRoutingPath,
      'utf8'
    )
  );

const glossaryRoutes =
  glossaryRouting.routes ?? {};

try { fs.rmSync(buildSnapshotDir, { recursive: true, force: true }); } catch {}

const walk = (dir) => {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
};

if (!fs.existsSync(dist)) {
  console.error('Auditoría del sitio: FAIL');
  console.error('- falta dist/. Ejecuta primero npm run build.');
  process.exit(1);
}

const files = walk(dist);
const snapshotArtifactBuffers = new Map();
for (const rel of snapshotArtifactRels) {
  const file = path.join(dist, rel);
  if (fs.existsSync(file)) snapshotArtifactBuffers.set(rel, fs.readFileSync(file));
}
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const relative = (f) => path.relative(dist, f).replaceAll(path.sep, '/');
const routeForHtml = (f) => {
  const rel = relative(f);
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'/index.html'.length)}/`;
  return `/${rel.replace(/\.html$/, '')}`;
};
const routeToFile = new Map(htmlFiles.map((f) => [routeForHtml(f), f]));
const idsByRouteForSnapshot = new Map();

function stripBase(pathname) {
  if (pathname === base) return '/';
  if (pathname.startsWith(`${base}/`)) return pathname.slice(base.length) || '/';
  return pathname;
}

function normalizeRoute(pathname) {
  let p = stripBase(pathname || '/');
  p = p.split('?')[0].split('#')[0] || '/';
  try { p = decodeURI(p); } catch {}
  if (!p.startsWith('/')) p = `/${p}`;
  return p;
}

function targetExists(pathname) {
  const p = normalizeRoute(pathname);
  if (p === '/') return routeToFile.has('/');
  if (routeToFile.has(p)) return true;
  if (!p.endsWith('/') && routeToFile.has(`${p}/`)) return true;
  const filePath = path.join(dist, p.replace(/^\//, ''));
  if (fs.existsSync(filePath)) return true;
  if (fs.existsSync(`${filePath}.html`)) return true;
  return false;
}

function publicPathForRoute(route) {
  const normalized = normalizeRoute(route);
  return normalized === '/' ? `${base}/` : `${base}${normalized}`;
}

function routeFromAbsoluteHref(href) {
  try {
    return normalizeRoute(new URL(href).pathname);
  } catch {
    return null;
  }
}

const seoLanguageByRoute = new Map();
let bilingualSeoPagesChecked = 0;
let equivalentLanguageSwitchesChecked = 0;
let fallbackLanguageSwitchesChecked = 0;

let editorialRoutesChecked = 0;
let bibleRoutesChecked = 0;
const dbPath = path.join(root, 'data', 'bibli.sqlite');
if (!fs.existsSync(dbPath)) {
  errors.push('contenido: falta data/bibli.sqlite para contrastar SQLite con dist/');
} else {
  const db = new Database(dbPath, { readonly: true });
  try {
    const routeCollections = [
      { table: 'routes', prefix: '/rutas', label: 'ruta' },
      { table: 'books', prefix: '/libros', label: 'libro' },
      { table: 'study_lessons', prefix: '/lecciones', label: 'lección' },
      { table: 'passages', prefix: '/pasajes', label: 'pasaje' },
      { table: 'topics', prefix: '/temas', label: 'tema' },
      { table: 'events', prefix: '/eventos', label: 'evento' },
      { table: 'people', prefix: '/personajes', label: 'personaje' },
      { table: 'places', prefix: '/lugares', label: 'lugar' },
      { table: 'visual_resources', prefix: '/recursos', label: 'recurso' },
    ];

    for (const collection of routeCollections) {
      const entries = db.prepare(`SELECT id, slug FROM ${collection.table} WHERE status <> 'Borrador' ORDER BY id`).all();
      for (const entry of entries) {
        const expectedRoute = `${collection.prefix}/${entry.slug}/`;
        editorialRoutesChecked += 1;
        if (!routeToFile.has(expectedRoute)) {
          errors.push(`contenido: ${collection.label} ${entry.id} no generó ${expectedRoute}`);
        }
      }
    }

    const glossaryEntries =
      db.prepare(`
        SELECT id, slug
        FROM glossary_terms
        WHERE status <> 'Borrador'
        ORDER BY id
      `).all();

    const glossaryCategories =
      new Set();

    for (const entry of glossaryEntries) {
      const category =
        glossaryRoutes[entry.slug];

      if (!category) {
        errors.push(
          `contenido: término ${entry.id} no tiene categoría canónica`
        );
        continue;
      }

      glossaryCategories.add(category);

      const canonicalRoute =
        `/glosario/${category}/${entry.slug}/`;

      const aliasRoute =
        `/glosario/${entry.slug}/`;

      editorialRoutesChecked += 2;

      if (!routeToFile.has(canonicalRoute)) {
        errors.push(
          `contenido: término ${entry.id} no generó ${canonicalRoute}`
        );
      }

      if (!routeToFile.has(aliasRoute)) {
        errors.push(
          `contenido: término ${entry.id} no generó alias ${aliasRoute}`
        );
      }
    }

    for (const category of glossaryCategories) {
      const categoryRoute =
        `/glosario/${category}/`;

      editorialRoutesChecked += 1;

      if (!routeToFile.has(categoryRoute)) {
        errors.push(
          `contenido: falta índice de glosario ${categoryRoute}`
        );
      }
    }

    const versions = db.prepare(`
      SELECT id, language
      FROM bible_versions
      WHERE status <> 'Borrador'
      ORDER BY id
    `).all();
    const books = db.prepare(`
      SELECT id, usfm_code
      FROM books
      WHERE status <> 'Borrador'
      ORDER BY order_number
    `).all();
    const chapters = db.prepare(`
      SELECT b.usfm_code, c.chapter_number
      FROM bible_chapters c
      JOIN books b ON b.id = c.book_id
      WHERE b.status <> 'Borrador'
      ORDER BY b.order_number, c.chapter_number
    `).all();

    for (const version of versions) {
      const biblePrefix = version.language === 'es'
        ? '/es/biblia'
        : version.language === 'en'
          ? '/en/bible'
          : null;
      if (!biblePrefix) {
        errors.push(`contenido: versión bíblica ${version.id} usa idioma sin ruta pública soportada (${version.language})`);
        continue;
      }

      const versionRoot = `${biblePrefix}/${version.id}/`;
      bibleRoutesChecked += 1;
      if (!routeToFile.has(versionRoot)) errors.push(`contenido: falta índice de versión bíblica ${versionRoot}`);

      for (const book of books) {
        const bookRoute = `${versionRoot}${String(book.usfm_code).toLowerCase()}/`;
        bibleRoutesChecked += 1;
        if (!routeToFile.has(bookRoute)) errors.push(`contenido: falta índice bíblico ${bookRoute}`);
      }
      for (const chapter of chapters) {
        const chapterRoute = `${versionRoot}${String(chapter.usfm_code).toLowerCase()}/${chapter.chapter_number}/`;
        bibleRoutesChecked += 1;
        if (!routeToFile.has(chapterRoute)) errors.push(`contenido: falta capítulo bíblico ${chapterRoute}`);
      }
    }
  } finally {
    db.close();
  }
}

function attrs(tag) {
  const map = new Map();
  for (const m of tag.matchAll(/([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    map.set(m[1].toLowerCase(), m[2] ?? m[3] ?? m[4] ?? '');
  }
  return map;
}

function hasWrappingLabel(html, index) {
  const lower = html.toLowerCase();
  const open = lower.lastIndexOf('<label', index);
  const closeBefore = lower.lastIndexOf('</label>', index);
  if (open === -1 || closeBefore > open) return false;
  const openEnd = lower.indexOf('>', open);
  const closeAfter = lower.indexOf('</label>', index);
  return openEnd !== -1 && openEnd < index && closeAfter !== -1;
}

for (const file of htmlFiles) {
  const rel = relative(file);
  const route = routeForHtml(file);
  const html = fs.readFileSync(file, 'utf8');

  const isStaticRedirect =
    /<meta\b[^>]*http-equiv=["']refresh["']/i
      .test(html);

  if (isStaticRedirect) {
    continue;
  }

  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] ?? '';
  const htmlAttrs = attrs(htmlTag);
  const documentLang = htmlAttrs.get('lang');
  if (!documentLang) errors.push(`${rel}: <html> sin lang`);
  if (!/<main\b/i.test(html)) warnings.push(`${rel}: no se encontró <main>`);
  if (!/<meta\s+name=["']viewport["']/i.test(html)) errors.push(`${rel}: falta meta viewport`);

  const metaTags = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => attrs(match[0]));
  const robotsContent = metaTags.find((a) => (a.get('name') ?? '').toLowerCase() === 'robots')?.get('content') ?? '';
  const isNoIndex = /\bnoindex\b/i.test(robotsContent);

  const linkTags = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => attrs(match[0]));
  const canonicalTag = linkTags.find((a) => a.get('rel') === 'canonical');
  const canonicalHref = canonicalTag?.get('href') ?? '';
  let canonicalUrl = null;
  if (isNoIndex) {
    if (canonicalHref) errors.push(`${rel}: página noindex no debe declarar canonical`);
  } else if (!canonicalHref) {
    errors.push(`${rel}: falta canonical`);
  } else {
    try {
      canonicalUrl = new URL(canonicalHref);
      const expectedCanonicalPath = publicPathForRoute(route);
      if (canonicalUrl.pathname !== expectedCanonicalPath) {
        errors.push(`${rel}: canonical apunta a ${canonicalUrl.pathname}; se esperaba ${expectedCanonicalPath}`);
      }
    } catch {
      errors.push(`${rel}: canonical no es URL absoluta (${canonicalHref})`);
    }
  }

  const alternateTags = linkTags.filter((a) => a.get('rel') === 'alternate' && a.get('hreflang'));
  if (isNoIndex && alternateTags.length > 0) errors.push(`${rel}: página noindex no debe declarar hreflang`);
  const requiresLanguageCluster =
    route === '/' ||
    route === '/en/' ||
    route === '/buscar/' ||
    route === '/en/search/' ||
    route === '/descargar/' ||
    route === '/en/download/' ||
    route.startsWith('/es/biblia/') ||
    route.startsWith('/en/bible/');

  if (!isNoIndex && requiresLanguageCluster && alternateTags.length === 0) {
    errors.push(`${rel}: página bilingüe sin hreflang`);
  }

  if (alternateTags.length > 0 && canonicalUrl && (documentLang === 'es' || documentLang === 'en')) {
    const byLanguage = new Map(alternateTags.map((a) => [a.get('hreflang'), a.get('href') ?? '']));
    const selfHref = byLanguage.get(documentLang) ?? '';
    const peerLanguage = documentLang === 'es' ? 'en' : 'es';
    const peerHref = byLanguage.get(peerLanguage) ?? '';
    const defaultHref = byLanguage.get('x-default') ?? '';

    if (!selfHref) errors.push(`${rel}: falta hreflang autorreferente ${documentLang}`);
    else {
      try {
        const selfUrl = new URL(selfHref);
        if (selfUrl.origin !== canonicalUrl.origin || selfUrl.pathname !== canonicalUrl.pathname) {
          errors.push(`${rel}: hreflang ${documentLang} no coincide con canonical`);
        }
      } catch {
        errors.push(`${rel}: hreflang ${documentLang} no es URL absoluta`);
      }
    }

    if (!peerHref) errors.push(`${rel}: falta hreflang ${peerLanguage}`);
    if (!defaultHref) errors.push(`${rel}: falta hreflang x-default`);

    const peerRoute = peerHref ? routeFromAbsoluteHref(peerHref) : null;
    const defaultRoute = defaultHref ? routeFromAbsoluteHref(defaultHref) : null;
    if (peerRoute && !routeToFile.has(peerRoute)) errors.push(`${rel}: hreflang ${peerLanguage} apunta a ruta inexistente ${peerRoute}`);
    const expectedDefaultRoute = documentLang === 'es' ? route : peerRoute;
    if (defaultRoute && expectedDefaultRoute && defaultRoute !== expectedDefaultRoute) {
      errors.push(`${rel}: x-default apunta a ${defaultRoute}; se esperaba ${expectedDefaultRoute}`);
    }

    if (peerRoute) {
      seoLanguageByRoute.set(route, { lang: documentLang, peerLanguage, peerRoute });
      bilingualSeoPagesChecked += 1;
    }
  }

  const languageSwitchTag = html.match(/<a\b(?=[^>]*\bdata-language-switch(?:\s|=|>))[^>]*>/i)?.[0] ?? '';
  const supportedDocumentLanguage = documentLang === 'es' || documentLang === 'en';
  if (!isNoIndex && supportedDocumentLanguage) {
    if (!languageSwitchTag) {
      errors.push(`${rel}: falta selector global de idioma`);
    } else {
      const switchAttrs = attrs(languageSwitchTag);
      const peerLanguage = documentLang === 'es' ? 'en' : 'es';
      const switchLanguage = switchAttrs.get('hreflang') ?? '';
      const switchMode = switchAttrs.get('data-language-mode') ?? '';
      const switchHref = switchAttrs.get('href') ?? '';
      const switchLabel = switchAttrs.get('aria-label') ?? '';
      const expectedMode = alternateTags.length > 0 ? 'equivalent' : 'fallback';

      if (switchLanguage !== peerLanguage) {
        errors.push(`${rel}: selector de idioma declara ${switchLanguage || 'sin hreflang'}; se esperaba ${peerLanguage}`);
      }
      if (!switchLabel.trim()) errors.push(`${rel}: selector de idioma sin aria-label`);
      if (switchMode !== expectedMode) {
        errors.push(`${rel}: selector de idioma en modo ${switchMode || 'vacío'}; se esperaba ${expectedMode}`);
      }

      let switchRoute = null;
      if (!switchHref) {
        errors.push(`${rel}: selector de idioma sin href`);
      } else {
        try {
          switchRoute = normalizeRoute(new URL(switchHref, 'https://example.test').pathname);
        } catch {
          errors.push(`${rel}: href inválido en selector de idioma (${switchHref})`);
        }
      }

      if (expectedMode === 'equivalent') {
        const peerHref = alternateTags.find((a) => a.get('hreflang') === peerLanguage)?.get('href') ?? '';
        const peerRoute = peerHref ? routeFromAbsoluteHref(peerHref) : null;
        if (switchRoute && peerRoute && switchRoute !== peerRoute) {
          errors.push(`${rel}: selector de idioma apunta a ${switchRoute}; hreflang equivalente apunta a ${peerRoute}`);
        }
        equivalentLanguageSwitchesChecked += 1;
      } else {
        const expectedFallbackRoute = documentLang === 'es' ? '/en/' : '/';
        if (switchRoute && switchRoute !== expectedFallbackRoute) {
          errors.push(`${rel}: fallback de idioma apunta a ${switchRoute}; se esperaba ${expectedFallbackRoute}`);
        }
        fallbackLanguageSwitchesChecked += 1;
      }
    }
  }

  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/gi)].map((m) => m[1]);
  idsByRouteForSnapshot.set(route, [...new Set(ids)]);
  const seen = new Set();
  const dup = [...new Set(ids.filter((id) => seen.has(id) || !seen.add(id)))];
  if (dup.length) errors.push(`${rel}: ids duplicados (${dup.slice(0, 8).join(', ')})`);

  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    if (!a.has('alt') && a.get('role') !== 'presentation') errors.push(`${rel}: imagen sin alt`);
  }

  for (const m of html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)) {
    const a = attrs(m[0].slice(0, m[0].indexOf('>') + 1));
    const body = m[1].replace(/<[^>]+>/g, '').replace(/&\w+;/g, '').trim();
    if (!body && !a.get('aria-label') && !a.get('aria-labelledby') && !a.get('title')) {
      errors.push(`${rel}: botón sin nombre accesible`);
    }
  }

  const labels = new Set([...html.matchAll(/<label\b[^>]*for=["']([^"']+)["']/gi)].map((m) => m[1]));
  for (const m of html.matchAll(/<input\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    if ((a.get('type') || '').toLowerCase() === 'hidden') continue;
    const named = a.get('aria-label') || a.get('aria-labelledby') || (a.get('id') && labels.has(a.get('id'))) || hasWrappingLabel(html, m.index ?? 0);
    if (!named) errors.push(`${rel}: input sin etiqueta accesible${a.get('id') ? ` (#${a.get('id')})` : ''}`);
  }

  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const href = m[1].trim();
    if (!href || href === '#' || /^(https?:|mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    if (href.startsWith('#')) {
      const id = decodeURIComponent(href.slice(1));
      if (id && !ids.includes(id)) warnings.push(`${rel}: ancla local inexistente ${href}`);
      continue;
    }
    let pathname;
    try { pathname = new URL(href, `https://example.test${base}${route}`).pathname; } catch { continue; }
    if (!targetExists(pathname)) errors.push(`${rel}: enlace interno sin destino ${href}`);
  }

  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  const hasExclusiveLessonModes = /data-mode-panel=[\"']study[\"']/i.test(html)
    && /data-mode-panel=[\"']reading[\"']/i.test(html);
  if (h1Count === 0 && !/404\.html$/.test(rel)) warnings.push(`${rel}: sin H1`);
  // Lesson pages render Study and Reading as mutually exclusive panels. Their raw
  // HTML legitimately contains an H1 for each mode, while the active accessibility
  // tree exposes only one at a time. Playwright validates that visible-heading
  // contract in both modes, so the static audit must not flag the inactive panel.
  if (h1Count > 1 && !hasExclusiveLessonModes) warnings.push(`${rel}: ${h1Count} H1; revisar jerarquía`);
}

for (const [route, meta] of seoLanguageByRoute) {
  const peer = seoLanguageByRoute.get(meta.peerRoute);
  if (!peer) {
    errors.push(`i18n SEO: ${route} apunta a ${meta.peerRoute}, pero la contraparte no declara hreflang`);
    continue;
  }
  if (peer.peerRoute !== route) errors.push(`i18n SEO: hreflang no recíproco entre ${route} y ${meta.peerRoute}`);
  if (peer.lang !== meta.peerLanguage || peer.peerLanguage !== meta.lang) errors.push(`i18n SEO: idiomas incoherentes entre ${route} y ${meta.peerRoute}`);
}

for (const route of ['/buscar/', '/en/search/']) {
  const file = routeToFile.get(route);
  if (!file) continue;
  const size = fs.statSync(file).size;
  const html = fs.readFileSync(file, 'utf8');
  if (/id=["']search-data["']/i.test(html)) {
    errors.push(`rendimiento: ${route} vuelve a incrustar el índice completo de búsqueda`);
  }
  if (size > 2_000_000) errors.push(`rendimiento: HTML de búsqueda >2 MB (${route} = ${Math.round(size/1024)} KB)`);
  else if (size > 750_000) warnings.push(`rendimiento: HTML de búsqueda grande (${route} = ${Math.round(size/1024)} KB)`);
}

const searchIndexBudgets = [
  { rel: 'buscar/datos.json', warn: 16_800_000, fail: 17_500_000 },
  { rel: 'en/search/data.json', warn: 11_800_000, fail: 12_500_000 },
];
const searchIndexAssets = [];
for (const budget of searchIndexBudgets) {
  const file = path.join(dist, budget.rel);
  if (!fs.existsSync(file)) {
    errors.push(`rendimiento: falta dist/${budget.rel}`);
    continue;
  }

  const size = fs.statSync(file).size;
  searchIndexAssets.push({ f: file, size });
  if (size > budget.fail) {
    errors.push(`rendimiento: índice de búsqueda excede presupuesto (${budget.rel} = ${Math.round(size/1024)} KB)`);
  } else if (size > budget.warn) {
    warnings.push(`rendimiento: índice de búsqueda cerca del presupuesto (${budget.rel} = ${Math.round(size/1024)} KB)`);
  }

  try {
    const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
    const firstItem = Array.isArray(payload?.items) ? payload.items[0] : null;
    if (payload?.version !== 1 || !Array.isArray(payload?.items) || (firstItem && !Array.isArray(firstItem))) {
      errors.push(`rendimiento: ${budget.rel} no usa el payload compacto de búsqueda v1`);
    }
  } catch (error) {
    errors.push(`rendimiento: ${budget.rel} no contiene JSON válido (${error.message})`);
  }
}

for (const required of [
  'manifest.webmanifest',
  'sw.js',
  'offline/index.html',
  'offline-packages.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
]) {
  if (!fs.existsSync(path.join(dist, required))) errors.push(`PWA: falta dist/${required}`);
}

const serviceWorkerPath = path.join(dist, 'sw.js');
let hasBoundedRuntimeCache = false;
let hasExplicitSearchCachePolicy = false;
if (fs.existsSync(serviceWorkerPath)) {
  const serviceWorkerSource = fs.readFileSync(serviceWorkerPath, 'utf8');
  const runtimeBudgetMatch = serviceWorkerSource.match(/const\s+MAX_RUNTIME_RESPONSE_BYTES\s*=\s*(\d+)/);
  const runtimeBudget = runtimeBudgetMatch ? Number(runtimeBudgetMatch[1]) : Number.NaN;
  if (!Number.isFinite(runtimeBudget) || runtimeBudget <= 0 || runtimeBudget > 2_000_000) {
    errors.push('PWA: la caché runtime no tiene un presupuesto por respuesta de máximo 2 MB');
  } else {
    hasBoundedRuntimeCache = true;
  }

  const searchStart = serviceWorkerSource.indexOf('if (isSearchData)');
  const assetsStart = searchStart >= 0 ? serviceWorkerSource.indexOf('if (["style"', searchStart) : -1;
  const searchBlock = searchStart >= 0 && assetsStart > searchStart
    ? serviceWorkerSource.slice(searchStart, assetsStart)
    : '';
  if (!searchBlock) {
    errors.push('PWA: falta política específica para los índices de búsqueda');
  } else if (/cacheResponse\(\s*RUNTIME_CACHE/.test(searchBlock)) {
    errors.push('PWA: los índices de búsqueda no deben guardarse automáticamente en la caché runtime');
  } else if (!/caches\.match\(request\)/.test(searchBlock)) {
    errors.push('PWA: los índices de búsqueda deben conservar fallback a paquetes offline explícitos');
  } else {
    hasExplicitSearchCachePolicy = true;
  }
}


const offlinePackagesPath = path.join(dist, 'offline-packages.json');
let hasContentSensitiveOfflineRevisions = false;
if (fs.existsSync(offlinePackagesPath)) {
  try {
    const payload = JSON.parse(fs.readFileSync(offlinePackagesPath, 'utf8'));
    if (payload?.schemaVersion !== '1.2.0' || payload?.revisionStrategy !== 'content-v2') {
      errors.push('PWA: offline-packages.json no declara la estrategia de revisión content-v2');
    } else if (!Array.isArray(payload?.packages) || payload.packages.length === 0) {
      errors.push('PWA: offline-packages.json no contiene paquetes versionados');
    } else {
      const hasContentSensitiveRevision = (urls, revision) => {
        if (
          !Array.isArray(urls) ||
          !/^[a-f0-9]{16}$/i.test(String(revision ?? ''))
        ) {
          return false;
        }

        const legacyUrlRevision = createHash('sha1')
          .update([...urls].sort().join('\n'))
          .digest('hex')
          .slice(0, 12);

        return revision !== legacyUrlRevision;
      };

      const hasValidMediaAssets = (variant) =>
        Array.isArray(variant?.assets) &&
        variant.assets.length === variant.urls.length &&
        variant.assets.every(
          (asset) =>
            typeof asset?.url === 'string' &&
            /^[a-f0-9]{64}$/i.test(String(asset?.sha256 ?? '')) &&
            Number.isInteger(asset?.bytes) &&
            asset.bytes > 0
        );

      let revisionsAreContentSensitive = true;

      for (const pkg of payload.packages) {
        if (pkg?.kind === 'media') {
          if (
            !/^[a-f0-9]{16}$/i.test(String(pkg?.revision ?? '')) ||
            !pkg?.variants ||
            typeof pkg.variants !== 'object'
          ) {
            revisionsAreContentSensitive = false;
            break;
          }

          for (const quality of ['optimized', 'high']) {
            const variant = pkg.variants[quality];

            if (
              !hasContentSensitiveRevision(
                variant?.urls,
                variant?.revision
              ) ||
              !hasValidMediaAssets(variant)
            ) {
              revisionsAreContentSensitive = false;
              break;
            }
          }

          if (!revisionsAreContentSensitive) {
            break;
          }

          continue;
        }

        if (
          !hasContentSensitiveRevision(
            pkg?.urls,
            pkg?.revision
          )
        ) {
          revisionsAreContentSensitive = false;
          break;
        }
      }
      if (!revisionsAreContentSensitive) {
        errors.push('PWA: las revisiones offline siguen dependiendo solo de la lista de URLs');
      } else {
        hasContentSensitiveOfflineRevisions = true;
      }
    }
  } catch (error) {
    errors.push(`PWA: offline-packages.json inválido (${error.message})`);
  }
}

const offlinePackageSourcePath = path.join(root, 'src/pages/offline-packages.json.ts');
if (fs.existsSync(offlinePackageSourcePath)) {
  const source = fs.readFileSync(offlinePackageSourcePath, 'utf8');
  const requiredRevisionInputs = [
    'appSourceRevision',
    'databaseRevision',
    'lessonsContentRevision',
    'bibleContentRevision',
  ];
  for (const input of requiredRevisionInputs) {
    if (!source.includes(input)) errors.push(`PWA: falta entrada de revisión offline ${input}`);
  }
}

const manifestPath = path.join(dist, 'manifest.webmanifest');
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    for (const field of ['name', 'short_name', 'start_url', 'display', 'icons']) {
      if (!manifest[field] || (Array.isArray(manifest[field]) && manifest[field].length === 0)) errors.push(`manifest: falta ${field}`);
    }
    if (manifest.display !== 'standalone') warnings.push(`manifest: display=${JSON.stringify(manifest.display)}; se esperaba standalone`);
  } catch (e) {
    errors.push(`manifest inválido: ${e.message}`);
  }
}

const jsFiles = files.filter((f) => /\.m?js$/i.test(f));
const cssFiles = files.filter((f) => /\.css$/i.test(f));
const cssSource = cssFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const hasLongContentDeferral = /content-visibility\s*:\s*auto/i.test(cssSource)
  && /contain-intrinsic-block-size\s*:/i.test(cssSource);
if (!hasLongContentDeferral) {
  errors.push('rendimiento: falta la política de render diferido para contenido largo (content-visibility + contain-intrinsic-block-size)');
}
const largest = (arr) => arr.map((f) => ({f, size: fs.statSync(f).size})).sort((a,b)=>b.size-a.size);

function resolveBuiltAsset(htmlFile, rawUrl) {
  if (!rawUrl || /^(https?:|data:|blob:)/i.test(rawUrl)) return null;
  let pathname;
  try {
    pathname = new URL(rawUrl, `https://example.test${base}${routeForHtml(htmlFile)}`).pathname;
  } catch {
    return null;
  }
  const normalized = stripBase(pathname).replace(/^\//, '');
  const full = path.join(dist, normalized);
  return fs.existsSync(full) ? full : null;
}

const directJsFiles = new Set();
const initialJsByRoute = [];
for (const htmlFile of htmlFiles) {
  const html = fs.readFileSync(htmlFile, 'utf8');
  const refs = new Set();
  for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    const asset = resolveBuiltAsset(htmlFile, match[1]);
    if (asset && /\.m?js$/i.test(asset)) refs.add(asset);
  }
  for (const match of html.matchAll(/<link\b[^>]*\brel=["'][^"']*modulepreload[^"']*["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi)) {
    const asset = resolveBuiltAsset(htmlFile, match[1]);
    if (asset && /\.m?js$/i.test(asset)) refs.add(asset);
  }
  for (const asset of refs) directJsFiles.add(asset);
  const total = [...refs].reduce((sum, asset) => sum + fs.statSync(asset).size, 0);
  initialJsByRoute.push({ route: routeForHtml(htmlFile), total });
}

function collectInitialBuiltResources(htmlFile, html) {
  const resources = new Set();
  const add = (rawUrl) => {
    const asset = resolveBuiltAsset(htmlFile, rawUrl);
    if (asset && fs.statSync(asset).isFile()) resources.add(asset);
  };

  for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) add(match[1]);

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const a = attrs(tag);
    const rel = (a.get('rel') || '').toLowerCase().split(/\s+/).filter(Boolean);
    const href = a.get('href');
    if (!href) continue;
    if (rel.includes('stylesheet') || rel.includes('modulepreload')) {
      add(href);
      continue;
    }
    if (rel.includes('preload')) {
      const as = (a.get('as') || '').toLowerCase();
      if (['script', 'style', 'font', 'image'].includes(as)) add(href);
    }
  }

  // Images explicitly marked lazy are excluded. Other same-origin images can be
  // fetched during the initial viewport and therefore count against startup cost.
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const a = attrs(match[0]);
    if ((a.get('loading') || '').toLowerCase() === 'lazy') continue;
    const src = a.get('src');
    if (src) add(src);
  }

  return [...resources];
}

const startupMetricsByRoute = [];
for (const htmlFile of htmlFiles) {
  const route = routeForHtml(htmlFile);
  const html = fs.readFileSync(htmlFile, 'utf8');
  const resources = collectInitialBuiltResources(htmlFile, html);
  const htmlBytes = fs.statSync(htmlFile).size;
  const resourceBytes = resources.reduce((sum, asset) => sum + fs.statSync(asset).size, 0);
  startupMetricsByRoute.push({
    route,
    htmlBytes,
    resourceBytes,
    totalBytes: htmlBytes + resourceBytes,
    resourceCount: resources.length,
    resources,
  });
}

const APP_ROUTE_BUDGET = {
  htmlWarn: 250_000,
  htmlFail: 400_000,
  startupWarn: 450_000,
  startupFail: 600_000,
  countWarn: 8,
  countFail: 12,
};
const CONTENT_ROUTE_BUDGET = {
  htmlWarn: 450_000,
  htmlFail: 800_000,
  startupWarn: 650_000,
  startupFail: 950_000,
  countWarn: 10,
  countFail: 14,
};

function startupBudgetForRoute(route) {
  if ([
    '/', '/en/', '/mi-bibli/', '/en/my-bibli/', '/buscar/', '/en/search/', '/descargar/', '/en/download/',
    '/mapa/', '/mapa-3d/',
  ].includes(route)) return { label: 'aplicación', ...APP_ROUTE_BUDGET };

  if (/^\/lecciones\//.test(route)
    || /^\/pasajes\//.test(route)
    || /^\/es\/biblia(?:\/|$)/.test(route)
    || /^\/en\/bible(?:\/|$)/.test(route)) {
    return { label: 'contenido', ...CONTENT_ROUTE_BUDGET };
  }
  return null;
}

for (const metric of startupMetricsByRoute) {
  const budget = startupBudgetForRoute(metric.route);
  if (!budget) continue;

  if (metric.htmlBytes > budget.htmlFail) {
    errors.push(`rendimiento: HTML excede presupuesto de ruta ${budget.label} (${metric.route} = ${Math.round(metric.htmlBytes/1024)} KB)`);
  } else if (metric.htmlBytes > budget.htmlWarn) {
    warnings.push(`rendimiento: HTML cerca del presupuesto de ruta ${budget.label} (${metric.route} = ${Math.round(metric.htmlBytes/1024)} KB)`);
  }

  if (metric.totalBytes > budget.startupFail) {
    errors.push(`rendimiento: carga inicial excede presupuesto de ruta ${budget.label} (${metric.route} = ${Math.round(metric.totalBytes/1024)} KB)`);
  } else if (metric.totalBytes > budget.startupWarn) {
    warnings.push(`rendimiento: carga inicial alta para ruta ${budget.label} (${metric.route} = ${Math.round(metric.totalBytes/1024)} KB)`);
  }

  if (metric.resourceCount > budget.countFail) {
    errors.push(`rendimiento: demasiados recursos iniciales en ruta ${budget.label} (${metric.route} = ${metric.resourceCount})`);
  } else if (metric.resourceCount > budget.countWarn) {
    warnings.push(`rendimiento: muchos recursos iniciales en ruta ${budget.label} (${metric.route} = ${metric.resourceCount})`);
  }
}

for (const {f,size} of largest(jsFiles).slice(0, 20)) {
  const isInitial = directJsFiles.has(f);
  const errorLimit = isInitial ? 1_500_000 : 2_500_000;
  const warnLimit = isInitial ? 500_000 : 1_200_000;
  const kind = isInitial ? 'inicial' : 'diferido';
  if (size > errorLimit) errors.push(`rendimiento: JS ${kind} excede presupuesto (${relative(f)} = ${Math.round(size/1024)} KB)`);
  else if (size > warnLimit) warnings.push(`rendimiento: JS ${kind} grande (${relative(f)} = ${Math.round(size/1024)} KB)`);
}

for (const {route,total} of initialJsByRoute.sort((a,b) => b.total - a.total).slice(0, 20)) {
  if (total > 1_500_000) errors.push(`rendimiento: JS inicial total >1.5 MB (${route} = ${Math.round(total/1024)} KB)`);
  else if (total > 700_000) warnings.push(`rendimiento: JS inicial total alto (${route} = ${Math.round(total/1024)} KB)`);
}

for (const {f,size} of largest(cssFiles).slice(0, 12)) {
  if (size > 300_000) errors.push(`rendimiento: CSS >300 KB (${relative(f)} = ${Math.round(size/1024)} KB)`);
  else if (size > 180_000) warnings.push(`rendimiento: CSS grande (${relative(f)} = ${Math.round(size/1024)} KB)`);
}

const largestHtml = largest(htmlFiles)[0];
const largestSearchIndex = [...searchIndexAssets].sort((a,b) => b.size - a.size)[0];
const largestInitialJs = largest(jsFiles.filter((f) => directJsFiles.has(f)))[0];
const largestDeferredJs = largest(jsFiles.filter((f) => !directJsFiles.has(f)))[0];
const largestStartupRoute = [...startupMetricsByRoute].sort((a,b) => b.totalBytes - a.totalBytes)[0];

const requiredRouteGroups = [
  ['/', '/en/'],
  ['/buscar/', '/en/search/'],
  ['/descargar/', '/en/download/'],
  ['/mi-bibli/', '/en/my-bibli/'],
  ['/es/biblia/', '/en/bible/'],
];
for (const pair of requiredRouteGroups) {
  for (const route of pair) {
    if (!routeToFile.has(route)) errors.push(`paridad ES/EN: falta ruta ${route}`);
  }
}

if (warnings.length) {
  console.warn('Auditoría del sitio: WARN');
  for (const warning of warnings.slice(0, 80)) console.warn(`- ${warning}`);
  if (warnings.length > 80) console.warn(`- ... ${warnings.length - 80} avisos adicionales`);
}

if (errors.length) {
  console.error('Auditoría del sitio: FAIL');
  for (const error of errors.slice(0, 120)) console.error(`- ${error}`);
  if (errors.length > 120) console.error(`- ... ${errors.length - 120} errores adicionales`);
  process.exit(1);
}

function sha256Buffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function writeBuildAuditSnapshot() {
  fs.mkdirSync(buildSnapshotDir, { recursive: true });
  const generatedRoot = path.join(buildSnapshotDir, 'generated');
  const generatedFiles = {};
  for (const [rel, buffer] of snapshotArtifactBuffers) {
    const target = path.join(generatedRoot, ...rel.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buffer);
    generatedFiles[rel] = { sha256: sha256Buffer(buffer), size: buffer.length };
  }

  const idsByRoute = Object.fromEntries(
    [...idsByRouteForSnapshot.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
  );
  const snapshot = {
    schemaVersion: 1,
    createdAtMs: Date.now(),
    root,
    base,
    htmlCount: htmlFiles.length,
    routes: [...routeToFile.keys()].sort(),
    files: files.map(relative).sort(),
    idsByRoute,
    generatedFiles,
  };
  fs.writeFileSync(buildSnapshotPath, JSON.stringify(snapshot));
}

writeBuildAuditSnapshot();

console.log('Auditoría del sitio: PASS');
console.log(`HTML revisados: ${htmlFiles.length}`);
console.log(`Assets JS: ${jsFiles.length} · CSS: ${cssFiles.length}`);
if (editorialRoutesChecked || bibleRoutesChecked) console.log(`Contenido SQLite→build: ${editorialRoutesChecked} rutas editoriales · ${bibleRoutesChecked} rutas bíblicas verificadas`);
if (bilingualSeoPagesChecked) console.log(`Paridad SEO ES/EN: ${bilingualSeoPagesChecked} páginas bilingües con canonical/hreflang recíproco`);
if (equivalentLanguageSwitchesChecked || fallbackLanguageSwitchesChecked) {
  console.log(`Selector ES/EN: ${equivalentLanguageSwitchesChecked} equivalentes · ${fallbackLanguageSwitchesChecked} fallbacks explícitos`);
}
if (hasLongContentDeferral) console.log('Render diferido de contenido largo: activo');
if (hasBoundedRuntimeCache && hasExplicitSearchCachePolicy) console.log('Caché runtime PWA: acotada · índices de búsqueda solo offline explícito');
if (hasContentSensitiveOfflineRevisions) console.log('Paquetes offline: revisiones sensibles al contenido');
if (largestHtml) console.log(`HTML más grande: ${relative(largestHtml.f)} · ${Math.round(largestHtml.size/1024)} KB`);
if (largestSearchIndex) console.log(`Índice de búsqueda más grande: ${relative(largestSearchIndex.f)} · ${Math.round(largestSearchIndex.size/1024)} KB`);
if (largestInitialJs) console.log(`JS inicial más grande: ${relative(largestInitialJs.f)} · ${Math.round(largestInitialJs.size/1024)} KB`);
if (largestDeferredJs) console.log(`JS diferido más grande: ${relative(largestDeferredJs.f)} · ${Math.round(largestDeferredJs.size/1024)} KB`);
if (largestStartupRoute) console.log(`Carga inicial más pesada: ${largestStartupRoute.route} · ${Math.round(largestStartupRoute.totalBytes/1024)} KB · ${largestStartupRoute.resourceCount} recursos`);
console.log(`Avisos no bloqueantes: ${warnings.length}`);
