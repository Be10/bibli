import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";

const VERSION_ID = "kjv";

const EXPECTED = {
  books: 66,
  chapters: 1189,
  verses: 31102,
};

const SOURCE_BOOKS = [
  "Genesis",
  "Exodus",
  "Leviticus",
  "Numbers",
  "Deuteronomy",
  "Joshua",
  "Judges",
  "Ruth",
  "1 Samuel",
  "2 Samuel",
  "1 Kings",
  "2 Kings",
  "1 Chronicles",
  "2 Chronicles",
  "Ezra",
  "Nehemiah",
  "Esther",
  "Job",
  "Psalms",
  "Proverbs",
  "Ecclesiastes",
  "Song of Solomon",
  "Isaiah",
  "Jeremiah",
  "Lamentations",
  "Ezekiel",
  "Daniel",
  "Hosea",
  "Joel",
  "Amos",
  "Obadiah",
  "Jonah",
  "Micah",
  "Nahum",
  "Habakkuk",
  "Zephaniah",
  "Haggai",
  "Zechariah",
  "Malachi",
  "Matthew",
  "Mark",
  "Luke",
  "John",
  "Acts",
  "Romans",
  "1 Corinthians",
  "2 Corinthians",
  "Galatians",
  "Ephesians",
  "Philippians",
  "Colossians",
  "1 Thessalonians",
  "2 Thessalonians",
  "1 Timothy",
  "2 Timothy",
  "Titus",
  "Philemon",
  "Hebrews",
  "James",
  "1 Peter",
  "2 Peter",
  "1 John",
  "2 John",
  "3 John",
  "Jude",
  "Revelation",
];

const SOURCE_BOOK_ALIASES = new Map([
  ["Solomon's Song", "Song of Solomon"],
]);

const dbPath = path.join(
  process.cwd(),
  "data",
  "bibli.sqlite"
);

const sourcePath = path.join(
  process.cwd(),
  "data",
  "import",
  "kjv-study",
  "json",
  "verses-1769.json"
);

const validatorPath = path.join(
  process.cwd(),
  "scripts",
  "validate-bible-kjv.mjs"
);

function fail(message) {
  console.error("");
  console.error(`❌ ${message}`);
  console.error("");
  process.exit(1);
}

function normalizeKjvText(rawText, reference) {
  if (typeof rawText !== "string") {
    fail(`${reference}: el texto no es string.`);
  }

  let text = rawText;

  //
  // Marcador editorial de inicio de párrafo.
  //

  if (text.startsWith("# ")) {
    text = text.slice(2);
  } else if (text.startsWith("#")) {
    fail(
      `${reference}: marcador # con formato inesperado.`
    );
  }

  //
  // Palabras tradicionalmente impresas en cursiva:
  // [am] → am
  //

  text = text.replace(/\[([^\[\]]+)\]/g, "$1");

  //
  // Ningún marcador editorial debe quedar.
  //

  if (text.includes("#")) {
    fail(
      `${reference}: quedó un carácter # inesperado.`
    );
  }

  if (text.includes("[") || text.includes("]")) {
    fail(
      `${reference}: quedaron corchetes editoriales sin procesar.`
    );
  }

  if (text.length === 0) {
    fail(
      `${reference}: texto vacío después de normalizar.`
    );
  }

  return text;
}

function parseReference(reference) {
  const match = reference.match(
    /^(.+)\s+(\d+):(\d+)$/
  );

  if (!match) {
    fail(
      `Referencia inválida: ${reference}`
    );
  }

  const [
    ,
    sourceBookName,
    chapterRaw,
    verseRaw,
  ] = match;

  const bookName =
    SOURCE_BOOK_ALIASES.get(sourceBookName) ??
    sourceBookName;

  const bookIndex =
    SOURCE_BOOKS.indexOf(bookName);

  if (bookIndex === -1) {
    fail(
      `Libro desconocido en la fuente: ${sourceBookName}`
    );
  }

  const chapterNumber = Number(chapterRaw);
  const verseNumber = Number(verseRaw);

  if (
    !Number.isInteger(chapterNumber) ||
    chapterNumber < 1 ||
    !Number.isInteger(verseNumber) ||
    verseNumber < 1
  ) {
    fail(
      `Referencia inválida: ${reference}`
    );
  }

  return {
    sourceBookName,
    bookName,
    bookOrder: bookIndex + 1,
    chapterNumber,
    verseNumber,
  };
}

function makeVerseId(
  bookOrder,
  chapterNumber,
  verseNumber
) {
  return (
    `kjv-${String(bookOrder).padStart(2, "0")}-` +
    `${chapterNumber}-${verseNumber}`
  );
}

console.log("");
console.log("========================================");
console.log(" Importador KJV para Bibli");
console.log(" Fuente: KJV 1769 JSON");
console.log("========================================");
console.log("");

//
// 1. Verificaciones previas
//

if (!fs.existsSync(dbPath)) {
  fail(
    "No existe data/bibli.sqlite."
  );
}

if (!fs.existsSync(sourcePath)) {
  fail(
    "No existe data/import/kjv-study/json/verses-1769.json."
  );
}

if (!fs.existsSync(validatorPath)) {
  fail(
    "No existe scripts/validate-bible-kjv.mjs."
  );
}

//
// 2. Ejecutar el validador completo
//

console.log(
  "Ejecutando validación previa de la nueva KJV..."
);
console.log("");

const validation = spawnSync(
  process.execPath,
  [validatorPath],
  {
    stdio: "inherit",
  }
);

if (validation.error) {
  fail(
    `No se pudo ejecutar el validador: ${validation.error.message}`
  );
}

if (validation.status !== 0) {
  fail(
    "La validación KJV falló. SQLite no será modificado."
  );
}

console.log("");
console.log("✓ Validación previa superada.");
console.log("");

//
// 3. Leer nueva fuente
//

let source;

try {
  source = JSON.parse(
    fs.readFileSync(sourcePath, "utf8")
  );
} catch (error) {
  fail(
    `No se pudo leer verses-1769.json: ${error.message}`
  );
}

if (
  source === null ||
  Array.isArray(source) ||
  typeof source !== "object"
) {
  fail(
    "La raíz del JSON no tiene el formato esperado."
  );
}

const entries = Object.entries(source);

if (entries.length !== EXPECTED.verses) {
  fail(
    `La fuente contiene ${entries.length} entradas; se esperaban ${EXPECTED.verses}.`
  );
}

//
// 4. Abrir SQLite
//

const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

try {
  //
  // 5. Comprobar versión destino
  //

  const version = db
    .prepare(`
      SELECT
        id,
        name,
        abbreviation,
        language
      FROM bible_versions
      WHERE id = ?
    `)
    .get(VERSION_ID);

  if (!version) {
    fail(
      'No existe "kjv" en bible_versions.'
    );
  }

  if (version.language !== "en") {
    fail(
      `La versión kjv tiene language="${version.language}"; se esperaba "en".`
    );
  }

  console.log(
    `Versión destino: ${version.name} (${version.abbreviation})`
  );

  //
  // 6. Libros canónicos reales de Bibli
  //

  const bibliBooks = db
    .prepare(`
      SELECT
        id,
        name,
        slug,
        order_number
      FROM books
      ORDER BY order_number
    `)
    .all();

  if (bibliBooks.length !== EXPECTED.books) {
    fail(
      `Bibli contiene ${bibliBooks.length} libros; se esperaban ${EXPECTED.books}.`
    );
  }

  for (
    let index = 0;
    index < bibliBooks.length;
    index += 1
  ) {
    if (
      bibliBooks[index].order_number !==
      index + 1
    ) {
      fail(
        `order_number inesperado en ${bibliBooks[index].name}.`
      );
    }
  }

  //
  // 7. Verificar capítulos existentes
  //

  const chapterCount = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM bible_chapters
    `)
    .get();

  if (
    chapterCount.count !==
    EXPECTED.chapters
  ) {
    fail(
      `bible_chapters contiene ${chapterCount.count} capítulos; se esperaban ${EXPECTED.chapters}.`
    );
  }

  const getChapter = db.prepare(`
    SELECT id
    FROM bible_chapters
    WHERE book_id = ?
      AND chapter_number = ?
  `);

  //
  // 8. Preparar 31.102 filas SIN modificar SQLite
  //

  console.log("");
  console.log(
    "Preparando nueva KJV..."
  );
  console.log("");

  const preparedRows = [];
  const seenPositions = new Set();
  const seenChapters = new Set();
  const seenBooks = new Set();

  let paragraphMarkers = 0;
  let bracketedSegments = 0;

  for (
    const [reference, rawText]
    of entries
  ) {
    const {
      bookOrder,
      chapterNumber,
      verseNumber,
    } = parseReference(reference);

    const bibliBook =
      bibliBooks[bookOrder - 1];

    if (!bibliBook) {
      fail(
        `${reference}: no existe el libro correspondiente en Bibli.`
      );
    }

    const chapter = getChapter.get(
      bibliBook.id,
      chapterNumber
    );

    if (!chapter) {
      fail(
        `${reference}: no existe bible_chapters para ${bibliBook.name} ${chapterNumber}.`
      );
    }

    if (rawText.startsWith("# ")) {
      paragraphMarkers += 1;
    }

    const bracketMatches =
      rawText.match(/\[[^\[\]]+\]/g);

    if (bracketMatches) {
      bracketedSegments +=
        bracketMatches.length;
    }

    const verseText =
      normalizeKjvText(
        rawText,
        reference
      );

    const positionKey =
      `${bookOrder}:${chapterNumber}:${verseNumber}`;

    if (seenPositions.has(positionKey)) {
      fail(
        `Posición duplicada: ${reference}`
      );
    }

    seenPositions.add(positionKey);
    seenBooks.add(bookOrder);
    seenChapters.add(
      `${bookOrder}:${chapterNumber}`
    );

    preparedRows.push({
      id: makeVerseId(
        bookOrder,
        chapterNumber,
        verseNumber
      ),
      version_id: VERSION_ID,
      book_id: bibliBook.id,
      chapter_id: chapter.id,
      chapter_number: chapterNumber,
      verse_number: verseNumber,
      verse_text: verseText,
    });
  }

  //
  // 9. Última comprobación antes de escribir
  //

  if (
    preparedRows.length !==
    EXPECTED.verses
  ) {
    fail(
      `Se prepararon ${preparedRows.length} versículos; se esperaban ${EXPECTED.verses}.`
    );
  }

  if (
    seenBooks.size !==
    EXPECTED.books
  ) {
    fail(
      `Se prepararon ${seenBooks.size} libros; se esperaban ${EXPECTED.books}.`
    );
  }

  if (
    seenChapters.size !==
    EXPECTED.chapters
  ) {
    fail(
      `Se prepararon ${seenChapters.size} capítulos; se esperaban ${EXPECTED.chapters}.`
    );
  }

  console.log(
    `✓ Libros preparados: ${seenBooks.size}`
  );
  console.log(
    `✓ Capítulos preparados: ${seenChapters.size}`
  );
  console.log(
    `✓ Versículos preparados: ${preparedRows.length}`
  );
  console.log(
    `✓ Marcadores # procesados: ${paragraphMarkers}`
  );
  console.log(
    `✓ Segmentos [] procesados: ${bracketedSegments}`
  );

  //
  // 10. Statements de escritura
  //

  const deleteKjv = db.prepare(`
    DELETE FROM bible_verses
    WHERE version_id = ?
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
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  //
  // 11. Transacción
  //

  const replaceKjv = db.transaction(
    (rows) => {
      const deletion =
        deleteKjv.run(VERSION_ID);

      let inserted = 0;

      for (const row of rows) {
        insertVerse.run(
          row.id,
          row.version_id,
          row.book_id,
          row.chapter_id,
          row.chapter_number,
          row.verse_number,
          row.verse_text
        );

        inserted += 1;
      }

      return {
        deleted: deletion.changes,
        inserted,
      };
    }
  );

  console.log("");
  console.log(
    "Reemplazando KJV dentro de una transacción..."
  );

  const result =
    replaceKjv(preparedRows);

  //
  // 12. Comprobación posterior
  //

  const finalStats = db
    .prepare(`
      SELECT
        COUNT(*) AS verses,
        COUNT(DISTINCT book_id) AS books
      FROM bible_verses
      WHERE version_id = ?
    `)
    .get(VERSION_ID);

  const finalChapterStats = db
    .prepare(`
      SELECT COUNT(*) AS chapters
      FROM (
        SELECT DISTINCT
          book_id,
          chapter_number
        FROM bible_verses
        WHERE version_id = ?
      )
    `)
    .get(VERSION_ID);

  if (
    finalStats.books !== EXPECTED.books ||
    finalChapterStats.chapters !==
      EXPECTED.chapters ||
    finalStats.verses !==
      EXPECTED.verses
  ) {
    throw new Error(
      "La comprobación posterior no coincide con 66 / 1189 / 31102."
    );
  }

  //
  // 13. Comprobar RVR1960 intacta
  //

  const rvrStats = db
    .prepare(`
      SELECT COUNT(*) AS verses
      FROM bible_verses
      WHERE version_id = ?
    `)
    .get("rvr1960");

  if (rvrStats.verses !== 31104) {
    throw new Error(
      `RVR1960 contiene ${rvrStats.verses} versículos después de importar KJV; se esperaban 31104.`
    );
  }

  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    " NUEVA KJV IMPORTADA"
  );
  console.log(
    "========================================"
  );
  console.log("");
  console.log(
    `✓ KJV anterior eliminada: ${result.deleted}`
  );
  console.log(
    `✓ KJV nueva insertada:     ${result.inserted}`
  );
  console.log(
    `✓ Libros KJV:              ${finalStats.books}`
  );
  console.log(
    `✓ Capítulos KJV:           ${finalChapterStats.chapters}`
  );
  console.log(
    `✓ Versículos KJV:          ${finalStats.verses}`
  );
  console.log(
    `✓ Versículos RVR1960:      ${rvrStats.verses}`
  );
  console.log("");
  console.log(
    "La KJV anterior fue reemplazada sin modificar RVR1960."
  );
  console.log("");
} catch (error) {
  console.error("");
  console.error(
    "❌ Error importando la nueva KJV:"
  );
  console.error(error.message);
  console.error("");
  process.exitCode = 1;
} finally {
  db.close();
}