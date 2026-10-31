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

  const viewerTrigger =
    figure.locator('[data-bibli-img-open]');

  const viewer =
    page.locator('[data-bibli-img-dialog]');

  const viewerImage =
    viewer.locator('[data-bibli-img-dialog-image]');

  const expectedHighSrc = mediaBase
    ? `${mediaBase}/editorial/personajes/abraham/v001/abraham--high.webp`
    : `${base}/media/editorial/personajes/abraham/v001/abraham--high.webp`;

  await expect(viewerTrigger).toHaveAttribute(
    'aria-label',
    /Ampliar imagen de Abraham/
  );

  await expect(viewerTrigger).toHaveAttribute(
    'aria-haspopup',
    'dialog'
  );

  await viewerTrigger.click();

  await expect(viewer).toBeVisible();

  await expect(viewerImage).toHaveAttribute(
    'src',
    expectedHighSrc
  );

  await expect(viewerImage).toHaveAttribute(
    'alt',
    /Figura aislada de cuerpo entero de Abraham/
  );

  await expect(
    viewer.locator('[data-bibli-img-close]')
  ).toBeFocused();

  await expect.poll(
    () =>
      viewerImage.evaluate((element) =>
        element instanceof HTMLImageElement
          ? element.naturalWidth
          : 0
      ),
    { message: 'Expanded BibliImg should load successfully' }
  ).toBeGreaterThan(0);

  await page.keyboard.press('Escape');

  await expect(viewer).not.toBeVisible();
  await expect(viewerTrigger).toBeFocused();

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


test('Study aids render optimized BibliImg thumbnails and open the high-quality viewer', async ({ page }) => {
  await page.goto(
    `${base}/lecciones/pentateuco-leccion-003-genesis-3-1-a-24/`
  );

  const peopleSection =
    page.locator('[data-study-aid-section="people"]');

  if (!(await peopleSection.isVisible())) {
    const aidsToggle = page
      .locator(
        '[data-aids-toggle]:visible, [data-dock-action="aids"]:visible'
      )
      .first();

    await expect(aidsToggle).toBeVisible();
    await aidsToggle.click();
    await expect(peopleSection).toBeVisible();
  }

  if (
    (await peopleSection.getAttribute('open')) === null
  ) {
    await peopleSection.locator('summary').click();
  }

  const trigger =
    peopleSection.locator(
      '[data-bibli-img-aid="personajes-adan"]'
    );

  await expect(trigger).toBeVisible();

  const thumbnail = trigger.locator('img');

  const mediaBase =
    process.env.PUBLIC_BIBLI_MEDIA_BASE_URL
      ?.replace(/\/+$/, '');

  const optimizedSrc = mediaBase
    ? `${mediaBase}/editorial/personajes/adan/v001/adan--optimized.webp`
    : `${base}/media/editorial/personajes/adan/v001/adan--optimized.webp`;

  const highSrc = mediaBase
    ? `${mediaBase}/editorial/personajes/adan/v001/adan--high.webp`
    : `${base}/media/editorial/personajes/adan/v001/adan--high.webp`;

  await expect(thumbnail).toHaveAttribute(
    'src',
    optimizedSrc
  );

  await expect(thumbnail).toHaveAttribute(
    'loading',
    'lazy'
  );

  await expect(thumbnail).not.toHaveAttribute(
    'srcset',
    /.+/
  );

  await trigger.click();

  const viewer =
    page.locator('#study-aid-bibli-img-viewer');

  await expect(viewer).toBeVisible();

  const viewerImage =
    viewer.locator('[data-bibli-img-dialog-image]');

  await expect(viewerImage).toHaveAttribute(
    'src',
    highSrc
  );

  await expect(viewerImage).toHaveAttribute(
    'alt',
    /Adán/i
  );

  await expect(
    viewer.locator('[data-bibli-img-close]')
  ).toBeFocused();

  await expect.poll(
    () =>
      viewerImage.evaluate((element) =>
        element instanceof HTMLImageElement
          ? element.naturalWidth
          : 0
      ),
    {
      message:
        'Study Aid expanded BibliImg should load',
    }
  ).toBeGreaterThan(0);

  await page.keyboard.press('Escape');

  await expect(viewer).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
