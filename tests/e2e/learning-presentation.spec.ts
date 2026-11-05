import { expect, test, type Page } from '@playwright/test';

const base = '/bibli';
const lessonUrl = `${base}/lecciones/pentateuco-leccion-001-genesis-1-1-a-2-3/`;

async function selectStudyPresentation(page: Page, presentation: 'classic' | 'dynamic') {
  const button = page.locator(`[data-presentation-button="${presentation}"]`);
  await expect(button).toBeVisible();
  await button.click();
  await expect(button).toHaveAttribute('aria-selected', 'true');
}


async function advanceDynamicToBlock(page: Page, blockKey: string) {
  const dynamic = page.locator('[data-dynamic-lesson]');
  const active = () => dynamic.locator('[data-dynamic-block]:not([hidden])');
  const next = dynamic.locator('[data-dynamic-next]');

  for (let step = 0; step < 24; step += 1) {
    if ((await active().getAttribute('data-block-key')) === blockKey) return;
    await expect(next).toBeEnabled();
    await next.click();
  }
  throw new Error(`Dynamic block not reached: ${blockKey}`);
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
    localStorage.removeItem('bibli-learning-check-answers-v1:pentateuco-principal--genesis--01-01-02-03--l001');
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


test('Dynamic learning surfaces objectives and contextual glossary without leaving the lesson', async ({ page }) => {
  await page.goto(lessonUrl);
  await selectStudyPresentation(page, 'dynamic');

  const dynamic = page.locator('[data-dynamic-lesson]');
  const objectives = dynamic.locator('[data-learning-objectives]');

  await expect(dynamic).toHaveAttribute('data-objective-count', '3');
  await expect(dynamic).toHaveAttribute('data-glossary-count', '4');
  await expect(objectives).toBeVisible();
  await expect(objectives.locator('[data-learning-objective]')).toHaveCount(3);
  await expect(objectives.locator('[data-learning-objective]').first()).toContainText('Génesis 1:1');

  await dynamic.locator('[data-dynamic-next]').click();
  await expect(objectives).toBeHidden();

  await advanceDynamicToBlock(page, 'exposition-04');
  const blessing = dynamic.locator('[data-glossary-trigger][data-glossary-id="glo-bendicion"]');
  await expect(blessing).toHaveCount(1);
  await expect(blessing).toBeVisible();
  await expect(blessing).toHaveAttribute('aria-expanded', 'false');
  await blessing.click();
  await expect(blessing).toHaveAttribute('aria-expanded', 'true');

  const panel = dynamic.locator('[data-glossary-panel][data-glossary-id="glo-bendicion"]');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('data-placement', /^(above|below)$/);
  await expect(panel).toContainText('Favor de Dios');
  await expect(panel.getByRole('link', { name: 'Ver término completo' })).toHaveAttribute('href', '/bibli/glosario/bendicion');

  const triggerBox = await blessing.boundingBox();
  const panelBox = await panel.boundingBox();
  const placement = await panel.getAttribute('data-placement');
  expect(triggerBox).not.toBeNull();
  expect(panelBox).not.toBeNull();
  if (triggerBox && panelBox && placement === 'below') {
    expect(panelBox.y).toBeGreaterThanOrEqual(triggerBox.y + triggerBox.height - 1);
  } else if (triggerBox && panelBox) {
    expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(triggerBox.y + 1);
  }

  await blessing.press('Escape');
  await expect(panel).toBeHidden();
  await expect(blessing).toBeFocused();

  await advanceDynamicToBlock(page, 'canonical-thread');
  await expect(dynamic.locator('[data-glossary-trigger][data-glossary-id="glo-nueva-creacion"]')).toBeVisible();
});



test('Dynamic interactive blocks render conditional comparison and key idea surfaces', async ({ page }) => {
  await page.goto(lessonUrl);
  await selectStudyPresentation(page, 'dynamic');

  const dynamic = page.locator('[data-dynamic-lesson]');
  const active = () => dynamic.locator('[data-dynamic-block]:not([hidden])');

  await expect(dynamic).toHaveAttribute('data-interactive-count', '2');
  await advanceDynamicToBlock(page, 'exposition-01');

  const comparison = active().locator('[data-learning-interaction][data-interaction-type="comparison"]');
  await expect(comparison).toBeVisible();
  await expect(comparison).toHaveAttribute('data-concept-ids', 'creation-order-and-purpose');
  await expect(comparison).toContainText('Dios forma y luego llena');
  await expect(comparison.locator('[data-comparison-item]')).toHaveCount(2);
  await expect(comparison.locator('[data-comparison-option]')).toHaveCount(2);

  const formControl = comparison.locator('[data-comparison-option][data-item-key="form"]');
  const fillControl = comparison.locator('[data-comparison-option][data-item-key="fill"]');
  await expect(formControl).toHaveAttribute('aria-pressed', 'true');
  await expect(comparison.locator('[data-comparison-item][data-item-key="form"]')).toHaveAttribute('data-selected', 'true');

  await fillControl.click();
  await expect(fillControl).toHaveAttribute('aria-pressed', 'true');
  await expect(formControl).toHaveAttribute('aria-pressed', 'false');
  await expect(comparison.locator('[data-comparison-item][data-item-key="fill"]')).toHaveAttribute('data-selected', 'true');
  await expect(comparison.locator('[data-comparison-item][data-item-key="form"]')).toHaveAttribute('data-selected', 'false');

  await advanceDynamicToBlock(page, 'exposition-05');
  const keyIdea = active().locator('[data-learning-interaction][data-interaction-type="key-idea"]');
  await expect(keyIdea).toBeVisible();
  await expect(keyIdea).toHaveAttribute('data-concept-ids', 'seventh-day-rest,creation-order-and-purpose');
  await expect(keyIdea).toContainText('El reposo es la culminación');
  await expect(keyIdea).toContainText('séptimo día bendecido y santificado');
});

test('Dynamic microchecks give evidence-backed feedback without gating progress', async ({ page }) => {
  await page.goto(lessonUrl);
  await selectStudyPresentation(page, 'dynamic');

  const dynamic = page.locator('[data-dynamic-lesson]');
  const active = () => dynamic.locator('[data-dynamic-block]:not([hidden])');
  const next = dynamic.locator('[data-dynamic-next]');

  await expect(dynamic).toHaveAttribute('data-microcheck-count', '3');
  await advanceDynamicToBlock(page, 'exposition-02');

  const firstCheck = active().locator('[data-microcheck][data-check-id$="--check-01"]');
  await expect(firstCheck).toBeVisible();
  await expect(firstCheck.locator('[data-microcheck-option]')).toHaveCount(4);
  await expect(next).toBeEnabled();

  await firstCheck.locator('[data-microcheck-option][data-option-key="option-b"]').click();
  await expect(firstCheck).toHaveAttribute('data-result', 'incorrect');
  await expect(firstCheck.locator('[data-microcheck-feedback]')).toBeVisible();
  await expect(firstCheck.locator('[data-microcheck-result]')).toContainText('Revisa esta idea');
  await expect(firstCheck.locator('[data-microcheck-evidence]')).toContainText('Génesis 1:1-2');
  await expect(next).toBeEnabled();

  await firstCheck.locator('[data-microcheck-option][data-option-key="option-a"]').click();
  await expect(firstCheck).toHaveAttribute('data-result', 'correct');
  await expect(firstCheck.locator('[data-microcheck-result]')).toContainText('Correcto');

  const review = firstCheck.locator('[data-review-block-key="exposition-01"]');
  await expect(review).toBeVisible();
  await review.click();
  await expect(active()).toHaveAttribute('data-block-key', 'exposition-01');
  await expect(active()).toBeFocused();

  await advanceDynamicToBlock(page, 'exposition-04');
  await expect(active().locator('[data-microcheck][data-check-id$="--check-02"]')).toBeVisible();
});


test('Dynamic learning summary derives concept states from evidence and preserves answered checks', async ({ page }) => {
  await page.goto(lessonUrl);
  await selectStudyPresentation(page, 'dynamic');

  const dynamic = page.locator('[data-dynamic-lesson]');
  const active = () => dynamic.locator('[data-dynamic-block]:not([hidden])');

  await expect(dynamic).toHaveAttribute('data-concept-count', '8');

  await advanceDynamicToBlock(page, 'exposition-02');
  await active().locator('[data-microcheck][data-check-id$="--check-01"] [data-microcheck-option][data-option-key="option-a"]').click();

  await advanceDynamicToBlock(page, 'exposition-04');
  await active().locator('[data-microcheck][data-check-id$="--check-02"] [data-microcheck-option][data-option-key="option-a"]').click();

  await advanceDynamicToBlock(page, 'canonical-thread');
  await active().locator('[data-microcheck][data-check-id$="--check-03"] [data-microcheck-option][data-option-key="option-c"]').click();

  const stored = await page.evaluate(() => localStorage.getItem('bibli-learning-check-answers-v1:pentateuco-principal--genesis--01-01-02-03--l001'));
  expect(stored).not.toBeNull();
  expect(JSON.parse(stored || '{}')).toMatchObject({
    'pentateuco-principal--genesis--01-01-02-03--l001--check-01': 'option-a',
    'pentateuco-principal--genesis--01-01-02-03--l001--check-02': 'option-a',
    'pentateuco-principal--genesis--01-01-02-03--l001--check-03': 'option-c',
  });

  await advanceDynamicToBlock(page, 'prayer');
  const summary = dynamic.locator('[data-learning-summary]');
  await expect(summary).toBeVisible();
  await expect(summary).toHaveAttribute('data-estimate-status', 'ready');
  await expect(summary).toHaveAttribute('data-understanding-estimate', '71');
  await expect(summary.locator('[data-understanding-estimate-value]')).toHaveText('71%');

  const understood = summary.locator('[data-summary-group="understood"]');
  const reinforce = summary.locator('[data-summary-group="reinforce"]');
  const pending = summary.locator('[data-summary-group="pending"]');
  await expect(understood.locator('[data-summary-count]')).toHaveText('5');
  await expect(reinforce.locator('[data-summary-count]')).toHaveText('2');
  await expect(pending.locator('[data-summary-count]')).toHaveText('1');
  await expect(understood).toContainText('Dios como Creador');
  await expect(understood).toContainText('Reposo del séptimo día');
  await expect(reinforce).toContainText('Imagen de Dios');
  await expect(pending).toContainText('Bondad de la creación');

  const imageConcept = reinforce.locator('[data-learning-summary-concept][data-concept-id="image-of-god"]');
  await imageConcept.locator('[data-review-block-key]').click();
  await expect(active()).toHaveAttribute('data-block-key', 'exposition-04');
  await expect(active()).toBeFocused();

  await page.reload();
  await expect(page.locator('[data-presentation-button="dynamic"]')).toHaveAttribute('aria-selected', 'true');
  await advanceDynamicToBlock(page, 'prayer');
  await expect(summary).toBeVisible();
  await expect(summary).toHaveAttribute('data-understanding-estimate', '71');
  await expect(summary.locator('[data-summary-group="reinforce"]')).toContainText('Imagen de Dios');
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
