import { test, expect } from '@playwright/test';

const base = '/bibli';

test('Explicit glossary links are reciprocal between glossary and lesson', async ({ page }) => {
  await page.goto(`${base}/glosario/conceptos/promesa/`);

  const relationSection = page.locator('[data-explicit-connections="lesson-glossary"]');
  await expect(relationSection).toBeVisible();

  const relatedLessons = relationSection.locator('[data-explicit-connection="lesson-glossary"]');
  await expect(relatedLessons.first()).toBeAttached();

  const firstHref = await relatedLessons.first().getAttribute('href');
  expect(firstHref).toMatch(/^\/bibli\/lecciones\/.+\/$/);

  await relatedLessons.first().click();
  await expect(page).toHaveURL(/\/bibli\/lecciones\/.+\/$/);

  const reciprocalGlossaryLink = page.locator('[data-explicit-connection="lesson-glossary"][href="/bibli/glosario/conceptos/promesa/"]');
  await expect(reciprocalGlossaryLink.first()).toBeAttached();
});

test('Lesson base Scripture exposes reciprocal explicit book and passage links', async ({ page }) => {
  const lessonSlug = 'pentateuco-leccion-001-genesis-1-1-a-2-3';
  const lessonHref = `${base}/lecciones/${lessonSlug}/`;
  const bookHref = `${base}/libros/genesis/`;
  const passageHref = `${base}/pasajes/study-genesis-1-1-2-3/`;

  await page.goto(lessonHref);

  const bookLink = page.locator(`[data-explicit-connection="lesson-books"][href="${bookHref}"]`);
  const passageLink = page.locator(`[data-explicit-connection="lesson-passages"][href="${passageHref}"]`);
  await expect(bookLink.first()).toBeAttached();
  await expect(passageLink.first()).toBeAttached();

  await page.goto(bookHref);
  await expect(page.locator(`[data-explicit-connection="lesson-books"][href="${lessonHref}"]`).first()).toBeAttached();

  await page.goto(passageHref);
  await expect(page.locator(`[data-explicit-connection="lesson-passages"][href="${lessonHref}"]`).first()).toBeAttached();
});

test('Event connections expose explicit provenance and a reciprocal topic link', async ({ page }) => {
  const eventHref = `${base}/eventos/llamado-de-abraham/`;
  await page.goto(eventHref);

  for (const relation of ['event-books', 'event-passages', 'event-people', 'event-places', 'event-topics', 'lesson-events']) {
    await expect(page.locator(`[data-explicit-connection="${relation}"]`).first()).toBeAttached();
  }

  const topicLink = page.locator('[data-explicit-connection="event-topics"]').first();
  const topicHref = await topicLink.getAttribute('href');
  expect(topicHref).toMatch(/^\/bibli\/temas\/.+\/$/);
  await page.goto(topicHref!);
  await expect(page.locator(`[data-explicit-connection="event-topics"][href="${eventHref}"]`).first()).toBeAttached();
});

test('Visual resource relations stay navigable while the image is still in preparation', async ({ page }) => {
  const lessonHref = `${base}/lecciones/pentateuco-leccion-007-genesis-6-9-a-22/`;
  const resourceHref = `${base}/recursos/noe-juicio-arca-pacto/`;

  await page.goto(lessonHref);
  const resourceLink = page.locator(`[data-explicit-connection="lesson-visual-resources"][href="${resourceHref}"]`);
  await expect(resourceLink.first()).toBeAttached();

  const resourceDetails = page.locator('details').filter({ has: resourceLink });
  const resourceSummary = resourceDetails.locator('summary');

  if (!(await resourceSummary.isVisible())) {
    const aidsButton = page.locator('[data-dock-action="aids"]');
    await expect(aidsButton).toBeVisible();
    await aidsButton.click();
    await expect(page.locator('html')).toHaveAttribute('data-study-aids', 'visible');
  }

  await expect(resourceSummary).toBeVisible();
  await resourceSummary.click();
  await expect(resourceLink).toBeVisible();
  await expect(resourceLink.locator('.visual-placeholder')).toContainText('En preparación');

  await page.goto(resourceHref);
  await expect(page.locator(`[data-explicit-connection="lesson-visual-resources"][href="${lessonHref}"]`).first()).toBeAttached();
});

test('Derived person-place links expose event provenance without masquerading as direct relations', async ({ page }) => {
  const personHref = `${base}/glosario/personajes/abraham/`;
  const placeHref = `${base}/lugares/canaan/`;

  await page.goto(personHref);
  const personDerivedGroup = page.locator('[data-derived-connections="person-places-via-events"]');
  await expect(personDerivedGroup).toBeVisible();
  await expect(personDerivedGroup).toContainText('Conexión derivada');

  const placeLink = page.locator(`[data-derived-connection="person-places-via-events"][href="${placeHref}"]`);
  await expect(placeLink).toBeAttached();
  await expect(placeLink).toHaveAttribute('data-derived-via', 'event-people,event-places');
  await expect(placeLink).toHaveAttribute('data-derived-evidence-count', '2');
  await expect(page.locator(`[data-explicit-connection="person-places"][href="${placeHref}"]`)).toHaveCount(0);

  await page.goto(placeHref);
  const placeDerivedGroup = page.locator('[data-derived-connections="person-places-via-events"]');
  await expect(placeDerivedGroup).toBeVisible();
  await expect(placeDerivedGroup).toContainText('Conexión derivada');

  const personLink = page.locator(`[data-derived-connection="person-places-via-events"][href="${personHref}"]`);
  await expect(personLink).toBeAttached();
  await expect(personLink).toHaveAttribute('data-derived-via', 'event-people,event-places');
  await expect(personLink).toHaveAttribute('data-derived-evidence-count', '2');
  await expect(page.locator(`[data-explicit-connection="person-places"][href="${personHref}"]`)).toHaveCount(0);
});

test('Derived person-place evidence links to the exact events that explicitly support both endpoints', async ({ page }) => {
  const personHref = `${base}/glosario/personajes/abraham/`;
  const placeHref = `${base}/lugares/canaan/`;
  const expectedEvents = [
    `${base}/eventos/llamado-de-abraham/`,
    `${base}/eventos/pacto-con-abraham/`,
  ].sort();

  await page.goto(personHref);
  const placeLink = page.locator(`[data-derived-connection="person-places-via-events"][href="${placeHref}"]`);
  await expect(placeLink).toBeAttached();
  const personPlaceCard = page.locator('article.person-place-card').filter({ has: placeLink });
  const personEvidence = personPlaceCard.locator('[data-derived-evidence-event="person-places-via-events"]');
  await expect(personEvidence).toHaveCount(2);
  const personEvidenceHrefs = (await personEvidence.evaluateAll((links) =>
    links.map((link) => (link as HTMLAnchorElement).getAttribute('href') || '').sort(),
  ));
  expect(personEvidenceHrefs).toEqual(expectedEvents);
  for (const evidenceLink of await personEvidence.all()) {
    await expect(evidenceLink).toHaveAttribute('data-derived-evidence-via', 'event-people,event-places');
  }

  await page.goto(expectedEvents[0]);
  await expect(page.locator(`[data-explicit-connection="event-people"][href="${personHref}"]`).first()).toBeAttached();
  await expect(page.locator(`[data-explicit-connection="event-places"][href="${placeHref}"]`).first()).toBeAttached();

  await page.goto(placeHref);
  const personLink = page.locator(`[data-derived-connection="person-places-via-events"][href="${personHref}"]`);
  await expect(personLink).toBeAttached();
  const placePersonCard = page.locator('article.place-person-card').filter({ has: personLink });
  const placeEvidence = placePersonCard.locator('[data-derived-evidence-event="person-places-via-events"]');
  await expect(placeEvidence).toHaveCount(2);
  const placeEvidenceHrefs = (await placeEvidence.evaluateAll((links) =>
    links.map((link) => (link as HTMLAnchorElement).getAttribute('href') || '').sort(),
  ));
  expect(placeEvidenceHrefs).toEqual(expectedEvents);
});

test('Event-passage relation roles survive reciprocal navigation', async ({ page }) => {
  const eventHref = `${base}/eventos/pacto-con-abraham/`;
  const passageHref = `${base}/pasajes/galatas-3-16/`;
  const role = 'cumplimiento en Cristo';

  await page.goto(eventHref);
  const passageLink = page.locator(`[data-explicit-connection="event-passages"][href="${passageHref}"]`);
  await expect(passageLink).toBeAttached();
  await expect(passageLink).toHaveAttribute('data-connection-relation-type', role);
  await expect(passageLink).toContainText(`Relación: ${role}`);

  await page.goto(passageHref);
  const eventLink = page.locator(`[data-explicit-connection="event-passages"][href="${eventHref}"]`);
  await expect(eventLink).toBeAttached();
  await expect(eventLink).toHaveAttribute('data-connection-relation-type', role);
  await expect(eventLink).toContainText(`Relación: ${role}`);
});
