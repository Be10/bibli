import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { indexStudies } from "./study-indexer.mjs";

const rootDir = process.cwd();
const dbPath = path.join(rootDir, "data", "bibli.sqlite");
const schemaPath = path.join(rootDir, "data", "schema.sql");
const seedPath = path.join(rootDir, "data", "seed.sql");
const editorialPath = path.join(rootDir, "data", "editorial.sql");
const manifestPath = path.join(rootDir, "content", "studies", "manifest.json");

const EXPECTED = {
  books: 66,
  bookTranslations: 132,
  chapters: 1189,
  rvr1960: 31104,
  kjv: 31102,
};

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function tableRows(db, table) {
  const columns = db
    .prepare(`PRAGMA table_info(${quoteIdentifier(table)})`)
    .all()
    .map((column) => column.name);

  if (columns.length === 0) return [];
  const order = columns.map(quoteIdentifier).join(", ");
  return db.prepare(`SELECT * FROM ${quoteIdentifier(table)} ORDER BY ${order}`).all();
}

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function fail(message) {
  throw new Error(message);
}

if (!fs.existsSync(dbPath)) fail(`No existe ${dbPath}`);
if (!fs.existsSync(editorialPath)) fail(`No existe ${editorialPath}`);
if (!fs.existsSync(manifestPath)) fail(`No existe ${manifestPath}`);

const db = new Database(dbPath, { readonly: true });

try {
  const integrity = db.pragma("integrity_check", { simple: true });
  if (integrity !== "ok") fail(`PRAGMA integrity_check: ${integrity}`);

  const foreignKeyProblems = db.pragma("foreign_key_check");
  if (foreignKeyProblems.length > 0) {
    fail(`PRAGMA foreign_key_check devolvió ${foreignKeyProblems.length} problema(s)`);
  }

  const legacyObjects = db.prepare(`
    SELECT type, name
    FROM sqlite_master
    WHERE name IN ('lesson_bible_refs', 'lesson_points', 'lesson_questions')
  `).all();
  if (legacyObjects.length > 0) {
    fail(`Persisten objetos de lección legados: ${legacyObjects.map((row) => row.name).join(", ")}`);
  }

  for (const required of ["study_lessons", "route_modules", "route_lessons"]) {
    const exists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(required);
    if (!exists) fail(`Falta tabla ${required}`);
  }

  const bookCount = db.prepare("SELECT COUNT(*) AS n FROM books").get().n;
  const translationCount = db.prepare("SELECT COUNT(*) AS n FROM book_translations").get().n;
  const chapterCount = db.prepare("SELECT COUNT(*) AS n FROM bible_chapters").get().n;
  if (bookCount !== EXPECTED.books) fail(`books: ${bookCount}`);
  if (translationCount !== EXPECTED.bookTranslations) fail(`book_translations: ${translationCount}`);
  if (chapterCount !== EXPECTED.chapters) fail(`bible_chapters: ${chapterCount}`);

  const verseCounts = Object.fromEntries(
    db.prepare("SELECT version_id, COUNT(*) AS n FROM bible_verses GROUP BY version_id ORDER BY version_id")
      .all().map((row) => [row.version_id, row.n])
  );
  if (verseCounts.rvr1960 !== EXPECTED.rvr1960) fail(`RVR1960: ${verseCounts.rvr1960}`);
  if (verseCounts.kjv !== EXPECTED.kjv) fail(`KJV: ${verseCounts.kjv}`);

  const languageCounts = Object.fromEntries(
    db.prepare("SELECT language, COUNT(*) AS n FROM book_translations GROUP BY language ORDER BY language")
      .all().map((row) => [row.language, row.n])
  );
  if (languageCounts.es !== 66 || languageCounts.en !== 66) {
    fail(`book_translations por idioma: ${JSON.stringify(languageCounts)}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const studyCount = db.prepare("SELECT COUNT(*) AS n FROM study_lessons").get().n;
  if (studyCount !== manifest.file_count) {
    fail(`study_lessons=${studyCount} pero manifest.file_count=${manifest.file_count}`);
  }

  const sourcePaths = new Set(db.prepare("SELECT source_path FROM study_lessons").all().map((row) => row.source_path));
  for (const file of manifest.files || []) {
    if (!sourcePaths.has(file.path)) fail(`Lección del manifest no indexada: ${file.path}`);
  }

  const duplicatePrimary = db.prepare(`
    SELECT lesson_id, COUNT(*) AS n
    FROM route_lessons
    WHERE is_primary = 1
    GROUP BY lesson_id
    HAVING COUNT(*) <> 1
  `).all();
  if (duplicatePrimary.length > 0) fail(`Lecciones sin ruta primaria única: ${duplicatePrimary.length}`);

  const pendingLicenseMetadata = db.prepare(`
    SELECT id FROM bible_versions
    WHERE lower(
      coalesce(copyright_status, '') || ' ' || coalesce(copyright_notice, '') || ' ' ||
      coalesce(license_notes, '') || ' ' || coalesce(permission_scope, '') || ' ' || coalesce(source_notes, '')
    ) LIKE '%pendiente%'
  `).all();
  if (pendingLicenseMetadata.length > 0) {
    fail(`Metadatos de licencia/copyright pendientes: ${pendingLicenseMetadata.map((row) => row.id).join(", ")}`);
  }

  for (const [bookId, chapter, verse] of [["book-salmos", 47, 10], ["book-3-juan", 1, 15]]) {
    const row = db.prepare(`
      SELECT 1 FROM bible_verses
      WHERE version_id='kjv' AND book_id=? AND chapter_number=? AND verse_number=? LIMIT 1
    `).get(bookId, chapter, verse);
    if (row) fail(`KJV contiene una posición artificial: ${bookId} ${chapter}:${verse}`);
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bibli-db-"));
  const tempDbPath = path.join(tempDir, "editorial.sqlite");
  const expectedDb = new Database(tempDbPath);

  try {
    expectedDb.pragma("foreign_keys = ON");
    expectedDb.exec(fs.readFileSync(schemaPath, "utf8"));
    expectedDb.exec(fs.readFileSync(seedPath, "utf8"));
    expectedDb.exec(fs.readFileSync(editorialPath, "utf8"));

    // Import twice to verify that study indexing is idempotent. This catches
    // stale generated-passage references that only surface on a refresh over
    // an already indexed database.
    indexStudies(expectedDb, { rootDir });
    indexStudies(expectedDb, { rootDir });

    const tables = expectedDb.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all().map((row) => row.name)
      .filter((table) => !["bible_chapters", "bible_verses"].includes(table));

    for (const table of tables) {
      const expectedRows = tableRows(expectedDb, table);
      const actualRows = tableRows(db, table);
      if (digest(expectedRows) !== digest(actualRows)) {
        fail(`La SQLite no coincide con schema + seed + editorial + studies en ${table} ` +
          `(esperado ${expectedRows.length}, actual ${actualRows.length})`);
      }
    }
  } finally {
    expectedDb.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  console.log("Validación de base de datos: PASS");
  console.log(`Libros: ${bookCount}`);
  console.log(`Traducciones de libros: ${translationCount}`);
  console.log(`Capítulos: ${chapterCount}`);
  console.log(`RVR1960: ${verseCounts.rvr1960}`);
  console.log(`KJV: ${verseCounts.kjv}`);
  console.log(`Lecciones canónicas: ${studyCount}`);
} finally {
  db.close();
}
