import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import yaml from "js-yaml";
import { LEARNING_CHECKS_VERSION, REQUIRED_LEARNING_CHECK_LOCALES } from "./study-learning-checks.mjs";

const rootDir = process.cwd();
const dbPath = path.join(rootDir, "data", "bibli.sqlite");
const registryPath = path.join(rootDir, "content", "learning", "microchecks.yaml");

function fail(message) {
  throw new Error(message);
}

if (!fs.existsSync(dbPath)) fail(`No existe ${dbPath}`);
if (!fs.existsSync(registryPath)) fail(`No existe ${registryPath}`);
const registry = yaml.load(fs.readFileSync(registryPath, "utf8"));
if (String(registry?.schema_version) !== LEARNING_CHECKS_VERSION) fail(`microchecks.yaml schema_version inválido: ${registry?.schema_version}`);

const db = new Database(dbPath, { readonly: true });

try {
  const requiredTables = [
    "learning_microchecks",
    "learning_microcheck_localizations",
    "learning_microcheck_concepts",
    "learning_microcheck_options",
    "learning_microcheck_option_localizations",
    "learning_microcheck_evidence",
    "learning_microcheck_evidence_localizations",
  ];
  for (const table of requiredTables) {
    const exists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
    if (!exists) fail(`Falta tabla ${table}`);
  }

  const expected = { checks: 0, localizations: 0, conceptLinks: 0, options: 0, optionLocalizations: 0, evidenceLinks: 0, evidenceLocalizations: 0 };

  for (const [lessonId, config] of Object.entries(registry?.lessons ?? {})) {
    const checks = Array.isArray(config?.checks) ? config.checks : [];
    for (let checkIndex = 0; checkIndex < checks.length; checkIndex += 1) {
      const entry = checks[checkIndex];
      const checkId = `${lessonId}--${entry.check_key}`;
      const objectiveId = `${lessonId}--${entry.objective_key}`;
      const row = db.prepare(`
        SELECT lesson_id, trigger_block_key, objective_id, position, check_version, question_type
        FROM learning_microchecks WHERE id = ?
      `).get(checkId);
      if (!row) fail(`Microcheck no indexado: ${checkId}`);
      if (row.lesson_id !== lessonId || row.position !== checkIndex + 1) fail(`${checkId}: identidad/posición inválida`);
      if (row.trigger_block_key !== entry.trigger_block) fail(`${checkId}: trigger_block no coincide`);
      if (row.objective_id !== objectiveId) fail(`${checkId}: objective_id no coincide`);
      if (row.check_version !== LEARNING_CHECKS_VERSION || row.question_type !== "single-choice") fail(`${checkId}: metadatos inválidos`);
      expected.checks += 1;

      for (const locale of REQUIRED_LEARNING_CHECK_LOCALES) {
        const loc = db.prepare("SELECT prompt FROM learning_microcheck_localizations WHERE check_id=? AND locale=?").get(checkId, locale);
        if (loc?.prompt !== String(entry.prompt?.[locale] ?? "").trim()) fail(`${checkId}: prompt ${locale} no coincide`);
        expected.localizations += 1;
      }

      const expectedConcepts = (entry.concepts ?? []).map(String);
      const actualConcepts = db.prepare(`SELECT concept_id FROM learning_microcheck_concepts WHERE check_id=? ORDER BY position`).all(checkId).map((row) => row.concept_id);
      if (JSON.stringify(actualConcepts) !== JSON.stringify(expectedConcepts)) fail(`${checkId}: concept_ids no coinciden`);
      expected.conceptLinks += expectedConcepts.length;

      const actualOptions = db.prepare(`
        SELECT id, option_key, is_correct FROM learning_microcheck_options
        WHERE check_id=? ORDER BY position
      `).all(checkId);
      if (actualOptions.length !== (entry.options ?? []).length) fail(`${checkId}: número de alternativas inválido`);
      if (actualOptions.filter((row) => row.is_correct === 1).length !== 1) fail(`${checkId}: debe tener una única respuesta correcta`);

      for (let optionIndex = 0; optionIndex < actualOptions.length; optionIndex += 1) {
        const expectedOption = entry.options[optionIndex];
        const actualOption = actualOptions[optionIndex];
        if (actualOption.option_key !== expectedOption.option_key || Boolean(actualOption.is_correct) !== Boolean(expectedOption.correct)) {
          fail(`${checkId}/${expectedOption.option_key}: identidad/correctitud no coincide`);
        }
        for (const locale of REQUIRED_LEARNING_CHECK_LOCALES) {
          const loc = db.prepare(`
            SELECT option_text, rationale FROM learning_microcheck_option_localizations
            WHERE option_id=? AND locale=?
          `).get(actualOption.id, locale);
          if (loc?.option_text !== String(expectedOption.text?.[locale] ?? "").trim()) fail(`${actualOption.id}: text ${locale} no coincide`);
          if (loc?.rationale !== String(expectedOption.rationale?.[locale] ?? "").trim()) fail(`${actualOption.id}: rationale ${locale} no coincide`);
          expected.optionLocalizations += 1;
        }
        expected.options += 1;
      }

      const expectedEvidence = entry.evidence ?? [];
      const actualEvidence = db.prepare(`
        SELECT block_id, block_key FROM learning_microcheck_evidence
        WHERE check_id=? ORDER BY position
      `).all(checkId);
      if (actualEvidence.length !== expectedEvidence.length) fail(`${checkId}: evidencia incompleta`);
      for (let evidenceIndex = 0; evidenceIndex < expectedEvidence.length; evidenceIndex += 1) {
        const actualItem = actualEvidence[evidenceIndex];
        const expectedItem = expectedEvidence[evidenceIndex];
        if (actualItem.block_key !== expectedItem.block_key) fail(`${checkId}: block_key de evidencia no coincide`);
        for (const locale of REQUIRED_LEARNING_CHECK_LOCALES) {
          const loc = db.prepare(`
            SELECT bible_reference FROM learning_microcheck_evidence_localizations
            WHERE check_id=? AND block_id=? AND locale=?
          `).get(checkId, actualItem.block_id, locale);
          const expectedReference = String(expectedItem.bible_reference?.[locale] ?? "").trim();
          if ((loc?.bible_reference ?? "") !== expectedReference) fail(`${checkId}: referencia de evidencia ${locale} no coincide`);
          expected.evidenceLocalizations += 1;
        }
        expected.evidenceLinks += 1;
      }
    }
  }

  const counts = {
    checks: db.prepare("SELECT COUNT(*) AS n FROM learning_microchecks").get().n,
    localizations: db.prepare("SELECT COUNT(*) AS n FROM learning_microcheck_localizations").get().n,
    conceptLinks: db.prepare("SELECT COUNT(*) AS n FROM learning_microcheck_concepts").get().n,
    options: db.prepare("SELECT COUNT(*) AS n FROM learning_microcheck_options").get().n,
    optionLocalizations: db.prepare("SELECT COUNT(*) AS n FROM learning_microcheck_option_localizations").get().n,
    evidenceLinks: db.prepare("SELECT COUNT(*) AS n FROM learning_microcheck_evidence").get().n,
    evidenceLocalizations: db.prepare("SELECT COUNT(*) AS n FROM learning_microcheck_evidence_localizations").get().n,
  };

  for (const key of Object.keys(expected)) {
    if (counts[key] !== expected[key]) fail(`${key}=${counts[key]}; esperado ${expected[key]}`);
  }

  console.log("Validación de microcomprobaciones: PASS");
  console.log(`Microchecks: ${counts.checks}`);
  console.log(`Localizaciones de preguntas: ${counts.localizations}`);
  console.log(`Vínculos check-concepto: ${counts.conceptLinks}`);
  console.log(`Alternativas: ${counts.options}`);
  console.log(`Localizaciones de alternativas/rationale: ${counts.optionLocalizations}`);
  console.log(`Vínculos de evidencia: ${counts.evidenceLinks}`);
  console.log(`Localizaciones de evidencia: ${counts.evidenceLocalizations}`);
} finally {
  db.close();
}
