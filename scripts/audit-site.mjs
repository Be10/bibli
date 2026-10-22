import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = process.cwd();
const dist = path.join(root, 'dist');
const base = '/bibli';
const errors = [];
const warnings = [];

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
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const relative = (f) => path.relative(dist, f).replaceAll(path.sep, '/');
const routeForHtml = (f) => {
  const rel = relative(f);
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'/index.html'.length)}/`;
  return `/${rel.replace(/\.html$/, '')}`;
};
const routeToFile = new Map(htmlFiles.map((f) => [routeForHtml(f), f]));

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

  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] ?? '';
  const htmlAttrs = attrs(htmlTag);
  if (!htmlAttrs.get('lang')) errors.push(`${rel}: <html> sin lang`);
  if (!/<main\b/i.test(html)) warnings.push(`${rel}: no se encontró <main>`);
  if (!/<meta\s+name=["']viewport["']/i.test(html)) errors.push(`${rel}: falta meta viewport`);

  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/gi)].map((m) => m[1]);
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
    if (payload?.schemaVersion !== '1.1.0' || payload?.revisionStrategy !== 'content-v2') {
      errors.push('PWA: offline-packages.json no declara la estrategia de revisión content-v2');
    } else if (!Array.isArray(payload?.packages) || payload.packages.length === 0) {
      errors.push('PWA: offline-packages.json no contiene paquetes versionados');
    } else {
      let revisionsAreContentSensitive = true;
      for (const pkg of payload.packages) {
        if (!Array.isArray(pkg?.urls) || !/^[a-f0-9]{16}$/i.test(String(pkg?.revision ?? ''))) {
          revisionsAreContentSensitive = false;
          break;
        }
        const legacyUrlRevision = createHash('sha1')
          .update([...pkg.urls].sort().join('\n'))
          .digest('hex')
          .slice(0, 12);
        if (pkg.revision === legacyUrlRevision) {
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
    '/', '/en/', '/buscar/', '/en/search/', '/descargar/', '/en/download/',
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

console.log('Auditoría del sitio: PASS');
console.log(`HTML revisados: ${htmlFiles.length}`);
console.log(`Assets JS: ${jsFiles.length} · CSS: ${cssFiles.length}`);
if (hasLongContentDeferral) console.log('Render diferido de contenido largo: activo');
if (hasBoundedRuntimeCache && hasExplicitSearchCachePolicy) console.log('Caché runtime PWA: acotada · índices de búsqueda solo offline explícito');
if (hasContentSensitiveOfflineRevisions) console.log('Paquetes offline: revisiones sensibles al contenido');
if (largestHtml) console.log(`HTML más grande: ${relative(largestHtml.f)} · ${Math.round(largestHtml.size/1024)} KB`);
if (largestSearchIndex) console.log(`Índice de búsqueda más grande: ${relative(largestSearchIndex.f)} · ${Math.round(largestSearchIndex.size/1024)} KB`);
if (largestInitialJs) console.log(`JS inicial más grande: ${relative(largestInitialJs.f)} · ${Math.round(largestInitialJs.size/1024)} KB`);
if (largestDeferredJs) console.log(`JS diferido más grande: ${relative(largestDeferredJs.f)} · ${Math.round(largestDeferredJs.size/1024)} KB`);
if (largestStartupRoute) console.log(`Carga inicial más pesada: ${largestStartupRoute.route} · ${Math.round(largestStartupRoute.totalBytes/1024)} KB · ${largestStartupRoute.resourceCount} recursos`);
console.log(`Avisos no bloqueantes: ${warnings.length}`);
