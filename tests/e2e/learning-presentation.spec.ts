import { expect, test, type Page } from '@playwright/test';

const base = '/bibli';
const lessonUrl = `${base}/lecciones/pentateuco-leccion-001-genesis-1-1-a-2-3/`;

async function selectStudyPresentation(page: Page, presentation: 'classic' | 'dynamic') {
  const button = page.locator(`[data-presentation-button="${presentation}"]`);
  await expect(button).toBeVisible();
  await button.click();
  await expect(button).toHaveAttribute('aria-selected', 'true');
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

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const resetKey = 'bibli-e2e-study-presentation-reset-v1';
    if (sessionStorage.getItem(resetKey) === 'true') return;
    localStorage.removeItem('bibli-study-presentation-v1');
    sessionStorage.setItem(resetKey, 'true');
  });
});

test('Classic remains the default while Dynamic renders the same structured lesson', async ({ page }) => {
  await page.goto(lessonUrl);

  const shell = page.locator('[data-learning-shell]');
  const classicButton = page.locator('[data-presentation-button="classic"]');
  const dynamicButton = page.locator('[data-presentation-button="dynamic"]');
  const classic = page.locator('[data-lesson-renderer="classic"]');
  const dynamic = page.locator('[data-lesson-renderer="dynamic"]');

  await expect(shell).toHaveAttribute('data-structured-learning-model', 'available');
  await expect(page.locator('.mode-toolbar [data-presentation-button="classic"]')).toBeVisible();
  await expect(page.locator('[data-mode-panel="study"] [data-presentation-button]')).toHaveCount(0);
  await expect(classicButton).toHaveAttribute('aria-selected', 'true');
  await expect(dynamicButton).toBeEnabled();
  await expect(classic).toBeVisible();
  await expect(dynamic).toBeHidden();

  await dynamicButton.focus();
  await dynamicButton.press('Home');
  await expect(classicButton).toBeFocused();
  await expect(classicButton).toHaveAttribute('aria-selected', 'true');
  await classicButton.press('ArrowRight');

  await expect(dynamicButton).toBeFocused();
  await expect(dynamicButton).toHaveAttribute('aria-selected', 'true');
  await expect(classic).toBeHidden();
  await expect(dynamic).toBeVisible();
  await expect(dynamic).toHaveAttribute('data-lesson-id', 'pentateuco-principal--genesis--01-01-02-03--l001');
  await expect(dynamic).toHaveAttribute('data-block-count', '16');

  const blocks = dynamic.locator('[data-dynamic-block]');
  await expect(blocks).toHaveCount(16);
  const ids = await blocks.evaluateAll((items) => items.map((item) => item.getAttribute('data-block-id')));
  expect(new Set(ids).size).toBe(ids.length);
  await expect(dynamic.locator('[data-dynamic-block]:not([hidden])')).toHaveAttribute('data-block-key', 'title');
});

test('Home default lesson view controls the initial Study presentation', async ({ page }) => {
  await page.goto(`${base}/`);

  const preference = page.locator('[data-study-presentation-preference]');
  const classicOption = preference.locator('[data-study-presentation-option="classic"]');
  const dynamicOption = preference.locator('[data-study-presentation-option="dynamic"]');
  const classicInput = preference.locator('[data-study-presentation-choice="classic"]');
  const dynamicInput = preference.locator('[data-study-presentation-choice="dynamic"]');

  await expect(preference).toBeVisible();
  await expect(classicInput).toBeChecked();
  await dynamicOption.click();
  await expect(dynamicInput).toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('bibli-study-presentation-v1'))).toBe('dynamic');

  await page.goto(lessonUrl);
  await expect(page.locator('[data-presentation-button="dynamic"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-lesson-renderer="dynamic"]')).toBeVisible();
  await expect(page.locator('[data-lesson-renderer="classic"]')).toBeHidden();
  await expect(page.locator('[data-lesson-toc-column], .lesson-toc-column')).toBeHidden();

  await page.goto(`${base}/`);
  await expect(dynamicInput).toBeChecked();
  await classicOption.click();
  await expect(classicInput).toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('bibli-study-presentation-v1'))).toBe('classic');
});

test('Dynamic block navigation follows the structured block order', async ({ page }) => {
  await page.goto(lessonUrl);
  await selectStudyPresentation(page, 'dynamic');

  const dynamic = page.locator('[data-dynamic-lesson]');
  const active = () => dynamic.locator('[data-dynamic-block]:not([hidden])');
  const next = dynamic.locator('[data-dynamic-next]');
  const previous = dynamic.locator('[data-dynamic-previous]');
  const progress = dynamic.locator('[data-dynamic-progress]');

  await expect(active()).toHaveAttribute('data-block-key', 'title');
  await expect(previous).toBeDisabled();
  await expect(progress).toHaveAttribute('aria-valuenow', '1');

  await next.click();
  await expect(active()).toHaveAttribute('data-block-key', 'primary-reading');
  await expect(progress).toHaveAttribute('aria-valuenow', '2');
  await expect(previous).toBeEnabled();

  await next.click();
  await expect(active()).toHaveAttribute('data-block-key', 'context');
  await expect(dynamic).toHaveAttribute('data-active-block', 'context');

  await previous.click();
  await expect(active()).toHaveAttribute('data-block-key', 'primary-reading');
});

test('Dynamic presentation survives Reading transitions and reload', async ({ page }) => {
  await page.goto(lessonUrl);
  await selectStudyPresentation(page, 'dynamic');

  expect(await page.evaluate(() => localStorage.getItem('bibli-study-presentation-v1'))).toBe('dynamic');
  await expect(page.locator('[data-lesson-renderer="dynamic"]')).toBeVisible();

  await setLessonMode(page, 'reading');
  await expect(page.locator('[data-mode-panel="reading"]')).toBeVisible();

  await setLessonMode(page, 'study');
  await expect(page.locator('[data-lesson-renderer="dynamic"]')).toBeVisible();
  await expect(page.locator('[data-presentation-button="dynamic"]')).toHaveAttribute('aria-selected', 'true');

  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem('bibli-study-presentation-v1'))).toBe('dynamic');
  await expect(page.locator('[data-mode-panel="study"]')).toBeVisible();
  await expect(page.locator('[data-lesson-renderer="dynamic"]')).toBeVisible();
  await expect(page.locator('[data-presentation-button="dynamic"]')).toHaveAttribute('aria-selected', 'true');
});
