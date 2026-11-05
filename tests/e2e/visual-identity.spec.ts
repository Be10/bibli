import { test, expect } from '@playwright/test';

const base = '/bibli';
const routeUrl = `${base}/rutas/de-la-creacion-al-pacto/`;
const lessonUrl = `${base}/lecciones/pentateuco-leccion-001-genesis-1-1-a-2-3/`;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('bibli-theme', 'light');
    localStorage.setItem('bibli-accent', 'ocean');
  });
});

test('Personal accent stays independent from route semantic identity', async ({ page }) => {
  await page.goto(routeUrl);
  const root = page.locator('html');
  const route = page.locator('[data-route-shell][data-route-visual]');

  await expect(root).toHaveAttribute('data-accent', 'ocean');
  await expect(route).toHaveAttribute('data-route-palette', 'scroll');

  const before = await route.evaluate((element) => getComputedStyle(element).getPropertyValue('--route-accent').trim());
  const personalBefore = await root.evaluate((element) => getComputedStyle(element).getPropertyValue('--accent').trim());
  expect(before).toBeTruthy();
  expect(before).not.toBe(personalBefore);

  await page.locator('[data-menu-toggle]').click();
  await expect(page.locator('[data-accent-policy="curated-v1"]')).toBeVisible();
  await page.locator('[data-accent-choice="clay"]').click();
  await expect(root).toHaveAttribute('data-accent', 'clay');

  const after = await route.evaluate((element) => getComputedStyle(element).getPropertyValue('--route-accent').trim());
  const personalAfter = await root.evaluate((element) => getComputedStyle(element).getPropertyValue('--accent').trim());
  expect(after).toBe(before);
  expect(personalAfter).not.toBe(personalBefore);
  expect(after).not.toBe(personalAfter);
});

test('Route modules receive stable curated identities without changing navigation order', async ({ page }) => {
  await page.goto(routeUrl);
  const modules = page.locator('[data-module-card][data-module-visual]');
  expect(await modules.count()).toBeGreaterThan(5);

  const palettes = await modules.evaluateAll((elements) => elements.slice(0, 10).map((element) => element.getAttribute('data-module-palette')));
  expect(new Set(palettes.filter(Boolean)).size).toBeGreaterThan(1);

  const first = modules.first();
  const firstPalette = await first.getAttribute('data-module-palette');
  const firstAccent = await first.evaluate((element) => getComputedStyle(element).getPropertyValue('--module-accent').trim());
  expect(firstPalette).toBeTruthy();
  expect(firstAccent).toBeTruthy();

  await page.reload();
  await expect(page.locator('[data-module-card]').first()).toHaveAttribute('data-module-palette', firstPalette!);
});

test('Lesson context keeps route and module colors while theme changes', async ({ page }) => {
  await page.goto(lessonUrl);
  const root = page.locator('html');
  const lesson = page.locator('[data-learning-shell][data-route-visual][data-module-visual]');

  await expect(lesson).toHaveAttribute('data-route-palette', 'scroll');
  await expect(lesson).toHaveAttribute('data-module-palette', /.+/);

  const light = await lesson.evaluate((element) => ({
    route: getComputedStyle(element).getPropertyValue('--route-accent').trim(),
    module: getComputedStyle(element).getPropertyValue('--module-accent').trim(),
  }));

  await page.locator('[data-menu-toggle]').click();
  await page.locator('[data-theme-choice="dark"]').click();
  await expect(root).toHaveAttribute('data-theme', 'dark');

  const dark = await lesson.evaluate((element) => ({
    route: getComputedStyle(element).getPropertyValue('--route-accent').trim(),
    module: getComputedStyle(element).getPropertyValue('--module-accent').trim(),
  }));

  expect(dark.route).toBeTruthy();
  expect(dark.module).toBeTruthy();
  expect(dark.route).not.toBe(light.route);
  expect(dark.module).not.toBe(light.module);
});
