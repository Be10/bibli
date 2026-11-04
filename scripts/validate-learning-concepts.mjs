import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {
  LEARNING_CONCEPT_SCHEMA_VERSION,
  REQUIRED_CONCEPT_LOCALES,
  loadLearningConceptRegistry,
} from "./study-learning-concepts.mjs";

const rootDir = process.cwd();
const dbPath = path.join(rootDir, "data", "bibli.sqlite");
const PILOT_LESSON_ID = "pentateuco-principal--genesis--01-01-02-03--l001";

function fail(message) {
  throw new Error(message);
}

if (!fs.existsSync(dbPath)) fail(`No existe ${dbPath}`);

const registry = loadLearningConceptRegistry(rootDir);
const db = new Database(dbPath, { readonly: true });

try {
  for (const table of [
    "learning_concepts",
    "learning_concept_localizations",
    "lesson_learning_concepts",
    "lesson_learning_block_concepts",
  ]) {
    const exists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
    if (!exists) fail(`Falta ${table}. Ejecuta npm run studies:import.`);
  }

  const conceptCount = db.prepare("SELECT COUNT(*) AS n FROM learning_concepts").get().n;
  const localizationCount = db.prepare("SELECT COUNT(*) AS n FROM learning_concept_localizations").get().n;
  const lessonLinkCount = db.prepare("SELECT COUNT(*) AS n FROM lesson_learning_concepts").get().n;
  const blockLinkCount = db.prepare("SELECT COUNT(*) AS n FROM lesson_learning_block_concepts").get().n;

  assert.equal(conceptCount, registry.concepts.length, "SQLite debe reflejar exactamente el registro de conceptos");
  assert.equal(
    localizationCount,
    conceptCount * REQUIRED_CONCEPT_LOCALES.length,
    "cada concepto debe tener localización ES/EN",
  );
  assert.ok(lessonLinkCount >= conceptCount, "cada concepto piloto debe estar vinculado al menos a una lección");
  assert.ok(blockLinkCount > lessonLinkCount, "los conceptos deben enlazarse a bloques concretos");

  const missingLocales = db.prepare(`
    SELECT c.id
    FROM learning_concepts c
    LEFT JOIN learning_concept_localizations l ON l.concept_id = c.id
    GROUP BY c.id
    HAVING COUNT(DISTINCT CASE WHEN l.locale IN ('es', 'en') THEN l.locale END) <> 2
  `).all();
  assert.equal(missingLocales.length, 0, `conceptos sin par ES/EN: ${missingLocales.map((row) => row.id).join(", ")}`);

  const invalidBlockLinks = db.prepare(`
    SELECT lbc.lesson_id, lbc.block_id, lbc.block_key, lbc.concept_id
    FROM lesson_learning_block_concepts lbc
    WHERE NOT EXISTS (
      SELECT 1
      FROM lesson_learning_blocks lb
      WHERE lb.lesson_id = lbc.lesson_id
        AND lb.block_id = lbc.block_id
        AND lb.block_key = lbc.block_key
    )
  `).all();
  assert.equal(invalidBlockLinks.length, 0, "todo vínculo concepto-bloque debe apuntar a un bloque educativo real");

  const localeParityProblems = db.prepare(`
    SELECT lbc.lesson_id, lbc.block_key, lbc.concept_id,
           COUNT(DISTINCT lb.locale) AS linked_locales,
           (SELECT COUNT(*) FROM lesson_learning_models lm WHERE lm.lesson_id = lbc.lesson_id) AS model_locales
    FROM lesson_learning_block_concepts lbc
    LEFT JOIN lesson_learning_blocks lb
      ON lb.lesson_id = lbc.lesson_id
     AND lb.block_id = lbc.block_id
     AND lb.block_key = lbc.block_key
    GROUP BY lbc.lesson_id, lbc.block_key, lbc.concept_id
    HAVING linked_locales <> model_locales
  `).all();
  assert.equal(localeParityProblems.length, 0, "los vínculos de conceptos deben resolver el mismo bloque en todos los locales disponibles");

  const pilotConcepts = db.prepare(`
    SELECT lc.concept_id, lc.importance, es.label AS label_es, en.label AS label_en
    FROM lesson_learning_concepts lc
    JOIN learning_concept_localizations es
      ON es.concept_id = lc.concept_id AND es.locale = 'es'
    JOIN learning_concept_localizations en
      ON en.concept_id = lc.concept_id AND en.locale = 'en'
    WHERE lc.lesson_id = ?
    ORDER BY CASE lc.importance WHEN 'core' THEN 0 ELSE 1 END, lc.concept_id
  `).all(PILOT_LESSON_ID);

  assert.ok(pilotConcepts.length >= 6, "la lección piloto debe tener un conjunto conceptual sustantivo");
  for (const requiredId of [
    "god-as-creator",
    "image-of-god",
    "seventh-day-rest",
    "christ-and-creation",
    "creation-and-new-creation",
  ]) {
    assert.ok(pilotConcepts.some((row) => row.concept_id === requiredId), `falta concepto piloto ${requiredId}`);
  }

  const versions = db.prepare("SELECT DISTINCT concept_version FROM learning_concepts").all().map((row) => row.concept_version);
  assert.deepEqual(versions, [LEARNING_CONCEPT_SCHEMA_VERSION], "concept_version debe coincidir con el registro editorial");

  console.log("Validación de conceptos educativos: PASS");
  console.log(`Conceptos: ${conceptCount}`);
  console.log(`Localizaciones ES/EN: ${localizationCount}`);
  console.log(`Vínculos lección-concepto: ${lessonLinkCount}`);
  console.log(`Vínculos bloque-concepto: ${blockLinkCount}`);
  console.log(`Piloto: ${PILOT_LESSON_ID} · ${pilotConcepts.length} conceptos`);
  console.log("Paridad bilingüe y resolución de bloques: PASS");
} finally {
  db.close();
}
