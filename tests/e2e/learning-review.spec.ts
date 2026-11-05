import { expect, test } from '@playwright/test';

const base = '/bibli';
const reviewKey = 'bibli-learning-review-state-v1';
const dueDate = '2000-01-01';

function stateFor(conceptIds: string[]) {
  return {
    schemaVersion: 1,
    concepts: Object.fromEntries(conceptIds.map((conceptId) => [conceptId, {
      conceptId,
      sourceLessonId: 'pentateuco-principal--genesis--01-01-02-03--l001',
      sourceCheckId: 'pentateuco-principal--genesis--01-01-02-03--l001--check-01',
      dueOn: dueDate,
      intervalDays: 1,
      reviewCount: 0,
      successStreak: 0,
      lastOutcome: 'correct',
      seededAt: '2000-01-01T00:00:00.000Z',
    }])),
  };
}


test('Lesson microcheck seeds concept review for a later day instead of the same-day reinforcement queue', async ({ page }) => {
  await page.addInitScript((key) => localStorage.removeItem(key), reviewKey);
  await page.goto(`${base}/lecciones/pentateuco-leccion-001-genesis-1-1-a-2-3/?presentation=dynamic&block=exposition-02`);

  const check = page.locator('[data-microcheck]:visible').first();
  await expect(check).toBeVisible();
  await check.locator('[data-microcheck-option][data-is-correct="true"]').click();

  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), reviewKey);
  expect(stored.concepts['god-as-creator']).toBeTruthy();
  expect(stored.concepts['god-as-creator'].intervalDays).toBe(1);
  expect(stored.concepts['god-as-creator'].reviewCount).toBe(0);
  expect(stored.concepts['god-as-creator'].dueOn).not.toBe('');
});

test('Home exposes Review today only when concepts are due', async ({ page }) => {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: reviewKey,
    value: stateFor(['god-as-creator']),
  });
  await page.goto(`${base}/`);

  const review = page.locator('[data-home-review]');
  await expect(review).toBeVisible();
  await expect(review).toHaveAttribute('data-due-count', '1');
  await expect(review.locator('[data-home-review-meta]')).toContainText('1 concepto');
  await review.locator('[data-home-review-link]').click();
  await expect(page).toHaveURL(new RegExp(`${base}/repaso/?$`));
});

test('Review session enforces the four-concept daily budget without creating a debt surface', async ({ page }) => {
  const concepts = [
    'god-as-creator',
    'creation-order-and-purpose',
    'image-of-god',
    'human-stewardship',
    'seventh-day-rest',
    'christ-and-creation',
    'creation-and-new-creation',
  ];
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: reviewKey,
    value: stateFor(concepts),
  });
  await page.goto(`${base}/repaso/`);

  const session = page.locator('[data-review-session]');
  await expect(session).toHaveAttribute('data-due-concept-count', '4');
  const questionCount = Number(await session.getAttribute('data-review-question-count'));
  expect(questionCount).toBeGreaterThan(0);
  expect(questionCount).toBeLessThanOrEqual(4);
  await expect(session.locator('[data-review-check]:not([hidden])')).toBeVisible();
});

test('Correct review evidence expands the interval and Review this point opens the exact Dynamic block', async ({ page }) => {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: reviewKey,
    value: stateFor(['god-as-creator']),
  });
  await page.goto(`${base}/repaso/`);

  const card = page.locator('[data-review-check]:not([hidden])');
  await card.locator('[data-review-option][data-is-correct="true"]').click();
  await expect(card).toHaveAttribute('data-result', 'correct');

  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), reviewKey);
  expect(stored.concepts['god-as-creator'].intervalDays).toBe(3);
  expect(stored.concepts['god-as-creator'].reviewCount).toBe(1);
  expect(stored.concepts['god-as-creator'].dueOn > dueDate).toBeTruthy();

  const source = card.locator('.review-actions a');
  const href = await source.getAttribute('href');
  expect(href).toContain('presentation=dynamic');
  expect(href).toContain('block=');
  const target = new URL(href!, 'http://localhost');
  const blockKey = target.searchParams.get('block');
  await source.click();

  await expect(page.locator('[data-presentation-button="dynamic"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-dynamic-block]:not([hidden])')).toHaveAttribute('data-block-key', blockKey!);
});

test('Review today keeps the same concept identity with English-localized learning content', async ({ page }) => {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: reviewKey,
    value: stateFor(['god-as-creator']),
  });
  await page.goto(`${base}/en/review/`);

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'Review today' })).toBeVisible();
  const card = page.locator('[data-review-check]:not([hidden])');
  await expect(card.locator('[data-review-concept-id="god-as-creator"]')).toContainText('God as Creator');
  await expect(card.getByRole('button')).toHaveCount(4);
});
