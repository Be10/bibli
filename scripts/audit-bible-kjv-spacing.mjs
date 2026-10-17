import path from "node:path";
import Database from "better-sqlite3";

const VERSION_ID = "kjv";
const EXPECTED_VERSES = 31102;

const dbPath = path.join(
  process.cwd(),
  "data",
  "bibli.sqlite"
);

function addFinding(findings, type, row, match) {
  findings.push({
    type,
    book: row.book_name,
    chapter: row.chapter_number,
    verse: row.verse_number,
    text: row.verse_text,
    match,
  });
}

console.log("");
console.log("========================================");
console.log(" Auditoría de espaciado KJV");
console.log("========================================");
console.log("");

const db = new Database(dbPath, {
  readonly: true,
});

try {
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

  if (verses.length !== EXPECTED_VERSES) {
    console.error(
      `❌ Se esperaban ${EXPECTED_VERSES} versículos y se encontraron ${verses.length}.`
    );

    process.exit(1);
  }

  const findings = [];

  for (const row of verses) {
    const text = row.verse_text;

    //
    // 1. Puntuación seguida inmediatamente por letra.
    //
    // Ejemplos:
    // child,and
    // word.but
    // word;and
    //

    const punctuationRegex =
      /[A-Za-z][,;:.!?][A-Za-z]/g;

    for (const match of text.matchAll(punctuationRegex)) {
      addFinding(
        findings,
        "Puntuación sin espacio posterior",
        row,
        match[0]
      );
    }

    //
    // 2. Cierre de paréntesis/comillas seguido de letra
    // sin espacio.
    //

    const closingRegex =
      /[\)"”’][A-Za-z]/g;

    for (const match of text.matchAll(closingRegex)) {
      addFinding(
        findings,
        "Cierre sin espacio posterior",
        row,
        match[0]
      );
    }

    //
    // 3. Letra seguida de apertura sin espacio.
    //

    const openingRegex =
      /[A-Za-z][("“]/g;

    for (const match of text.matchAll(openingRegex)) {
      addFinding(
        findings,
        "Apertura sin espacio previo",
        row,
        match[0]
      );
    }

    //
    // 4. Palabras concatenadas conocidas que ya detectamos.
    //
    // Esta lista NO corrige nada.
    // Solo sirve para confirmar que siguen presentes.
    //

    const knownConcatenations = [
      "therehe",
      "hima",
      "returnunto",
    ];

    for (const token of knownConcatenations) {
      const tokenRegex = new RegExp(`\\b${token}\\b`, "i");

      if (tokenRegex.test(text)) {
        addFinding(
          findings,
          "Palabra concatenada conocida",
          row,
          token
        );
      }
    }
  }

  console.log(`Versículos revisados: ${verses.length}`);
  console.log("");

  const grouped = new Map();

  for (const finding of findings) {
    if (!grouped.has(finding.type)) {
      grouped.set(finding.type, []);
    }

    grouped.get(finding.type).push(finding);
  }

  console.log("========================================");
  console.log(" RESULTADOS");
  console.log("========================================");
  console.log("");

  if (findings.length === 0) {
    console.log(
      "✓ No se encontraron anomalías de espaciado mediante estas reglas."
    );
    console.log("");
    process.exitCode = 0;
  } else {
    for (const [type, rows] of grouped) {
      console.log(`${type}: ${rows.length}`);
      console.log("");

      for (const row of rows) {
        console.log(
          `${row.book} ${row.chapter}:${row.verse}`
        );

        console.log(
          `Coincidencia: ${JSON.stringify(row.match)}`
        );

        console.log(row.text);
        console.log("");
      }
    }

    console.log("----------------------------------------");
    console.log(
      `TOTAL DE HALLAZGOS: ${findings.length}`
    );
    console.log("----------------------------------------");
    console.log("");

    console.log(
      "⚠ Los hallazgos requieren revisión; el script no modifica SQLite."
    );
    console.log("");

    process.exitCode = 1;
  }
} finally {
  db.close();
}