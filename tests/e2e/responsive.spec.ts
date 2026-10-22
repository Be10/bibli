import { test, expect } from '@playwright/test';

const lesson = '/bibli/lecciones/pentateuco-leccion-001-genesis-1-1-a-2-3/';
const critical = [
  '/bibli/',
  '/bibli/buscar/',
  '/bibli/explorar/',
  '/bibli/glosario/',
  '/bibli/descargar/',
  lesson,
];

for (const url of critical) {
  test(`No horizontal overflow or off-screen fixed navigation: ${url}`, async ({ page }) => {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));

    const delta = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(delta).toBeLessThanOrEqual(1);

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    if (!viewport) return;

    const fixedNavigation = page.locator('[data-context-dock]:visible, [data-lesson-mobile-dock]:visible');
    const fixedNavigationCount = await fixedNavigation.count();
    for (let index = 0; index < fixedNavigationCount; index += 1) {
      const box = await fixedNavigation.nth(index).boundingBox();
      expect(box).not.toBeNull();
      if (!box) continue;
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    }
  });
}
