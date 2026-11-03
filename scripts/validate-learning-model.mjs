import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { compileStructuredLesson, LEARNING_ID_STRATEGY, LEARNING_MODEL_VERSION } from "./study-learning-model.mjs";
import { parseStudyDocument } from "./study-markdown-utils.mjs";

const rootDir = process.cwd();
const dbPath = path.join(rootDir, "data", "bibli.sqlite");
const studiesRoot = path.join(rootDir, "content", "studies");
const PILOT_LESSON_ID = "pentateuco-principal--genesis--01-01-02-03--l001";

function fail(message) {
  throw new Error(message);
}

if (!fs.existsSync(dbPath)) fail(`No existe ${dbPath}`);

const db = new Database(dbPath, { readonly: true });

try {
  for (const table of ["lesson_learning_models", "lesson_learning_blocks"]) {
    const exists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
    if (!exists) fail(`Falta ${table}. Ejecuta npm run studies:import.`);
  }

  const lessonCount = db.prepare("SELECT COUNT(*) AS n FROM study_lessons").get().n;
  const primaryModelCoverage = db.prepare(`
    SELECT COUNT(*) AS n
    FROM study_lessons s
    WHERE EXISTS (
      SELECT 1
      FROM route_lessons rl
      JOIN routes r ON r.id = rl.route_id
      JOIN lesson_learning_models lm
        ON lm.lesson_id = s.id
       AND lm.locale = r.language
      WHERE rl.lesson_id = s.id
        AND rl.is_primary = 1
    )
  `).get().n;

  assert.equal(primaryModelCoverage, lessonCount, "cada lección debe tener modelo para el idioma de su ruta primaria");

  const modelCount = db.prepare("SELECT COUNT(*) AS n FROM lesson_learning_models").get().n;
  const blockCount = db.prepare("SELECT COUNT(*) AS n FROM lesson_learning_blocks").get().n;
  assert.ok(modelCount >= lessonCount, "debe existir al menos un modelo localizado por lección");
  assert.ok(blockCount > modelCount * 2, "los modelos deben contener bloques semánticos");

  const pilot = db.prepare(`
    SELECT *
    FROM lesson_learning_models
    WHERE lesson_id = ? AND locale = 'es'
  `).get(PILOT_LESSON_ID);
  assert.ok(pilot, `falta modelo piloto ${PILOT_LESSON_ID}`);
  assert.equal(pilot.model_version, LEARNING_MODEL_VERSION);
  assert.equal(pilot.id_strategy, LEARNING_ID_STRATEGY);

  const pilotBlocks = db.prepare(`
    SELECT *
    FROM lesson_learning_blocks
    WHERE lesson_id = ? AND locale = 'es'
    ORDER BY position ASC
  `).all(PILOT_LESSON_ID);

  assert.equal(pilotBlocks.length, pilot.block_count, "block_count del piloto debe coincidir con SQLite");
  assert.ok(pilotBlocks.length >= 10, "el piloto debe conservar la estructura sustantiva de la lección");

  const pilotKeys = new Set(pilotBlocks.map((block) => block.block_key));
  for (const key of [
    "title",
    "primary-reading",
    "context",
    "exposition-01",
    "revelation-about-god",
    "revelation-about-humanity",
    "christ-connection",
    "canonical-thread",
    "application",
    "reflection",
    "summary",
    "prayer",
  ]) {
    assert.ok(pilotKeys.has(key), `el piloto debe contener ${key}`);
  }

  const sourcePath = path.join(studiesRoot, pilot.source_path);
  const sourceText = fs.readFileSync(sourcePath, "utf8");
  const parsed = parseStudyDocument(sourceText, pilot.source_path);

  const compileForLocale = (locale) => compileStructuredLesson({
    lessonId: pilot.lesson_id,
    locale,
    title: pilot.title,
    primaryReference: pilot.primary_reference,
    translation: pilot.translation,
    contentVersion: pilot.source_content_version,
    sourcePath: pilot.source_path,
    sourceText,
    parsed,
  });

  const compiledEs = compileForLocale("es");
  const compiledEnIdentityCheck = compileForLocale("en");

  assert.equal(compiledEs.source_sha256, pilot.source_sha256, "el hash del modelo debe corresponder al Markdown canónico");
  assert.deepEqual(
    pilotBlocks.map((block) => block.block_id),
    compiledEs.blocks.map((block) => block.block_id),
    "SQLite debe conservar exactamente los IDs compilados",
  );
  assert.deepEqual(
    compiledEs.blocks.map((block) => block.block_id),
    compiledEnIdentityCheck.blocks.map((block) => block.block_id),
    "los block_id deben ser neutrales al idioma",
  );
  assert.deepEqual(
    compiledEs.blocks.map((block) => block.block_key),
    compiledEnIdentityCheck.blocks.map((block) => block.block_key),
    "los block_key deben ser neutrales al idioma",
  );

  console.log("Validación del modelo educativo: PASS");
  console.log(`Lecciones canónicas: ${lessonCount}`);
  console.log(`Modelos localizados: ${modelCount}`);
  console.log(`Bloques educativos: ${blockCount}`);
  console.log(`Piloto: ${PILOT_LESSON_ID} · ${pilotBlocks.length} bloques`);
  console.log("Paridad de identidad ES/EN: PASS");
} finally {
  db.close();
}
