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

    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: MockUtterance });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: engine });
  });
}

async function expectVisibleTargetsAtLeast(page: Page, selector: string, minimum = 44) {
  const boxes = await page.locator(selector).evaluateAll((elements) => elements.flatMap((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    if (style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0) return [];
    return [{
      tag: element.tagName.toLowerCase(),
      label: element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 60) || '',
      width: rect.width,
      height: rect.height,
    }];
  }));

  expect(boxes.length).toBeGreaterThan(0);
  for (const box of boxes) {
    expect.soft(box.width, `${box.tag} "${box.label}" width`).toBeGreaterThanOrEqual(minimum - 0.5);
    expect.soft(box.height, `${box.tag} "${box.label}" height`).toBeGreaterThanOrEqual(minimum - 0.5);
  }
}

test('Global search is fully operable by keyboard and restores focus on Escape', async ({ page }) => {
  await page.goto(`${base}/`);
  const trigger = page.locator('[data-context-search]').first();
  const shell = page.locator('[data-global-search-shell]');
  const input = page.locator('[data-global-search-input]');

  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(shell).toHaveAttribute('aria-hidden', 'false');
  await expect(input).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(shell).toHaveAttribute('aria-hidden', 'true');
  await expect(trigger).toBeFocused();
});

test('Global menu supports keyboard entry and restores focus on Escape', async ({ page }) => {
  await page.goto(`${base}/`);
  const toggle = page.locator('[data-menu-toggle]');
  const menu = page.locator('[data-global-menu]');
  const firstControl = menu.locator('a[href], button:not([hidden]):not([disabled])').first();

  await toggle.focus();
  await page.keyboard.press('ArrowDown');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(firstControl).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('Compact reading preferences trap focus and return it to the lesson dock', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop-chromium', 'The desktop preferences popover is intentionally non-modal.');

  await page.goto(lessonUrl);
  const trigger = page.locator('[data-dock-action="reader"]');
  const panel = page.locator('[data-reader-preferences-panel]');
  const close = panel.locator('[data-reader-preferences-close]');
  const reset = panel.locator('[data-reader-preferences-reset]');

  await trigger.click();
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('aria-modal', 'true');
  await expect(close).toBeFocused();

  await page.keyboard.press('Shift+Tab');
  await expect(reset).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('Primary mobile controls keep at least 44 by 44 CSS pixel touch targets', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Touch-target policy is asserted on the compact mobile viewport.');

  await page.goto(`${base}/`);
  await expectVisibleTargetsAtLeast(page, '[data-context-dock] a, [data-context-dock] button');

  await page.locator('[data-menu-toggle]').click();
  await expectVisibleTargetsAtLeast(page, '[data-global-menu] a, [data-global-menu] button');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-global-menu]')).toBeHidden();

  const indexResponse = page.waitForResponse(
    (response) => response.url().includes('/buscar/datos.json') && response.ok(),
    { timeout: 25_000 },
  );
  await page.locator('[data-context-search]').click();
  await page.locator('[data-global-search-input]').fill('jesus');
  await indexResponse;
  await expect.poll(async () => page.locator('[data-global-search-filter]').count(), { timeout: 15_000 }).toBeGreaterThan(0);
  await expectVisibleTargetsAtLeast(page, '[data-global-search-input], [data-global-search-clear], [data-global-search-filter], [data-global-search-all]');

  await page.goto(lessonUrl);
  await page.locator('[data-dock-action="reader"]').click();
  await expectVisibleTargetsAtLeast(page, '[data-reader-preferences-panel] button');
  await page.keyboard.press('Escape');

  await page.locator('[data-dock-action="tts"]').click();
  await expectVisibleTargetsAtLeast(page, '[data-tts-player] button, [data-tts-player] select');
});


test('Global search announces concise result counts without making the result list live', async ({ page }) => {
  await page.goto(`${base}/`);
  const status = page.locator('[data-global-search-status]');
  const results = page.locator('[data-global-search-results]');
  const indexResponse = page.waitForResponse(
    (response) => response.url().includes('/buscar/datos.json') && response.ok(),
    { timeout: 25_000 },
  );

  await page.locator('[data-context-search]').click();
  await page.locator('[data-global-search-input]').fill('jesus');
  await indexResponse;
  await expect.poll(async () => page.locator('[data-global-search-filter]').count(), { timeout: 15_000 }).toBeGreaterThan(1);

  await expect(status).toHaveAttribute('role', 'status');
  await expect(status).toHaveAttribute('aria-live', 'polite');
  await expect(status).toHaveAttribute('aria-atomic', 'true');
  await expect(results).toHaveAttribute('aria-busy', 'false');
  expect(await results.getAttribute('aria-live')).toBeNull();
  await expect(status).toContainText(/\d+ resultados/);

  const before = (await status.textContent()) ?? '';
  const specificFilter = page.locator('[data-global-search-filter]').nth(1);
  await specificFilter.click();
  await expect(specificFilter).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await status.textContent()) ?? '').not.toBe(before);
  await expect(status).toContainText(/\d+ resultados en /);
});

test('Interactive update notice keeps actions outside the live status role', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Shared semantic contract only needs one browser viewport assertion.');

  await page.goto(`${base}/`);
  const notice = page.locator('[data-app-update]');
  const announcer = page.locator('[data-app-update-announcer]');

  await expect(notice).toHaveAttribute('role', 'region');
  await expect(notice.locator('button')).toHaveCount(2);
  await expect(announcer).toHaveAttribute('role', 'status');
  await expect(announcer).toHaveAttribute('aria-live', 'polite');
  await expect(announcer).toHaveAttribute('aria-atomic', 'true');
});

test('TTS exposes one atomic status and returns focus to its lesson trigger on Escape', async ({ page }) => {
  await installSpeechMock(page);
  await page.goto(lessonUrl);

  const trigger = page.locator('[data-dock-action="tts"]');
  const player = page.locator('[data-tts-player]');
  const status = page.locator('[data-tts-status]');
  const estimate = page.locator('.tts-estimate');

  await trigger.click();
  await expect(player).toBeVisible();
  await expect(status).toHaveAttribute('role', 'status');
  await expect(status).toHaveAttribute('aria-live', 'polite');
  await expect(status).toHaveAttribute('aria-atomic', 'true');
  await expect(page.getByRole('combobox', { name: 'Velocidad', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Voz', exact: true })).toBeVisible();
  expect(await estimate.getAttribute('aria-live')).toBeNull();

  await page.keyboard.press('Escape');
  await expect(player).toBeHidden();
  await expect(trigger).toBeFocused();
});


test('Critical routes expose one main landmark and named navigation landmarks', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Landmark semantics are shared across responsive viewports.');

  const routes = [
    `${base}/`,
    `${base}/buscar/`,
    `${base}/descargar/`,
    lessonUrl,
    `${base}/es/biblia/rvr1960/gen/1/`,
    `${base}/en/bible/kjv/gen/1/`,
  ];

  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('header.site-header')).toHaveCount(1);
    await expect(page.locator('footer.site-footer')).toHaveCount(1);
    await expect(page.locator('.skip-link')).toHaveAttribute('href', '#bibli-content');
    await expect(page.locator('#bibli-content')).toHaveCount(1);

    const unnamedNavs = await page.locator('nav').evaluateAll((navs) => navs.filter((nav) => {
      const ariaLabel = nav.getAttribute('aria-label')?.trim();
      const labelledBy = nav.getAttribute('aria-labelledby')?.trim();
      if (ariaLabel) return false;
      if (!labelledBy) return true;
      const label = document.getElementById(labelledBy)?.textContent?.trim();
      return !label;
    }).length);
    expect(unnamedNavs, `${route} has unnamed nav landmarks`).toBe(0);
  }
});

test('Lesson Study and Reading implement keyboard-operable ARIA tabs', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'The desktop toolbar exposes the canonical tablist; compact layouts use dock mode buttons.');

  await page.goto(lessonUrl);
  const studyTab = page.locator('#lesson-mode-tab-study');
  const readingTab = page.locator('#lesson-mode-tab-reading');
  const studyPanel = page.locator('#lesson-mode-panel-study');
  const readingPanel = page.locator('#lesson-mode-panel-reading');

  await expect(studyTab).toHaveAttribute('role', 'tab');
  await expect(studyTab).toHaveAttribute('aria-controls', 'lesson-mode-panel-study');
  await expect(readingTab).toHaveAttribute('aria-controls', 'lesson-mode-panel-reading');
  await expect(studyPanel).toHaveAttribute('role', 'tabpanel');
  await expect(studyPanel).toHaveAttribute('aria-labelledby', 'lesson-mode-tab-study');
  await expect(readingPanel).toHaveAttribute('aria-labelledby', 'lesson-mode-tab-reading');
  await expect(page.locator('[data-study-content]')).toHaveAttribute('aria-busy', 'false');

  await studyTab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(readingTab).toBeFocused();
  await expect(readingTab).toHaveAttribute('aria-selected', 'true');
  await expect(readingTab).toHaveAttribute('tabindex', '0');
  await expect(studyTab).toHaveAttribute('tabindex', '-1');
  await expect(readingPanel).toBeVisible();
  await expect(studyPanel).toBeHidden();

  await page.keyboard.press('Home');
  await expect(studyTab).toBeFocused();
  await expect(studyTab).toHaveAttribute('aria-selected', 'true');
  await expect(studyPanel).toBeVisible();
  await expect(readingPanel).toBeHidden();
});

test('Bible chapter navigation removes disabled links from the tab order and labels selects', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Shared chapter-navigation semantics only need one viewport assertion.');

  const cases = [
    { url: `${base}/es/biblia/rvr1960/gen/1/`, select: 'Capítulo', next: /Capítulo siguiente: 2/ },
    { url: `${base}/en/bible/kjv/gen/1/`, select: 'Chapter', next: /Next chapter: 2/ },
  ];

  for (const item of cases) {
    await page.goto(item.url);
    const jump = page.locator('.bible-chapter-jump');
    const disabledPrevious = jump.locator('.bible-chapter-jump-button.is-disabled').first();
    await expect(page.getByLabel(item.select, { exact: true })).toBeVisible();
    await expect(disabledPrevious).toHaveAttribute('aria-hidden', 'true');
    expect(await disabledPrevious.evaluate((element) => element.tagName)).toBe('SPAN');
    expect(await disabledPrevious.getAttribute('href')).toBeNull();
    await expect(jump.locator('a.bible-chapter-jump-button')).toHaveAttribute('aria-label', item.next);
  }
});

test('Keyboard focus is visibly indicated and reduced-motion removes shell transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${base}/`);
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);

  await page.keyboard.press('Tab');
  const skip = page.locator('.skip-link');
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  const focusStyle = await skip.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: Number.parseFloat(style.outlineWidth), boxShadow: style.boxShadow };
  });
  expect(focusStyle.outlineStyle).not.toBe('none');
  expect(focusStyle.outlineWidth).toBeGreaterThanOrEqual(2);
  expect(focusStyle.boxShadow).not.toBe('none');

  const durations = await page.locator('[data-global-search-shell]').evaluate((element) => getComputedStyle(element).transitionDuration
    .split(',')
    .map((value) => value.trim().endsWith('ms') ? Number.parseFloat(value) / 1000 : Number.parseFloat(value)));
  expect(Math.max(...durations)).toBeLessThanOrEqual(0.001);
});
