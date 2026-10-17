import Database from "better-sqlite3";
import path from "node:path";

const EXPECTED = {
  books: 66,
  chapters: 1189,
  verses: 31102,
};

const VERSION_ID = "kjv";

const dbPath = path.join(
  process.cwd(),
  "data",
  "bibli.sqlite"
);

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function codePointLabel(char) {
  const codePoint = char.codePointAt(0);

  return `U+${codePoint
    .toString(16)
    .toUpperCase()
    .padStart(4, "0")}`;
}

function hasUnpairedSurrogate(text) {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);

    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(i + 1);

      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        return true;
      }

      i += 1;
      continue;
    }

    if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }

  return false;
}

function addExample(store, category, reference, text) {
  if (!store.has(category)) {
    store.set(category, []);
  }

  const examples = store.get(category);

  if (examples.length < 20) {
    examples.push({
      reference,
      text,
    });
  }
}

function addCharacter(characterStats, char, reference) {
  const key = char.codePointAt(0);

  if (!characterStats.has(key)) {
    characterStats.set(key, {
      char,
      count: 0,
      examples: [],
    });
  }

  const entry = characterStats.get(key);

  entry.count += 1;

  if (
    entry.examples.length < 5 &&
    !entry.examples.includes(reference)
  ) {
    entry.examples.push(reference);
  }
}

console.log("");
console.log("========================================");
console.log(" Auditoría de texto KJV en SQLite");
console.log("========================================");
console.log("");

const db = new Database(dbPath, {
  readonly: true,
});

try {
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
    fail('No existe la versión "kjv" en bible_versions.');
  }

  console.log(
    `Versión: ${version.name} (${version.abbreviation})`
  );
  console.log("");

  const stats = db
    .prepare(`
      SELECT
        COUNT(*) AS verses,
        COUNT(DISTINCT book_id) AS books
      FROM bible_verses
      WHERE version_id = ?
    `)
    .get(VERSION_ID);

  const chapterStats = db
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

  console.log("Estructura:");
  console.log(`  Libros:      ${stats.books}`);
  console.log(`  Capítulos:   ${chapterStats.chapters}`);
  console.log(`  Versículos:  ${stats.verses}`);
  console.log("");

  if (stats.books !== EXPECTED.books) {
    fail(
      `Se esperaban ${EXPECTED.books} libros y se encontraron ${stats.books}.`
    );
  }

  if (chapterStats.chapters !== EXPECTED.chapters) {
    fail(
      `Se esperaban ${EXPECTED.chapters} capítulos y se encontraron ${chapterStats.chapters}.`
    );
  }

  if (stats.verses !== EXPECTED.verses) {
    fail(
      `Se esperaban ${EXPECTED.verses} versículos y se encontraron ${stats.verses}.`
    );
  }

  const verses = db
    .prepare(`
      SELECT
        b.order_number,
        b.name AS book_name,
        bv.chapter_number,
        bv.verse_number,
        bv.verse_text
      FROM bible_verses bv
      JOIN books b
        ON b.id = bv.book_id
      WHERE bv.version_id = ?
      ORDER BY
        b.order_number,
        bv.chapter_number,
        bv.verse_number
    `)
    .all(VERSION_ID);

  const suspiciousExamples = new Map();
  const characterStats = new Map();

  let emptyTextCount = 0;
  let replacementCharacterCount = 0;
  let bomCount = 0;
  let zeroWidthCount = 0;
  let controlCharacterCount = 0;
  let tabCount = 0;
  let newlineCount = 0;
  let carriageReturnCount = 0;
  let nbspCount = 0;
  let softHyphenCount = 0;
  let bidiControlCount = 0;
  let privateUseCount = 0;
  let unpairedSurrogateCount = 0;
  let htmlTagCount = 0;
  let htmlEntityCount = 0;
  let leadingWhitespaceCount = 0;
  let trailingWhitespaceCount = 0;
  let repeatedSpaceCount = 0;

  console.log("Revisando textos...");
  console.log("");

  for (const row of verses) {
    const text = row.verse_text;

    const reference =
      `${row.book_name} ${row.chapter_number}:${row.verse_number}`;

    if (
      typeof text !== "string" ||
      text.length === 0
    ) {
      emptyTextCount += 1;

      addExample(
        suspiciousExamples,
        "Texto vacío",
        reference,
        String(text)
      );

      continue;
    }

    for (const char of text) {
      addCharacter(
        characterStats,
        char,
        reference
      );
    }

    if (text.includes("\uFFFD")) {
      replacementCharacterCount += 1;

      addExample(
        suspiciousExamples,
        "Carácter de reemplazo U+FFFD",
        reference,
        text
      );
    }

    if (text.includes("\uFEFF")) {
      bomCount += 1;

      addExample(
        suspiciousExamples,
        "BOM U+FEFF",
        reference,
        text
      );
    }

    if (/[\u200B\u200C\u200D\u2060]/u.test(text)) {
      zeroWidthCount += 1;

      addExample(
        suspiciousExamples,
        "Caracteres zero-width / word joiner",
        reference,
        text
      );
    }

    if (
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u.test(
        text
      )
    ) {
      controlCharacterCount += 1;

      addExample(
        suspiciousExamples,
        "Caracteres de control",
        reference,
        text
      );
    }

    if (text.includes("\t")) {
      tabCount += 1;

      addExample(
        suspiciousExamples,
        "Tabulaciones",
        reference,
        text
      );
    }

    if (text.includes("\n")) {
      newlineCount += 1;

      addExample(
        suspiciousExamples,
        "Saltos de línea LF",
        reference,
        text
      );
    }

    if (text.includes("\r")) {
      carriageReturnCount += 1;

      addExample(
        suspiciousExamples,
        "Retornos CR",
        reference,
        text
      );
    }

    if (text.includes("\u00A0")) {
      nbspCount += 1;

      addExample(
        suspiciousExamples,
        "Espacios NBSP",
        reference,
        text
      );
    }

    if (text.includes("\u00AD")) {
      softHyphenCount += 1;

      addExample(
        suspiciousExamples,
        "Soft hyphen U+00AD",
        reference,
        text
      );
    }

    if (
      /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/u.test(
        text
      )
    ) {
      bidiControlCount += 1;

      addExample(
        suspiciousExamples,
        "Controles bidireccionales Unicode",
        reference,
        text
      );
    }

    if (/[\uE000-\uF8FF]/u.test(text)) {
      privateUseCount += 1;

      addExample(
        suspiciousExamples,
        "Caracteres Private Use",
        reference,
        text
      );
    }

    if (hasUnpairedSurrogate(text)) {
      unpairedSurrogateCount += 1;

      addExample(
        suspiciousExamples,
        "Surrogate Unicode no emparejado",
        reference,
        text
      );
    }

    if (/<[^>]+>/u.test(text)) {
      htmlTagCount += 1;

      addExample(
        suspiciousExamples,
        "Posibles etiquetas HTML",
        reference,
        text
      );
    }

    if (
      /&(?:#\d+|#x[0-9A-Fa-f]+|[A-Za-z][A-Za-z0-9]+);/u.test(
        text
      )
    ) {
      htmlEntityCount += 1;

      addExample(
        suspiciousExamples,
        "Posibles entidades HTML",
        reference,
        text
      );
    }

    if (/^\s/u.test(text)) {
      leadingWhitespaceCount += 1;

      addExample(
        suspiciousExamples,
        "Espacio al inicio",
        reference,
        text
      );
    }

    if (/\s$/u.test(text)) {
      trailingWhitespaceCount += 1;

      addExample(
        suspiciousExamples,
        "Espacio al final",
        reference,
        text
      );
    }

    if (/ {2,}/u.test(text)) {
      repeatedSpaceCount += 1;

      addExample(
        suspiciousExamples,
        "Dos o más espacios consecutivos",
        reference,
        text
      );
    }
  }

  const nonAsciiCharacters = Array.from(
    characterStats.values()
  )
    .filter((entry) => {
      const cp = entry.char.codePointAt(0);

      return cp < 0x20 || cp > 0x7e;
    })
    .sort(
      (a, b) =>
        a.char.codePointAt(0) -
        b.char.codePointAt(0)
    );

  console.log("========================================");
  console.log(" RESULTADOS DE AUDITORÍA");
  console.log("========================================");
  console.log("");

  console.log("Contenido:");
  console.log(
    `  Versículos revisados:     ${verses.length}`
  );
  console.log(
    `  Textos vacíos:            ${emptyTextCount}`
  );
  console.log("");

  console.log("Caracteres claramente problemáticos:");
  console.log(
    `  � U+FFFD:                  ${replacementCharacterCount}`
  );
  console.log(
    `  BOM U+FEFF:               ${bomCount}`
  );
  console.log(
    `  Zero-width:               ${zeroWidthCount}`
  );
  console.log(
    `  Caracteres de control:    ${controlCharacterCount}`
  );
  console.log(
    `  Tabs:                     ${tabCount}`
  );
  console.log(
    `  Saltos de línea LF:       ${newlineCount}`
  );
  console.log(
    `  Retornos CR:              ${carriageReturnCount}`
  );
  console.log(
    `  NBSP:                     ${nbspCount}`
  );
  console.log(
    `  Soft hyphen:              ${softHyphenCount}`
  );
  console.log(
    `  Controles bidi:           ${bidiControlCount}`
  );
  console.log(
    `  Private Use:              ${privateUseCount}`
  );
  console.log(
    `  Surrogates inválidos:     ${unpairedSurrogateCount}`
  );
  console.log("");

  console.log("Marcado / espacios:");
  console.log(
    `  Posibles etiquetas HTML:  ${htmlTagCount}`
  );
  console.log(
    `  Posibles entidades HTML:  ${htmlEntityCount}`
  );
  console.log(
    `  Espacio inicial:          ${leadingWhitespaceCount}`
  );
  console.log(
    `  Espacio final:            ${trailingWhitespaceCount}`
  );
  console.log(
    `  Espacios repetidos:       ${repeatedSpaceCount}`
  );
  console.log("");

  console.log(
    "Caracteres fuera del ASCII imprimible:"
  );

  if (nonAsciiCharacters.length === 0) {
    console.log("  Ninguno.");
  } else {
    for (const entry of nonAsciiCharacters) {
      console.log(
        `  ${codePointLabel(entry.char)} ` +
          `${JSON.stringify(entry.char)} ` +
          `→ ${entry.count} apariciones`
      );

      console.log(
        `    Ejemplos: ${entry.examples.join(", ")}`
      );
    }
  }

  console.log("");

  if (suspiciousExamples.size > 0) {
    console.log("========================================");
    console.log(" EJEMPLOS DE HALLAZGOS");
    console.log("========================================");
    console.log("");

    for (const [category, examples] of suspiciousExamples) {
      console.log(category);

      for (const example of examples) {
        console.log(`  ${example.reference}`);
        console.log(
          `    ${JSON.stringify(example.text)}`
        );
      }

      console.log("");
    }
  }

  const criticalProblems =
    emptyTextCount +
    replacementCharacterCount +
    bomCount +
    zeroWidthCount +
    controlCharacterCount +
    tabCount +
    newlineCount +
    carriageReturnCount +
    softHyphenCount +
    bidiControlCount +
    privateUseCount +
    unpairedSurrogateCount +
    htmlTagCount +
    htmlEntityCount;

  console.log("========================================");

  if (criticalProblems > 0) {
    console.error(
      "❌ RESULTADO: REQUIERE REVISIÓN"
    );

    console.error(
      "Se encontraron anomalías críticas en los textos KJV."
    );

    process.exitCode = 1;
  } else {
    console.log(
      "✓ RESULTADO: SIN ANOMALÍAS CRÍTICAS"
    );

    console.log("");
    console.log(
      "No se detectaron caracteres de reemplazo, controles, zero-width, HTML u otras anomalías críticas."
    );

    if (
      leadingWhitespaceCount > 0 ||
      trailingWhitespaceCount > 0 ||
      repeatedSpaceCount > 0 ||
      nbspCount > 0 ||
      nonAsciiCharacters.length > 0
    ) {
      console.log("");
      console.log(
        "Hay elementos no críticos que conviene revisar manualmente en el informe."
      );
    }
  }

  console.log("========================================");
  console.log("");
} finally {
  db.close();
}