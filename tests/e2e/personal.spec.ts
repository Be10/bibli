import { test, expect } from '@playwright/test';

const base = '/bibli';
const lessonUrl = `${base}/lecciones/pentateuco-leccion-001-genesis-1-1-a-2-3/`;
const progressKey = 'bibli-learning-progress-v1';

test('Lesson progress migrates legacy local state and survives reload', async ({ page }) => {
  await page.goto(`${base}/`);
  await page.evaluate((key) => {
    localStorage.setItem(key, JSON.stringify({ completed: [], lastLessonByRoute: {} }));
  }, progressKey);

  await page.goto(lessonUrl);
  const shell = page.locator('[data-learning-shell]');
  await expect(shell).toHaveAttribute('data-progress-ready', 'true');

  const lessonId = await shell.getAttribute('data-lesson-id');
  const routeId = await shell.getAttribute('data-route-id');
  expect(lessonId).toBeTruthy();
  expect(routeId).toBeTruthy();

  const migrated = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), progressKey);
  expect(migrated.schemaVersion).toBe(1);
  expect(migrated.completed).toEqual([]);
  expect(migrated.readBibleChapters).toEqual([]);
  expect(migrated.lastLessonByRoute[routeId!]).toBe(lessonId);
  expect(typeof migrated.updatedAt).toBe('string');

  const completeButton = page.locator('[data-complete-lesson]');
  await expect(completeButton).toHaveAttribute('aria-pressed', 'false');
  await completeButton.click();
  await expect(completeButton).toHaveAttribute('aria-pressed', 'true');

  const completed = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), progressKey);
  expect(completed.schemaVersion).toBe(1);
  expect(completed.completed).toContain(lessonId);

  await page.reload();
  await expect(page.locator('[data-complete-lesson]')).toHaveAttribute('aria-pressed', 'true');
});


test('Reading history powers language-safe continue cards and keeps the latest anchor', async ({ page }) => {
  const historyKey = 'bibli-history-v1';
  const esChapter = `${base}/es/biblia/rvr1960/gen/1/`;
  const enChapter = `${base}/en/bible/kjv/gen/1/`;

  await page.goto(`${base}/`);
  await page.evaluate((key) => localStorage.removeItem(key), historyKey);

  await page.goto(`${esChapter}#v2`);
  let history = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), historyKey);
  expect(history.schemaVersion).toBe(1);
  expect(history.items[0].contentType).toBe('bible-chapter');
  expect(history.items[0].lang).toBe('es');
  expect(history.items[0].href).toBe(`${esChapter}#v2`);

  await page.goto(`${base}/`);
  const esContinue = page.locator('[data-personal-continue][data-personal-lang="es"]');
  await expect(esContinue).toBeVisible();
  await expect(esContinue.locator('[data-personal-continue-link]')).toHaveAttribute('href', `${esChapter}#v2`);

  await page.goto(`${enChapter}#v3`);
  history = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), historyKey);
  expect(history.items[0].lang).toBe('en');
  expect(history.items[0].href).toBe(`${enChapter}#v3`);

  await page.goto(`${base}/en/`);
  const enContinue = page.locator('[data-personal-continue][data-personal-lang="en"]');
  await expect(enContinue).toBeVisible();
  await expect(enContinue.locator('[data-personal-continue-link]')).toHaveAttribute('href', `${enChapter}#v3`);

  await page.goto(`${esChapter}#v4`);
  history = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), historyKey);
  const spanishGenesisEntries = history.items.filter((item: { contentKey?: string; lang?: string }) =>
    item.contentKey === 'bible-chapter:es:rvr1960:gen:1' && item.lang === 'es'
  );
  expect(spanishGenesisEntries).toHaveLength(1);
  expect(spanishGenesisEntries[0].href).toBe(`${esChapter}#v4`);
});


test('Bookmarks and notes persist, update and delete on Spanish content', async ({ page }) => {
  const bookmarksKey = 'bibli-bookmarks-v1';
  const notesKey = 'bibli-notes-v1';

  await page.goto(lessonUrl);
  await page.evaluate(({ bookmarksKey, notesKey }) => {
    localStorage.removeItem(bookmarksKey);
    localStorage.removeItem(notesKey);
  }, { bookmarksKey, notesKey });
  await page.reload();

  const actions = page.locator('[data-personal-actions]');
  const bookmark = page.locator('[data-personal-bookmark]');
  const noteToggle = page.locator('[data-personal-note-toggle]');
  const noteInput = page.locator('[data-personal-note-input]');

  await expect(actions).toBeVisible();
  await expect(bookmark).toHaveAttribute('aria-pressed', 'false');
  await bookmark.click();
  await expect(bookmark).toHaveAttribute('aria-pressed', 'true');

  let bookmarks = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), bookmarksKey);
  expect(bookmarks.schemaVersion).toBe(1);
  expect(bookmarks.items).toHaveLength(1);
  expect(bookmarks.items[0].contentType).toBe('lesson');
  expect(bookmarks.items[0].lang).toBe('es');

  await noteToggle.click();
  await expect(page.locator('[data-personal-note-panel]')).toBeVisible();
  await noteInput.fill('Recordar la relación entre creación y reposo.');
  await page.locator('[data-personal-note-save]').click();

  let notes = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), notesKey);
  expect(notes.schemaVersion).toBe(1);
  expect(notes.items).toHaveLength(1);
  expect(notes.items[0].text).toBe('Recordar la relación entre creación y reposo.');

  await page.reload();
  await expect(bookmark).toHaveAttribute('aria-pressed', 'true');
  await noteToggle.click();
  await expect(noteInput).toHaveValue('Recordar la relación entre creación y reposo.');
  await noteInput.fill('Nota actualizada.');
  await page.locator('[data-personal-note-save]').click();

  notes = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), notesKey);
  expect(notes.items).toHaveLength(1);
  expect(notes.items[0].text).toBe('Nota actualizada.');

  await noteToggle.click();
  await page.locator('[data-personal-note-delete]').click();
  notes = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), notesKey);
  expect(notes.items).toHaveLength(0);

  await bookmark.click();
  bookmarks = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), bookmarksKey);
  expect(bookmarks.items).toHaveLength(0);
});


test('Non-Bible content keeps Bible reading progress action hidden', async ({ page }) => {
  await page.goto(`${base}/glosario/abraham/`);

  const actions = page.locator('[data-personal-actions]');
  const readButton = page.locator('[data-personal-bible-read]');
  await expect(actions).toBeVisible();
  await expect(page.locator('[data-personal-bookmark]')).toBeVisible();
  await expect(page.locator('[data-personal-note-toggle]')).toBeVisible();
  await expect(readButton).toBeHidden();
  await expect(readButton).toHaveAttribute('hidden', '');
});


test('Personal actions keep English Bible content language-safe', async ({ page }) => {
  const bookmarksKey = 'bibli-bookmarks-v1';
  const notesKey = 'bibli-notes-v1';
  const chapterUrl = `${base}/en/bible/kjv/gen/1/#v3`;

  await page.goto(chapterUrl);
  await page.evaluate(({ bookmarksKey, notesKey }) => {
    localStorage.removeItem(bookmarksKey);
    localStorage.removeItem(notesKey);
  }, { bookmarksKey, notesKey });
  await page.reload();

  const actions = page.locator('[data-personal-actions]');
  await expect(actions).toBeVisible();
  await expect(page.locator('[data-personal-bookmark-label]')).toHaveText('Save');

  await page.locator('[data-personal-bookmark]').click();
  await page.locator('[data-personal-note-toggle]').click();
  await expect(page.locator('[data-personal-note-input]')).toHaveAttribute('aria-label', 'Personal note');
  await page.locator('[data-personal-note-input]').fill('Follow the creation sequence.');
  await page.locator('[data-personal-note-save]').click();

  const state = await page.evaluate(({ bookmarksKey, notesKey }) => ({
    bookmarks: JSON.parse(localStorage.getItem(bookmarksKey) || '{}'),
    notes: JSON.parse(localStorage.getItem(notesKey) || '{}'),
  }), { bookmarksKey, notesKey });

  expect(state.bookmarks.items).toHaveLength(1);
  expect(state.bookmarks.items[0].lang).toBe('en');
  expect(state.bookmarks.items[0].contentType).toBe('bible-chapter');
  expect(state.bookmarks.items[0].href).toContain('/en/bible/kjv/gen/1/');
  expect(state.notes.items).toHaveLength(1);
  expect(state.notes.items[0].lang).toBe('en');
  expect(state.notes.items[0].text).toBe('Follow the creation sequence.');
});



test('My Bibli aggregates personal state and keeps destructive actions in sync', async ({ page }) => {
  const bookmarksKey = 'bibli-bookmarks-v1';
  const notesKey = 'bibli-notes-v1';
  const historyKey = 'bibli-history-v1';
  const progressKey = 'bibli-learning-progress-v1';

  await page.goto(lessonUrl);
  await page.evaluate(({ bookmarksKey, notesKey, historyKey, progressKey }) => {
    localStorage.removeItem(bookmarksKey);
    localStorage.removeItem(notesKey);
    localStorage.removeItem(historyKey);
    localStorage.removeItem(progressKey);
  }, { bookmarksKey, notesKey, historyKey, progressKey });
  await page.reload();

  await page.locator('[data-personal-bookmark]').click();
  await page.locator('[data-personal-note-toggle]').click();
  await page.locator('[data-personal-note-input]').fill('Nota visible desde Mi Bibli.');
  await page.locator('[data-personal-note-save]').click();
  await page.locator('[data-complete-lesson]').click();

  await page.goto(`${base}/es/biblia/rvr1960/gen/1/#v4`);
  await page.goto(`${base}/mi-bibli/`);

  await expect(page.getByRole('heading', { name: 'Mi Bibli', level: 1 })).toBeVisible();
  const dashboard = page.locator('[data-personal-dashboard][data-personal-lang="es"]');
  await expect(dashboard).toBeVisible();
  await expect(dashboard.locator('[data-personal-stat="bookmarks"]')).toHaveText('1');
  await expect(dashboard.locator('[data-personal-stat="notes"]')).toHaveText('1');
  await expect(dashboard.locator('[data-personal-stat="history"]')).not.toHaveText('0');
  await expect(dashboard.locator('[data-personal-stat="completed"]')).toHaveText('1');
  await expect(dashboard.getByText('Nota visible desde Mi Bibli.')).toBeVisible();
  const activity = dashboard.locator('[data-personal-activity-list]');
  await expect(activity).toContainText('Visitado');
  await expect(activity).toContainText('Guardado');
  await expect(activity).toContainText('Nota actualizada');
  await expect(activity).toContainText('Progreso actualizado');
  await expect(dashboard.locator('[data-study-route-progress-list]')).toContainText('De la Creación al Pacto');
  await expect(dashboard.locator('[data-study-book-progress-list]')).toContainText('Génesis');
  await expect(dashboard.getByRole('link', { name: /Administrar descargas/ })).toHaveAttribute('href', `${base}/descargar/`);

  await dashboard.getByRole('button', { name: 'Quitar' }).click();
  await expect(dashboard.locator('[data-personal-stat="bookmarks"]')).toHaveText('0');
  let bookmarks = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), bookmarksKey);
  expect(bookmarks.items).toHaveLength(0);

  await dashboard.getByRole('button', { name: 'Eliminar nota' }).click();
  await expect(dashboard.locator('[data-personal-stat="notes"]')).toHaveText('0');
  let notes = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), notesKey);
  expect(notes.items).toHaveLength(0);

  await dashboard.getByRole('button', { name: 'Limpiar historial' }).click();
  await expect(dashboard.locator('[data-personal-stat="history"]')).toHaveText('0');
  const history = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), historyKey);
  expect(history.items.filter((item: { lang?: string }) => item.lang === 'es')).toHaveLength(0);
});

test('My Bibli has an English equivalent and does not mix Spanish personal content', async ({ page }) => {
  const bookmarksKey = 'bibli-bookmarks-v1';
  const spanishBookmark = {
    schemaVersion: 1,
    items: [{
      id: 'bookmark:es:lesson:demo',
      contentKey: 'lesson:demo',
      href: `${base}/lecciones/demo/`,
      title: 'Contenido español',
      contentType: 'lesson',
      lang: 'es',
      createdAt: new Date().toISOString(),
    }],
  };

  await page.goto(`${base}/en/my-bibli/`);
  await page.evaluate(({ bookmarksKey, spanishBookmark }) => {
    localStorage.setItem(bookmarksKey, JSON.stringify(spanishBookmark));
  }, { bookmarksKey, spanishBookmark });
  await page.reload();

  await expect(page.getByRole('heading', { name: 'My Bibli', level: 1 })).toBeVisible();
  const dashboard = page.locator('[data-personal-dashboard][data-personal-lang="en"]');
  await expect(dashboard.locator('[data-personal-stat="bookmarks"]')).toHaveText('0');
  await expect(dashboard.getByText('You have no saved items yet.')).toBeVisible();
  await expect(dashboard.locator('[data-personal-activity-list]')).not.toContainText('Contenido español');
  await expect(dashboard.getByRole('link', { name: /Manage downloads/ })).toHaveAttribute('href', `${base}/en/download/`);

  const languageSwitch = page.locator('[data-language-switch]');
  const languageTarget = await languageSwitch.evaluate((element) =>
    new URL((element as HTMLAnchorElement).href).pathname,
  );
  expect(languageTarget).toBe(`${base}/mi-bibli/`);
  await expect(languageSwitch).toHaveAttribute('data-language-mode', 'equivalent');
});


test('Bible reading progress is explicit and aggregates by version and book', async ({ page }) => {
  const chapterUrl = `${base}/es/biblia/rvr1960/gen/1/`;

  await page.goto(chapterUrl);
  await page.evaluate((key) => localStorage.removeItem(key), progressKey);
  await page.reload();

  const readButton = page.locator('[data-personal-bible-read]');
  await expect(readButton).toBeVisible();
  await expect(readButton).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-personal-bible-read-label]')).toHaveText('Marcar capítulo leído');
  await readButton.click();
  await expect(readButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-personal-bible-read-label]')).toHaveText('Capítulo leído');

  let progress = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), progressKey);
  expect(progress.schemaVersion).toBe(1);
  expect(progress.readBibleChapters).toContain('bible-chapter:es:rvr1960:gen:1');

  await page.goto(`${base}/mi-bibli/`);
  const bibleProgress = page.locator('[data-personal-bible-progress]');
  await expect(bibleProgress.locator('[data-personal-bible-stat="chapters"]')).toHaveText('1');
  await expect(bibleProgress.locator('[data-personal-bible-stat="books"]')).toHaveText('1');
  await expect(bibleProgress).toContainText('Reina-Valera 1960');
  await expect(bibleProgress).toContainText('Génesis');
  await expect(bibleProgress).toContainText('1/50 capítulos');

  await page.goto(chapterUrl);
  await expect(readButton).toHaveAttribute('aria-pressed', 'true');
  await readButton.click();
  progress = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), progressKey);
  expect(progress.readBibleChapters).toEqual([]);
});
