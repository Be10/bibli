import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';

const base = '/bibli';

// Keep network assertions deterministic: Bibli's production service worker can
// satisfy same-origin search-index requests before Playwright page.route sees them.
test.use({ serviceWorkers: 'block' });

test('3D map lazy loader initializes MapLibre without external style dependency', async ({ page }) => {
  await page.route('https://tiles.openfreemap.org/styles/liberty', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        version: 8,
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#ead8b8' },
          },
        ],
      }),
    });
  });

  await page.goto(`${base}/mapa-3d/`, { waitUntil: 'domcontentloaded' });

  const shell = page.locator('[data-map3d-state]');
  await expect(shell).toBeVisible();
  await expect(shell).toHaveAttribute('data-map3d-state', /idle|loading|ready/);

  if ((await shell.getAttribute('data-map3d-state')) === 'idle') {
    await shell.scrollIntoViewIfNeeded();
  }

  await expect(shell).toHaveAttribute('data-map3d-state', 'ready', { timeout: 20_000 });
  await expect(shell).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('#biblical-map-3d canvas')).toBeVisible();
});

test('2D map lazy loader initializes Leaflet without blocking on external tiles', async ({ page }) => {
  await page.route(/https:\/\/[abcd]\.basemaps\.cartocdn\.com\/.*/, async (route) => {
    await route.abort();
  });
  await page.route(/https:\/\/server\.arcgisonline\.com\/.*/, async (route) => {
    await route.abort();
  });

  await page.goto(`${base}/mapa/`, { waitUntil: 'domcontentloaded' });

  const shell = page.locator('[data-map-runtime]');
  await expect(shell).toBeVisible();
  await expect(shell).toHaveAttribute('data-map-runtime', /idle|loading|ready/);

  if ((await shell.getAttribute('data-map-runtime')) === 'idle') {
    await shell.scrollIntoViewIfNeeded();
  }

  await expect(shell).toHaveAttribute('data-map-runtime', 'ready', { timeout: 20_000 });
  await expect(shell).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('#biblical-map.leaflet-container')).toBeVisible();
});

test('Long lesson defers below-the-fold rendering with content-visibility', async ({ page }) => {
  await page.goto(`${base}/lecciones/pentateuco-leccion-001-genesis-1-1-a-2-3/`, { waitUntil: 'domcontentloaded' });

  const study = page.locator('[data-study-content]');
  await expect(study).toHaveAttribute('data-enhanced', 'true');

  const sections = study.locator('.lesson-section');
  expect(await sections.count()).toBeGreaterThan(2);

  const studyMetrics = await sections.last().evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      contentVisibility: style.getPropertyValue('content-visibility'),
      intrinsicBlockSize: style.getPropertyValue('contain-intrinsic-block-size'),
      top: rect.top,
      viewportHeight: window.innerHeight,
      textLength: element.textContent?.trim().length ?? 0,
    };
  });

  expect(studyMetrics.contentVisibility).toBe('auto');
  expect(studyMetrics.intrinsicBlockSize).not.toBe('none');
  expect(studyMetrics.top).toBeGreaterThan(studyMetrics.viewportHeight);
  expect(studyMetrics.textLength).toBeGreaterThan(40);

  const readingTab = page.getByRole('tab', { name: 'Lectura' });
  if (await readingTab.isVisible()) {
    await readingTab.click();
  } else {
    await page.getByRole('button', { name: 'Más opciones' }).click();
    await page.locator('[data-dock-mode="reading"]').click();
  }

  const readingPanel = page.locator('[data-mode-panel="reading"]');
  await expect(readingPanel).toBeVisible();

  const chapterBlocks = readingPanel.locator('.chapter-block');
  expect(await chapterBlocks.count()).toBeGreaterThan(1);
  expect(await chapterBlocks.last().evaluate((element) => getComputedStyle(element).getPropertyValue('content-visibility'))).toBe('auto');
});

test('Service worker keeps large search indexes explicit-only and bounds runtime cache', async ({ page }) => {
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });

  const policy = await page.evaluate(async ({ swUrl, packagesUrl }) => {
    const [swResponse, packagesResponse] = await Promise.all([
      fetch(swUrl, { cache: 'no-cache' }),
      fetch(packagesUrl, { cache: 'no-cache' }),
    ]);
    if (!swResponse.ok || !packagesResponse.ok) {
      throw new Error(`PWA policy assets unavailable: sw=${swResponse.status} packages=${packagesResponse.status}`);
    }
    return {
      serviceWorker: await swResponse.text(),
      packages: await packagesResponse.json(),
    };
  }, { swUrl: `${base}/sw.js`, packagesUrl: `${base}/offline-packages.json` });

  const searchStart = policy.serviceWorker.indexOf('if (isSearchData)');
  const assetsStart = policy.serviceWorker.indexOf('if (["style"', searchStart);
  expect(searchStart).toBeGreaterThan(-1);
  expect(assetsStart).toBeGreaterThan(searchStart);
  const searchBlock = policy.serviceWorker.slice(searchStart, assetsStart);
  expect(searchBlock).not.toContain('cacheResponse(RUNTIME_CACHE');
  expect(searchBlock).toContain('caches.match(request)');

  const runtimeBudget = policy.serviceWorker.match(/const\s+MAX_RUNTIME_RESPONSE_BYTES\s*=\s*(\d+)/);
  expect(runtimeBudget).not.toBeNull();
  expect(Number(runtimeBudget?.[1])).toBeLessThanOrEqual(2_000_000);

  const appPackage = Array.isArray(policy.packages?.packages)
    ? policy.packages.packages.find((item) => item?.id === 'app')
    : null;
  expect(appPackage).toBeTruthy();
  expect(appPackage.urls).toContain(`${base}/buscar/datos.json`);
  expect(appPackage.urls).toContain(`${base}/en/search/data.json`);
});


test('Offline package revisions change with content, not only URL membership', async ({ page }) => {
  await page.goto(`${base}/descargar/`, { waitUntil: 'domcontentloaded' });

  const payload = await page.evaluate(async (packagesUrl) => {
    const response = await fetch(packagesUrl, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Offline package manifest unavailable: ${response.status}`);
    return response.json();
  }, `${base}/offline-packages.json`);

  expect(payload.schemaVersion).toBe('1.2.0');
  expect(payload.revisionStrategy).toBe('content-v2');
  expect(Array.isArray(payload.packages)).toBe(true);
  expect(payload.packages.length).toBeGreaterThan(2);

  for (const pkg of payload.packages) {
    expect(pkg.revision).toMatch(/^[a-f0-9]{16}$/i);

    if (pkg.kind === 'media') {
      expect(pkg.id).toBe('bibliimg');
      expect(pkg.variants).toBeTruthy();

      for (const quality of ['optimized', 'high']) {
        const variant = pkg.variants?.[quality];

        expect(variant).toBeTruthy();
        expect(variant.quality).toBe(quality);
        expect(Array.isArray(variant.urls)).toBe(true);
        expect(variant.revision).toMatch(/^[a-f0-9]{16}$/i);

        const legacyUrlRevision = createHash('sha1')
          .update([...variant.urls].sort().join('\n'))
          .digest('hex')
          .slice(0, 12);

        expect(variant.revision).not.toBe(legacyUrlRevision);

        expect(Array.isArray(variant.assets)).toBe(true);
        expect(variant.assets).toHaveLength(variant.urls.length);

        for (const asset of variant.assets) {
          expect(asset.sha256).toMatch(/^[a-f0-9]{64}$/i);
          expect(asset.bytes).toBeGreaterThan(0);
        }
      }

      continue;
    }

    expect(Array.isArray(pkg.urls)).toBe(true);

    const legacyUrlRevision = createHash('sha1')
      .update([...pkg.urls].sort().join('\n'))
      .digest('hex')
      .slice(0, 12);

    expect(pkg.revision).not.toBe(legacyUrlRevision);
  }
});

for (const scenario of [
  {
    name: 'Spanish advanced search',
    pageUrl: `${base}/buscar/`,
    dataUrl: '**/buscar/datos.json',
    query: 'principio',
    typeLabel: 'Versículo',
    title: 'Génesis 1:1',
    summary: 'En el principio creó Dios los cielos y la tierra.',
  },
  {
    name: 'English advanced search',
    pageUrl: `${base}/en/search/`,
    dataUrl: '**/en/search/data.json',
    query: 'beginning',
    typeLabel: 'Verse',
    title: 'Genesis 1:1',
    summary: 'In the beginning God created the heaven and the earth.',
  },
]) {
  test(`${scenario.name} defers its index until the user searches`, async ({ page }) => {
    let searchDataRequests = 0;

    await page.route(scenario.dataUrl, async (route) => {
      searchDataRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          version: 1,
          items: [[
            scenario.title,
            'Versículo',
            scenario.typeLabel,
            `${base}/`,
            scenario.summary,
            `${scenario.title} ${scenario.summary}`,
            1,
            1,
            1,
            1,
          ]],
        }),
      });
    });

    await page.goto(scenario.pageUrl, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#search-data')).toHaveCount(0);
    expect(searchDataRequests).toBe(0);

    await page.locator('#search-input').fill(scenario.query);
    await expect.poll(() => searchDataRequests).toBe(1);
    await expect(page.locator('#search-results a.search-result')).toContainText(scenario.title);
  });
}
