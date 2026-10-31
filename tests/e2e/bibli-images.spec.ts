import { test, expect } from '@playwright/test';

const base = '/bibli';

test('Approved BibliImg package enriches the Abraham glossary entry without replacing explicit relations', async ({ page }) => {
  await page.goto(`${base}/glosario/abraham/`);

  const figure = page.locator('[data-bibli-img-entry="personajes-abraham"]');
  await expect(figure).toBeVisible();
  await expect(figure).toHaveAttribute('data-bibli-img-version', '1');
  await expect(figure).toHaveAttribute('data-bibli-img-status', 'approved');
  await expect(figure).toHaveAttribute('data-bibli-img-certainty', 'plausible_reconstruction');

  const image = figure.locator('img');
  const mediaBase = process.env.PUBLIC_BIBLI_MEDIA_BASE_URL?.replace(/\\\/$/, '');
  const expectedImageSrc = mediaBase
    ? `${mediaBase}/editorial/personajes/abraham/v001/abraham--optimized.webp`
    : `${base}/media/editorial/personajes/abraham/v001/abraham--optimized.webp`;

  await expect(image).toHaveAttribute('src', expectedImageSrc);
  await expect(image).toHaveAttribute('srcset', /abraham--optimized\.webp 512w, .*abraham--high\.webp 960w/);
  await expect(image).toHaveAttribute('alt', /Figura aislada de cuerpo entero de Abraham/);

  await expect.poll(
    () =>
      image.evaluate((element) =>
        element instanceof HTMLImageElement
          ? element.naturalWidth
          : 0
      ),
    { message: 'BibliImg image should load successfully' }
  ).toBeGreaterThan(0);

  const editorial = page.locator('[data-bibli-img-content="personajes-abraham"]');
  await expect(editorial).toBeVisible();
  await expect(editorial).toContainText('Génesis presenta a Abraham');
  await expect(editorial).toContainText('Génesis 17:5');
  await expect(editorial).toContainText('Génesis 11:26-25:10');

  const explicitLessons = page.locator('[data-explicit-connections="lesson-glossary"]');
  await expect(explicitLessons).toBeAttached();
});

test('Glossary entries without an integrated BibliImg package keep the existing fallback surface', async ({ page }) => {
  await page.goto(`${base}/glosario/promesa/`);

  await expect(page.locator('[data-bibli-img-entry]')).toHaveCount(0);
  await expect(page.locator('[data-bibli-img-content]')).toHaveCount(0);
  await expect(page.locator('.glossary-definition-card')).toBeVisible();
  await expect(page.locator('[data-explicit-connections="lesson-glossary"]')).toBeAttached();
});
