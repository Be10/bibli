import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dbPath = path.join(process.cwd(), "data", "bibli.sqlite");
const csvPath = path.join(process.cwd(), "data", "import", "rvr1960.csv");

if (!fs.existsSync(dbPath)) {
  console.error("No existe la base de datos. Ejecuta primero: npm run db:reset");
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error("No existe el archivo data/import/rvr1960.csv");
  console.error("Crea ese archivo usando como base data/import/rvr1960.example.csv");
  process.exit(1);
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function slugToIdPart(slug) {
  return slug
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function normalizeVerseText(text) {
  return text
    .replace(/\/n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .trim();
}

const rawCsv = fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
const lines = rawCsv
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

if (lines.length < 2) {
  console.error("El CSV no tiene filas para importar.");
  process.exit(1);
}

const header = parseCsvLine(lines[0]);
const expectedHeader = ["book_slug", "chapter", "verse", "text"];

if (header.join(",") !== expectedHeader.join(",")) {
  console.error("Cabecera invalida.");
  console.error(`Esperada: ${expectedHeader.join(",")}`);
  console.error(`Recibida: ${header.join(",")}`);
  process.exit(1);
}

const db = new Database(dbPath);

const version = db
  .prepare("SELECT id FROM bible_versions WHERE id = ?")
  .get("rvr1960");

if (!version) {
  console.error("No existe la version biblica rvr1960 en bible_versions.");
  console.error("Ejecuta npm run db:reset y verifica seed.sql.");
  db.close();
  process.exit(1);
}

const getBook = db.prepare("SELECT id, slug FROM books WHERE slug = ?");
const getChapter = db.prepare(
  "SELECT id FROM bible_chapters WHERE book_id = ? AND chapter_number = ?"
);

const insertChapter = db.prepare(`
  INSERT INTO bible_chapters (id, book_id, chapter_number)
  VALUES (?, ?, ?)
`);

const deleteExistingVerses = db.prepare(`
  DELETE FROM bible_verses
  WHERE version_id = 'rvr1960'
`);

const insertVerse = db.prepare(`
  INSERT INTO bible_verses (
    id,
    version_id,
    book_id,
    chapter_id,
    chapter_number,
    verse_number,
    verse_text
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const importRows = db.transaction((rows) => {
  deleteExistingVerses.run();

  let importedCount = 0;
  let createdChaptersCount = 0;

  for (const row of rows) {
    const book = getBook.get(row.book_slug);

    if (!book) {
      throw new Error(`Libro no encontrado para slug: ${row.book_slug}`);
    }

    let chapter = getChapter.get(book.id, row.chapter);

    if (!chapter) {
      const chapterId = `chap-${slugToIdPart(row.book_slug)}-${row.chapter}`;
      insertChapter.run(chapterId, book.id, row.chapter);
      chapter = { id: chapterId };
      createdChaptersCount += 1;
    }

    const verseId = `rvr1960-${slugToIdPart(row.book_slug)}-${row.chapter}-${row.verse}`;

    insertVerse.run(
      verseId,
      "rvr1960",
      book.id,
      chapter.id,
      row.chapter,
      row.verse,
      row.text
    );

    importedCount += 1;
  }

  return {
    importedCount,
    createdChaptersCount,
  };
});

const rows = [];

for (let i = 1; i < lines.length; i += 1) {
  const lineNumber = i + 1;
  const values = parseCsvLine(lines[i]);

  if (values.length !== 4) {
    console.error(`Fila ${lineNumber} invalida. Columnas recibidas: ${values.length}`);
    process.exit(1);
  }

  const [bookSlug, chapterRaw, verseRaw, text] = values;

  const chapter = Number(chapterRaw);
  const verse = Number(verseRaw);

  if (!bookSlug) {
    console.error(`Fila ${lineNumber}: book_slug vacio.`);
    process.exit(1);
  }

  if (!Number.isInteger(chapter) || chapter < 1) {
    console.error(`Fila ${lineNumber}: capitulo invalido: ${chapterRaw}`);
    process.exit(1);
  }

  if (!Number.isInteger(verse) || verse < 1) {
    console.error(`Fila ${lineNumber}: versiculo invalido: ${verseRaw}`);
    process.exit(1);
  }

  if (!text || text.trim().length === 0) {
    console.error(`Fila ${lineNumber}: texto vacio.`);
    process.exit(1);
  }

  rows.push({
    book_slug: bookSlug.trim(),
    chapter,
    verse,
    text: normalizeVerseText(text),
  });
}

try {
  const result = importRows(rows);

  const verseCount = db
    .prepare("SELECT COUNT(*) AS count FROM bible_verses WHERE version_id = ?")
    .get("rvr1960");

  db.close();

  console.log("Importacion RVR1960 completada.");
  console.log(`Versiculos importados: ${result.importedCount}`);
  console.log(`Capitulos creados: ${result.createdChaptersCount}`);
  console.log(`Total en base de datos: ${verseCount.count}`);
} catch (error) {
  db.close();
  console.error("Error importando RVR1960:");
  console.error(error.message);
  process.exit(1);
}