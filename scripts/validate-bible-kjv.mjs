import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

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

const ALLOWED_RVR_ONLY_POSITIONS = new Set([
  "19:47:10", // Salmos 47:10
  "64:1:15",  // 3 Juan 1:15
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

function fail(message) {
  console.error("");
  console.error(`❌ ${message}`);
  console.error("");
  process.exit(1);
}

function ok(message) {
  console.log(`✓ ${message}`);
}

function positionKey(bookOrder, chapter, verse) {
  return `${bookOrder}:${chapter}:${verse}`;
}

function normalizeKjvText(rawText, reference) {
  if (typeof rawText !== "string") {
    fail(`${reference}: el texto no es string.`);
  }

  let text = rawText;

  //
  // 1. Marcador de inicio de párrafo.
  //
  // La fuente usa "# " al principio del versículo.
  //

  if (text.startsWith("# ")) {
    text = text.slice(2);
  } else if (text.startsWith("#")) {
    fail(
      `${reference}: se encontró un marcador # en un formato inesperado.`
    );
  }

  //
  // 2. Palabras tradicionalmente impresas en cursiva.
  //
  // [was] → was
  //
  // Solo eliminamos los corchetes.
  // No modificamos el contenido interior.
  //

  text = text.replace(/\[([^\[\]]+)\]/g, "$1");

  //
  // 3. Ningún marcador editorial debería quedar.
  //

  if (text.includes("#")) {
    fail(
      `${reference}: quedó un carácter # inesperado después de normalizar.`
    );
  }

  if (text.includes("[") || text.includes("]")) {
    fail(
      `${reference}: quedaron corchetes editoriales sin procesar.`
    );
  }

  if (text.length === 0) {
    fail(`${reference}: texto vacío después de normalizar.`);
  }

  return text;
}

function parseReference(reference) {
  const match = reference.match(
    /^(.+)\s+(\d+):(\d+)$/
  );

  if (!match) {
    fail(
      `Referencia inválida en la fuente: ${reference}`
    );
  }

  const [, sourceBookName, chapterRaw, verseRaw] = match;

  const bookName =
    SOURCE_BOOK_ALIASES.get(sourceBookName) ??
    sourceBookName;

  const chapterNumber = Number(chapterRaw);
  const verseNumber = Number(verseRaw);

  if (
    !Number.isInteger(chapterNumber) ||
    chapterNumber < 1 ||
    !Number.isInteger(verseNumber) ||
    verseNumber < 1
  ) {
    fail(
      `Referencia inválida en la fuente: ${reference}`
    );
  }

  const bookIndex = SOURCE_BOOKS.indexOf(bookName);

  if (bookIndex === -1) {
    fail(
      `Libro desconocido en la fuente: ${bookName}`
    );
  }

  return {
    bookName,
    bookOrder: bookIndex + 1,
    chapterNumber,
    verseNumber,
  };
}

console.log("");
console.log("========================================");
console.log(" Validador KJV para Bibli");
console.log(" Fuente: KJV 1769 JSON");
console.log("========================================");
console.log("");

//
// 1. Verificar archivos
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

//
// 2. Leer JSON
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
    "La raíz de verses-1769.json no tiene el formato esperado."
  );
}

const entries = Object.entries(source);

console.log("Fuente:");
console.log(
  "  Archivo: data/import/kjv-study/json/verses-1769.json"
);
console.log(
  `  Entradas: ${entries.length}`
);
console.log("");

if (entries.length !== EXPECTED.verses) {
  fail(
    `La fuente contiene ${entries.length} entradas; se esperaban ${EXPECTED.verses}.`
  );
}

ok("La fuente contiene exactamente 31.102 entradas.");

//
// 3. Abrir SQLite en modo lectura
//

const db = new Database(dbPath, {
  readonly: true,
});

try {
  //
  // 4. Verificar RVR1960
  //

  const rvrVersion = db
    .prepare(`
      SELECT
        id,
        name,
        abbreviation,
        language
      FROM bible_versions
      WHERE id = ?
    `)
    .get("rvr1960");

  if (!rvrVersion) {
    fail(
      "No existe rvr1960 en bible_versions."
    );
  }

  ok(
    `Versión de referencia encontrada: ${rvrVersion.name} (${rvrVersion.abbreviation}).`
  );

  //
  // 5. Libros canónicos de Bibli
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
    const expectedOrder = index + 1;

    if (
      bibliBooks[index].order_number !== expectedOrder
    ) {
      fail(
        `Orden canónico incorrecto en books: se esperaba ${expectedOrder} y apareció ${bibliBooks[index].order_number}.`
      );
    }
  }

  ok("Bibli contiene 66 libros con order_number 1–66.");

  //
  // 6. Comprobar RVR1960
  //

  const rvrStats = db
    .prepare(`
      SELECT
        COUNT(*) AS verses,
        COUNT(DISTINCT book_id) AS books
      FROM bible_verses
      WHERE version_id = ?
    `)
    .get("rvr1960");

  const rvrChapterStats = db
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
    .get("rvr1960");

  console.log("");
  console.log("RVR1960 actualmente cargada en Bibli:");
  console.log(`  Libros:      ${rvrStats.books}`);
  console.log(`  Capítulos:   ${rvrChapterStats.chapters}`);
  console.log(`  Versículos:  ${rvrStats.verses}`);
  console.log("");

  if (rvrStats.books !== EXPECTED.books) {
    fail(
      `RVR1960 contiene ${rvrStats.books} libros; se esperaban ${EXPECTED.books}.`
    );
  }

  if (
    rvrChapterStats.chapters !==
    EXPECTED.chapters
  ) {
    fail(
      `RVR1960 contiene ${rvrChapterStats.chapters} capítulos; se esperaban ${EXPECTED.chapters}.`
    );
  }

  console.log(
    `ℹ RVR1960 contiene ${rvrStats.verses} registros de versículo.`
  );

  //
  // 7. Posiciones RVR1960
  //

  const rvrRows = db
    .prepare(`
      SELECT
        b.order_number,
        b.name AS book_name,
        bv.chapter_number,
        bv.verse_number
      FROM bible_verses bv
      JOIN books b
        ON b.id = bv.book_id
      WHERE bv.version_id = ?
      ORDER BY
        b.order_number,
        bv.chapter_number,
        bv.verse_number
    `)
    .all("rvr1960");

  const rvrPositions = new Map();

  for (const row of rvrRows) {
    const key = positionKey(
      row.order_number,
      row.chapter_number,
      row.verse_number
    );

    if (rvrPositions.has(key)) {
      fail(
        `Posición duplicada en RVR1960: ${row.book_name} ${row.chapter_number}:${row.verse_number}`
      );
    }

    rvrPositions.set(key, row);
  }

  //
  // 8. Procesar nueva KJV
  //

  console.log("");
  console.log("Validando nueva fuente KJV...");
  console.log("");

  const kjvPositions = new Map();
  const bookSet = new Set();
  const chapterSet = new Set();

  const chapterVerses = new Map();

  let paragraphMarkers = 0;
  let bracketedSegments = 0;

  let replacementCharacterCount = 0;
  let bomCount = 0;
  let zeroWidthCount = 0;
  let controlCharacterCount = 0;
  let tabCount = 0;
  let newlineCount = 0;
  let carriageReturnCount = 0;
  let nbspCount = 0;
  let htmlCount = 0;
  let htmlEntityCount = 0;
  let leadingWhitespaceCount = 0;
  let trailingWhitespaceCount = 0;
  let repeatedSpaceCount = 0;

  const normalizedRows = [];

  for (const [reference, rawText] of entries) {
    const parsed = parseReference(reference);

    const {
      bookName,
      bookOrder,
      chapterNumber,
      verseNumber,
    } = parsed;

    const bibliBook =
      bibliBooks[bookOrder - 1];

    if (!bibliBook) {
      fail(
        `${reference}: no existe libro canónico correspondiente en Bibli.`
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

    const text = normalizeKjvText(
      rawText,
      reference
    );

    //
    // Auditoría textual del resultado que se importaría
    //

    if (text.includes("\uFFFD")) {
      replacementCharacterCount += 1;
    }

    if (text.includes("\uFEFF")) {
      bomCount += 1;
    }

    if (
      /[\u200B\u200C\u200D\u2060]/u.test(text)
    ) {
      zeroWidthCount += 1;
    }

    if (
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u.test(
        text
      )
    ) {
      controlCharacterCount += 1;
    }

    if (text.includes("\t")) {
      tabCount += 1;
    }

    if (text.includes("\n")) {
      newlineCount += 1;
    }

    if (text.includes("\r")) {
      carriageReturnCount += 1;
    }

    if (text.includes("\u00A0")) {
      nbspCount += 1;
    }

    if (/<[^>]+>/u.test(text)) {
      htmlCount += 1;
    }

    if (
      /&(?:#\d+|#x[0-9A-Fa-f]+|[A-Za-z][A-Za-z0-9]+);/u.test(
        text
      )
    ) {
      htmlEntityCount += 1;
    }

    if (/^\s/u.test(text)) {
      leadingWhitespaceCount += 1;
    }

    if (/\s$/u.test(text)) {
      trailingWhitespaceCount += 1;
    }

    if (/ {2,}/u.test(text)) {
      repeatedSpaceCount += 1;
    }

    //
    // Registrar posiciones
    //

    const key = positionKey(
      bookOrder,
      chapterNumber,
      verseNumber
    );

    if (kjvPositions.has(key)) {
      fail(
        `Posición duplicada en KJV: ${reference}`
      );
    }

    kjvPositions.set(key, {
      source_book_name: bookName,
      bibli_book_id: bibliBook.id,
      bibli_book_name: bibliBook.name,
      chapter_number: chapterNumber,
      verse_number: verseNumber,
      verse_text: text,
    });

    bookSet.add(bookOrder);

    const chapterKey =
      `${bookOrder}:${chapterNumber}`;

    chapterSet.add(chapterKey);

    if (!chapterVerses.has(chapterKey)) {
      chapterVerses.set(
        chapterKey,
        []
      );
    }

    chapterVerses
      .get(chapterKey)
      .push(verseNumber);

    normalizedRows.push({
      reference,
      bookOrder,
      chapterNumber,
      verseNumber,
      text,
    });
  }

  //
  // 9. Totales reales
  //

  console.log("Totales calculados:");
  console.log(
    `  Libros:      ${bookSet.size}`
  );
  console.log(
    `  Capítulos:   ${chapterSet.size}`
  );
  console.log(
    `  Versículos:  ${kjvPositions.size}`
  );
  console.log("");

  if (bookSet.size !== EXPECTED.books) {
    fail(
      `Se encontraron ${bookSet.size} libros; se esperaban ${EXPECTED.books}.`
    );
  }

  if (
    chapterSet.size !== EXPECTED.chapters
  ) {
    fail(
      `Se encontraron ${chapterSet.size} capítulos; se esperaban ${EXPECTED.chapters}.`
    );
  }

  if (
    kjvPositions.size !== EXPECTED.verses
  ) {
    fail(
      `Se encontraron ${kjvPositions.size} versículos; se esperaban ${EXPECTED.verses}.`
    );
  }

  ok(
    "La nueva fuente contiene exactamente 66 / 1189 / 31102."
  );

  //
  // 10. Comprobar continuidad de capítulos
  //

  for (
    let bookOrder = 1;
    bookOrder <= EXPECTED.books;
    bookOrder += 1
  ) {
    const chapterNumbers = Array.from(
      chapterSet
    )
      .filter((key) =>
        key.startsWith(`${bookOrder}:`)
      )
      .map((key) =>
        Number(key.split(":")[1])
      )
      .sort((a, b) => a - b);

    for (
      let index = 0;
      index < chapterNumbers.length;
      index += 1
    ) {
      const expectedChapter =
        index + 1;

      if (
        chapterNumbers[index] !==
        expectedChapter
      ) {
        fail(
          `${SOURCE_BOOKS[bookOrder - 1]}: capítulos no consecutivos. Se esperaba ${expectedChapter} y apareció ${chapterNumbers[index]}.`
        );
      }
    }
  }

  ok(
    "Los capítulos son consecutivos dentro de cada libro."
  );

  //
  // 11. Comprobar continuidad de versículos
  //

  for (
    const [chapterKey, verses]
    of chapterVerses
  ) {
    const sorted =
      [...verses].sort((a, b) => a - b);

    const [
      bookOrderRaw,
      chapterNumberRaw,
    ] = chapterKey.split(":");

    const bookOrder =
      Number(bookOrderRaw);

    const chapterNumber =
      Number(chapterNumberRaw);

    for (
      let index = 0;
      index < sorted.length;
      index += 1
    ) {
      const expectedVerse =
        index + 1;

      if (
        sorted[index] !== expectedVerse
      ) {
        fail(
          `${SOURCE_BOOKS[bookOrder - 1]} ${chapterNumber}: numeración no consecutiva. Se esperaba ${expectedVerse} y apareció ${sorted[index]}.`
        );
      }
    }
  }

  ok(
    "Los versículos son consecutivos dentro de cada capítulo."
  );

  //
  // 12. Auditoría textual
  //

  console.log("");
  console.log(
    "Auditoría del texto normalizado:"
  );
  console.log(
    `  Marcadores de párrafo eliminados: ${paragraphMarkers}`
  );
  console.log(
    `  Segmentos entre [] normalizados:  ${bracketedSegments}`
  );
  console.log(
    `  U+FFFD:                           ${replacementCharacterCount}`
  );
  console.log(
    `  BOM:                              ${bomCount}`
  );
  console.log(
    `  Zero-width:                       ${zeroWidthCount}`
  );
  console.log(
    `  Caracteres de control:            ${controlCharacterCount}`
  );
  console.log(
    `  Tabs:                             ${tabCount}`
  );
  console.log(
    `  Saltos LF:                        ${newlineCount}`
  );
  console.log(
    `  Retornos CR:                      ${carriageReturnCount}`
  );
  console.log(
    `  NBSP:                             ${nbspCount}`
  );
  console.log(
    `  HTML:                             ${htmlCount}`
  );
  console.log(
    `  Entidades HTML:                   ${htmlEntityCount}`
  );
  console.log(
    `  Espacios iniciales:               ${leadingWhitespaceCount}`
  );
  console.log(
    `  Espacios finales:                 ${trailingWhitespaceCount}`
  );
  console.log(
    `  Espacios repetidos:               ${repeatedSpaceCount}`
  );
  console.log("");

  const criticalTextProblems =
    replacementCharacterCount +
    bomCount +
    zeroWidthCount +
    controlCharacterCount +
    tabCount +
    newlineCount +
    carriageReturnCount +
    nbspCount +
    htmlCount +
    htmlEntityCount +
    leadingWhitespaceCount +
    trailingWhitespaceCount +
    repeatedSpaceCount;

  if (criticalTextProblems > 0) {
    fail(
      `La nueva KJV contiene ${criticalTextProblems} anomalías textuales que requieren revisión.`
    );
  }

  ok(
    "No se detectaron anomalías textuales críticas."
  );

  //
  // 13. Patrones defectuosos conocidos
  //

  const knownBadPatterns = [
    "therehe",
    "child,and",
    "returnunto",
    "praythee",
    "fourhundred",
    "flocksand",
    "callJoshua",
    "allthe ",
    "ofthe ",
    "behold,Esau",
    "himagainst",
    "landof thy",
    "histent",
    "Ifear",
  ];

  const knownBadHits = [];

  for (const row of normalizedRows) {
    for (const pattern of knownBadPatterns) {
      if (row.text.includes(pattern)) {
        knownBadHits.push({
          reference: row.reference,
          pattern,
          text: row.text,
        });
      }
    }
  }

  if (knownBadHits.length > 0) {
    console.error("");
    console.error(
      "❌ Se encontraron patrones de errores conocidos:"
    );

    for (
      const hit
      of knownBadHits.slice(0, 20)
    ) {
      console.error(
        `   ${hit.reference} → ${hit.pattern}`
      );

      console.error(
        `   ${hit.text}`
      );
    }

    fail(
      `Total de patrones defectuosos conocidos: ${knownBadHits.length}.`
    );
  }

  ok(
    "0 patrones defectuosos conocidos."
  );

  //
  // 14. Comparar contra RVR1960
  //

  console.log("");
  console.log(
    "Comparando KJV contra RVR1960..."
  );
  console.log("");

  const missingInKjv = [];
  const allowedDifferences = [];
  const extraInKjv = [];

  for (
    const [key, rvrRow]
    of rvrPositions
  ) {
    if (!kjvPositions.has(key)) {
      if (
        ALLOWED_RVR_ONLY_POSITIONS.has(key)
      ) {
        allowedDifferences.push({
          key,
          ...rvrRow,
        });
      } else {
        missingInKjv.push(rvrRow);
      }
    }
  }

  for (
    const [key, kjvRow]
    of kjvPositions
  ) {
    if (!rvrPositions.has(key)) {
      extraInKjv.push(kjvRow);
    }
  }

  console.log(
    `Diferencias conocidas de versificación: ${allowedDifferences.length}`
  );

  for (const row of allowedDifferences) {
    console.log(
      `  ${row.book_name} ${row.chapter_number}:${row.verse_number}`
    );
  }

  console.log("");

  if (missingInKjv.length > 0) {
    console.error(
      `❌ Diferencias inesperadas: ${missingInKjv.length}`
    );

    for (
      const row
      of missingInKjv.slice(0, 20)
    ) {
      console.error(
        `   ${row.book_name} ${row.chapter_number}:${row.verse_number}`
      );
    }
  } else {
    ok(
      "0 posiciones inesperadamente ausentes en KJV."
    );
  }

  if (extraInKjv.length > 0) {
    console.error(
      `❌ Posiciones adicionales inesperadas en KJV: ${extraInKjv.length}`
    );

    for (
      const row
      of extraInKjv.slice(0, 20)
    ) {
      console.error(
        `   ${row.source_book_name} ${row.chapter_number}:${row.verse_number}`
      );
    }
  } else {
    ok(
      "0 posiciones adicionales inesperadas."
    );
  }

  //
  // 15. Resultado final
  //

  console.log("");

  if (
    allowedDifferences.length !== 2 ||
    missingInKjv.length > 0 ||
    extraInKjv.length > 0
  ) {
    console.error(
      "========================================"
    );
    console.error(
      " RESULTADO: NO APTA PARA IMPORTACIÓN"
    );
    console.error(
      "========================================"
    );
    console.error("");

    process.exitCode = 1;
  } else {
    console.log(
      "========================================"
    );
    console.log(
      " RESULTADO: NUEVA KJV VALIDADA"
    );
    console.log(
      "========================================"
    );
    console.log("");
    console.log("✓ 66 libros");
    console.log("✓ 1.189 capítulos");
    console.log("✓ 31.102 versículos");
    console.log(
      "✓ capítulos consecutivos"
    );
    console.log(
      "✓ versículos consecutivos"
    );
    console.log(
      "✓ 0 anomalías textuales críticas"
    );
    console.log(
      "✓ 0 patrones defectuosos conocidos"
    );
    console.log(
      "✓ 2 diferencias de versificación conocidas"
    );
    console.log(
      "✓ 0 diferencias inesperadas"
    );
    console.log("");
    console.log(
      "La nueva fuente KJV es apta para reemplazar la KJV actualmente cargada en Bibli."
    );
    console.log("");
  }
} finally {
  db.close();
}