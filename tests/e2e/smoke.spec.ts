import { test, expect, type Page } from '@playwright/test';

const base = '/bibli';
const lessonUrl = `${base}/lecciones/pentateuco-leccion-001-genesis-1-1-a-2-3/`;

async function installSpeechMock(page: Page) {
  await page.addInitScript(() => {
    class MockUtterance {
      text: string;
      lang = '';
      rate = 1;
      pitch = 1;
      volume = 1;
      voice = null;
      onstart: null | (() => void) = null;
      onend: null | (() => void) = null;
      onerror: null | ((event: { error: string }) => void) = null;

      constructor(text: string) {
        this.text = text;
      }
    }

    const engine = {
      getVoices: () => [],
      cancel: () => undefined,
      pause: () => undefined,
      resume: () => undefined,
      speak: (utterance: MockUtterance) => queueMicrotask(() => utterance.onstart?.()),
    };

    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: MockUtterance,
    });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: engine,
    });
  });
}

async function setLessonMode(page: Page, mode: 'study' | 'reading') {
  const toolbarButton = page.locator(`[data-mode-button="${mode}"]`);
  if (await toolbarButton.isVisible()) {
    await toolbarButton.click();
    return;
  }

  const more = page.locator('[data-dock-more-toggle]');
  if (await more.getAttribute('aria-expanded') !== 'true') await more.click();
  await page.locator(`[data-dock-mode="${mode}"]`).click();
}

test('Home loads with the approved global navigation and no horizontal overflow', async ({ page }) => {
  await page.goto(`${base}/`);
  await expect(page.locator('[data-brand-logo]')).toBeVisible();
  await expect(page.locator('[data-context-dock]')).toBeVisible();
  await expect(page.locator('main')).toBeVisible();

  const home = page.locator('[data-context-dock] a[aria-label="Inicio"]');
  await expect(home).toHaveAttribute('aria-current', 'page');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.goto(`${base}/buscar/`);
  await expect(page.locator('[data-context-dock] a[aria-label="Inicio"]')).not.toHaveAttribute('aria-current', 'page');
});

test('Language switch distinguishes equivalents from fallback and keeps persisted language coherent', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('bibli-language'));

  await page.goto(`${base}/es/biblia/rvr1960/gen/1/?q=creation#v3`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  expect(await page.evaluate(() => localStorage.getItem('bibli-language'))).toBe('es');

  const equivalentSwitch = page.locator('[data-language-switch]');
  await expect(equivalentSwitch).toHaveAttribute('data-language-mode', 'equivalent');
  await expect(equivalentSwitch).toHaveAttribute('hreflang', 'en');
  const equivalentTarget = await equivalentSwitch.evaluate((element) => {
    const url = new URL((element as HTMLAnchorElement).href);
    return { pathname: url.pathname, search: url.search, hash: url.hash };
  });
  expect(equivalentTarget).toEqual({
    pathname: `${base}/en/bible/kjv/gen/1/`,
    search: '?q=creation',
    hash: '#v3',
  });

  await equivalentSwitch.click();
  await page.waitForURL((url) =>
    url.pathname === `${base}/en/bible/kjv/gen/1/`
      && url.search === '?q=creation'
      && url.hash === '#v3',
  );
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(await page.evaluate(() => localStorage.getItem('bibli-language'))).toBe('en');

  await page.goto(`${base}/temas/creacion/?q=ignored#ignored`);
  const fallbackSwitch = page.locator('[data-language-switch]');
  await expect(fallbackSwitch).toHaveAttribute('data-language-mode', 'fallback');
  await expect(fallbackSwitch).toHaveAttribute('hreflang', 'en');
  await expect(fallbackSwitch).toHaveAttribute('aria-label', /inicio en inglés/i);
  const fallbackTarget = await fallbackSwitch.evaluate((element) => {
    const url = new URL((element as HTMLAnchorElement).href);
    return { pathname: url.pathname, search: url.search, hash: url.hash };
  });
  expect(fallbackTarget).toEqual({ pathname: `${base}/en/`, search: '', hash: '' });
  expect(await page.evaluate(() => localStorage.getItem('bibli-language'))).toBe('es');

  await page.goto(`${base}/en/`);
  expect(await page.evaluate(() => localStorage.getItem('bibli-language'))).toBe('en');
  await page.goto(`${base}/offline/`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('section[data-offline-copy="en"]')).toBeVisible();
  await expect(page.locator('section[data-offline-copy="es"]')).toBeHidden();
});

test('Global search opens, focuses, renders filters, clears and closes from the same trigger', async ({ page }) => {
  test.setTimeout(45_000);
  await page.goto(`${base}/`);
  const trigger = page.locator('[data-context-search], [data-dock-action="search"]').first();
  const indexResponse = page.waitForResponse(
    (response) => response.url().includes('/buscar/datos.json') && response.ok(),
    { timeout: 25_000 },
  );
  await trigger.click();

  const shell = page.locator('[data-global-search-shell]');
  const input = page.locator('[data-global-search-input]');
  await expect(shell).toHaveAttribute('aria-hidden', 'false');
  await expect(input).toBeFocused();

  await input.fill('jesus');
  await indexResponse;
  await expect(page.locator('[data-global-search-clear]')).toBeVisible();
  await expect(page.locator('[data-global-search-popover]')).toBeVisible();
  await expect.poll(
    async () => page.locator('[data-global-search-filter]').count(),
    { timeout: 15_000 },
  ).toBeGreaterThan(0);
  await expect(page.locator('[data-global-search-all]')).toBeVisible();

  await page.locator('[data-global-search-clear]').click();
  await expect(input).toHaveValue('');
  await expect(page.locator('[data-global-search-clear]')).toBeHidden();

  await trigger.click();
  await expect(shell).toHaveAttribute('aria-hidden', 'true');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('Lesson mode, TTS surface and dock state survive Study to Reading transitions', async ({ page }, testInfo) => {
  await installSpeechMock(page);
  await page.goto(lessonUrl);

  const shell = page.locator('[data-learning-shell]');
  const dock = page.locator('[data-lesson-mobile-dock]');
  const ttsButton = page.locator('[data-dock-action="tts"]');
  const player = page.locator('[data-tts-player]');
  const mini = page.locator('[data-tts-mini]');

  await expect(shell).toBeVisible();
  await expect(dock).toBeVisible();
  await expect(page.locator('[data-mode-panel="study"]')).toBeVisible();

  await ttsButton.click();
  await expect(player).toBeVisible();
  await expect(ttsButton).toHaveAttribute('aria-pressed', 'true');

  await expect.poll(async () => page.locator('html').getAttribute('data-tts-active')).toBe('true');
  await page.locator('[data-tts-close]').click();
  await expect(player).toBeHidden();
  await expect(mini).toBeVisible();

  await mini.click();
  await expect(player).toBeVisible();
  await setLessonMode(page, 'reading');
  await expect(page.locator('[data-mode-panel="reading"]')).toBeVisible();
  await expect(ttsButton).toHaveAttribute('aria-pressed', 'true');

  if (testInfo.project.name === 'desktop-chromium') {
    await expect(player).toBeVisible();
  } else {
    // On compact layouts the mode switch lives inside More. Opening that sheet
    // intentionally minimizes transient tools, so TTS must survive as the mini
    // player instead of competing with the dock sheet for the viewport.
    await expect(player).toBeHidden();
    await expect(mini).toBeVisible();
    await mini.click();
    await expect(player).toBeVisible();
  }

  await setLessonMode(page, 'study');
  await expect(page.locator('[data-mode-panel="study"]')).toBeVisible();
  await expect(dock).toBeVisible();
});

test('Lesson contextual surfaces follow desktop and compact mutual-exclusion rules', async ({ page }, testInfo) => {
  await page.goto(lessonUrl);

  const toc = page.locator('[data-toc-panel]');
  const aids = page.locator('[data-aids-column]');
  const tocDock = page.locator('[data-dock-action="toc"]');
  const aidsDock = page.locator('[data-dock-action="aids"]');

  if (testInfo.project.name === 'desktop-chromium') {
    const tocToolbar = page.locator('[data-toc-toggle]');
    const aidsToolbar = page.locator('[data-aids-toggle]');
    if (await tocToolbar.getAttribute('aria-expanded') !== 'true') await tocToolbar.click();
    if (await aidsToolbar.getAttribute('aria-expanded') !== 'true') await aidsToolbar.click();
    await expect(toc).toBeVisible();
    await expect(aids).toBeVisible();
  } else {
    if (await tocDock.getAttribute('aria-pressed') !== 'true') await tocDock.click();
    await expect(tocDock).toHaveAttribute('aria-pressed', 'true');
    await aidsDock.click();
    await expect(aidsDock).toHaveAttribute('aria-pressed', 'true');
    await expect(tocDock).toHaveAttribute('aria-pressed', 'false');
    await expect(aids).toBeVisible();
  }
});

test('Opening another lesson tool closes global search', async ({ page }) => {
  await page.goto(lessonUrl);
  const search = page.locator('[data-dock-action="search"]');
  const reader = page.locator('[data-dock-action="reader"]');
  const shell = page.locator('[data-global-search-shell]');

  await search.click();
  await expect(shell).toHaveAttribute('aria-hidden', 'false');
  await reader.click();
  await expect(shell).toHaveAttribute('aria-hidden', 'true');
  await expect(search).toHaveAttribute('aria-pressed', 'false');
});

test('Glossary exposes alphabet navigation', async ({ page }) => {
  await page.goto(`${base}/glosario/`);
  await expect(page.locator('[data-alpha-index], .alphabet-index, [aria-label*="alfab" i]').first()).toBeVisible();
});

test('Offline packages render styled interactive controls', async ({ page }) => {
  await page.goto(`${base}/descargar/`);
  await expect(page.locator('[data-offline-manager]')).toBeVisible();
  const first = page.locator('[data-offline-manager] button').first();
  await expect(first).toBeVisible();
  const radius = await first.evaluate((el) => getComputedStyle(el).borderRadius);
  expect(parseFloat(radius)).toBeGreaterThanOrEqual(8);
});

test('Theme and accent preferences remain versioned through the global appearance controls', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('bibli-theme');
    localStorage.removeItem('bibli-accent');
  });
  await page.goto(`${base}/`);

  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-accent', 'earth');

  await page.locator('[data-menu-toggle]').click();
  await page.locator('[data-theme-choice="dark"]').click();
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await expect(root).toHaveAttribute('data-theme-preference', 'dark');
  expect(await page.evaluate(() => localStorage.getItem('bibli-theme'))).toBe('dark');

  await page.locator('[data-accent-choice="ocean"]').click();
  await expect(root).toHaveAttribute('data-accent', 'ocean');
  expect(await page.evaluate(() => localStorage.getItem('bibli-accent'))).toBe('ocean');

  await page.locator('[data-theme-choice="auto"]').click();
  await expect(root).toHaveAttribute('data-theme-preference', 'auto');
});

test('Critical surfaces keep accessible names, alternative text, unique IDs and skip navigation', async ({ page }) => {
  const urls = [`${base}/`, `${base}/buscar/`, `${base}/glosario/`, `${base}/descargar/`, lessonUrl];
  for (const url of urls) {
    await page.goto(url);
    const result = await page.evaluate(() => {
      const unnamedButtons = [...document.querySelectorAll('button')].filter((button) => {
        const text = (button.textContent || '').trim();
        return !text && !button.getAttribute('aria-label') && !button.getAttribute('aria-labelledby') && !button.getAttribute('title');
      }).length;
      const imagesWithoutAlt = [...document.querySelectorAll('img')].filter((img) => !img.hasAttribute('alt') && img.getAttribute('role') !== 'presentation').length;
      const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
      const visibleH1s = [...document.querySelectorAll('h1')].filter((heading) => {
        const style = getComputedStyle(heading);
        return style.display !== 'none' && style.visibility !== 'hidden' && heading.getClientRects().length > 0;
      }).length;
      return { unnamedButtons, imagesWithoutAlt, duplicates: [...new Set(duplicates)], visibleH1s };
    });
    expect(result.unnamedButtons).toBe(0);
    expect(result.imagesWithoutAlt).toBe(0);
    expect(result.duplicates).toEqual([]);
    expect(result.visibleH1s).toBe(1);
  }

  await page.goto(lessonUrl);
  await expect(page.locator('h1:visible')).toHaveCount(1);
  await setLessonMode(page, 'reading');
  await expect(page.locator('[data-mode-panel="reading"]')).toBeVisible();
  await expect(page.locator('h1:visible')).toHaveCount(1);

  await page.goto(`${base}/`);
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
});
