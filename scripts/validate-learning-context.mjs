import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import yaml from "js-yaml";
import { LEARNING_CONTEXT_VERSION, REQUIRED_LEARNING_CONTEXT_LOCALES } from "./study-learning-context.mjs";

const rootDir = process.cwd();
const dbPath = path.join(rootDir, "data", "bibli.sqlite");
const registryPath = path.join(rootDir, "content", "learning", "lesson-context.yaml");

function fail(message) {
  throw new Error(message);
}

if (!fs.existsSync(dbPath)) fail(`No existe ${dbPath}`);
if (!fs.existsSync(registryPath)) fail(`No existe ${registryPath}`);

const registry = yaml.load(fs.readFileSync(registryPath, "utf8"));
if (String(registry?.schema_version) !== LEARNING_CONTEXT_VERSION) {
  fail(`lesson-context.yaml schema_version inválido: ${registry?.schema_version}`);
}

const db = new Database(dbPath, { readonly: true });

try {
  const requiredTables = [
    "learning_objectives",
    "learning_objective_localizations",
    "learning_objective_concepts",
    "learning_objective_blocks",
    "glossary_term_localizations",
    "lesson_learning_glossary_links",
  ];
  for (const table of requiredTables) {
    const exists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
    if (!exists) fail(`Falta tabla ${table}`);
  }

  let expectedObjectives = 0;
  let expectedObjectiveLocalizations = 0;
  let expectedObjectiveConceptLinks = 0;
  let expectedObjectiveBlockLinks = 0;
  let expectedGlossaryLinks = 0;
  const expectedGlossaryIds = new Set();

  for (const [lessonId, config] of Object.entries(registry?.lessons ?? {})) {
    const objectives = Array.isArray(config?.objectives) ? config.objectives : [];
    expectedObjectives += objectives.length;

    for (let index = 0; index < objectives.length; index += 1) {
      const entry = objectives[index];
      const objectiveId = `${lessonId}--${entry.objective_key}`;
      const row = db.prepare(`
        SELECT lesson_id, position, objective_version FROM learning_objectives WHERE id = ?
      `).get(objectiveId);
      if (!row) fail(`Objetivo no indexado: ${objectiveId}`);
      if (row.lesson_id !== lessonId || row.position !== index + 1) fail(`${objectiveId}: identidad/posición inválida`);
      if (row.objective_version !== LEARNING_CONTEXT_VERSION) fail(`${objectiveId}: objective_version inválida`);

      for (const locale of REQUIRED_LEARNING_CONTEXT_LOCALES) {
        const loc = db.prepare(`
          SELECT objective_text FROM learning_objective_localizations
          WHERE objective_id = ? AND locale = ?
        `).get(objectiveId, locale);
        if (!loc?.objective_text) fail(`${objectiveId}: falta localización ${locale}`);
        if (loc.objective_text !== String(entry.text?.[locale] ?? "").trim()) {
          fail(`${objectiveId}: texto ${locale} no coincide con el registro editorial`);
        }
        expectedObjectiveLocalizations += 1;
      }

      const conceptIds = (entry.concepts ?? []).map(String);
      const actualConceptIds = db.prepare(`
        SELECT concept_id FROM learning_objective_concepts
        WHERE objective_id = ? ORDER BY position
      `).all(objectiveId).map((item) => item.concept_id);
      if (JSON.stringify(actualConceptIds) !== JSON.stringify(conceptIds)) {
        fail(`${objectiveId}: concept_ids no coinciden`);
      }
      expectedObjectiveConceptLinks += conceptIds.length;

      const expectedBlockKeys = (entry.evidence_blocks ?? []).map(String);
      const actualBlockKeys = db.prepare(`
        SELECT block_key FROM learning_objective_blocks
        WHERE objective_id = ? ORDER BY position
      `).all(objectiveId).map((item) => item.block_key);
      if (JSON.stringify(actualBlockKeys) !== JSON.stringify(expectedBlockKeys)) {
        fail(`${objectiveId}: bloques de evidencia no coinciden`);
      }
      expectedObjectiveBlockLinks += expectedBlockKeys.length;
    }

    for (const entry of config?.contextual_glossary ?? []) {
      expectedGlossaryLinks += 1;
      expectedGlossaryIds.add(entry.glossary_id);
      const link = db.prepare(`
        SELECT block_id, block_key FROM lesson_learning_glossary_links
        WHERE lesson_id = ? AND glossary_id = ?
      `).get(lessonId, entry.glossary_id);
      if (!link) fail(`${lessonId}: falta enlace contextual ${entry.glossary_id}`);
      if (link.block_key !== entry.block_key) fail(`${lessonId}/${entry.glossary_id}: block_key no coincide`);

      const canonical = db.prepare(`SELECT term, definition FROM glossary_terms WHERE id = ?`).get(entry.glossary_id);
      const es = db.prepare(`
        SELECT term, definition FROM glossary_term_localizations WHERE glossary_id = ? AND locale = 'es'
      `).get(entry.glossary_id);
      const en = db.prepare(`
        SELECT term, definition FROM glossary_term_localizations WHERE glossary_id = ? AND locale = 'en'
      `).get(entry.glossary_id);
      if (!canonical || !es || !en) fail(`${entry.glossary_id}: localizaciones ES/EN incompletas`);
      if (es.term !== canonical.term || es.definition !== canonical.definition) {
        fail(`${entry.glossary_id}: ES debe reutilizar el glosario canónico`);
      }
      if (en.term !== String(entry.en?.term ?? "").trim() || en.definition !== String(entry.en?.definition ?? "").trim()) {
        fail(`${entry.glossary_id}: EN no coincide con lesson-context.yaml`);
      }

      const block = db.prepare(`
        SELECT content_text FROM lesson_learning_blocks
        WHERE lesson_id = ? AND locale = 'es' AND block_id = ?
      `).get(lessonId, link.block_id);
      if (!block || !block.content_text.toLocaleLowerCase("es").includes(canonical.term.toLocaleLowerCase("es"))) {
        fail(`${lessonId}/${entry.block_key}: el término «${canonical.term}» no aparece en el bloque`);
      }
    }
  }

  const counts = {
    objectives: db.prepare("SELECT COUNT(*) AS n FROM learning_objectives").get().n,
    objectiveLocalizations: db.prepare("SELECT COUNT(*) AS n FROM learning_objective_localizations").get().n,
    objectiveConceptLinks: db.prepare("SELECT COUNT(*) AS n FROM learning_objective_concepts").get().n,
    objectiveBlockLinks: db.prepare("SELECT COUNT(*) AS n FROM learning_objective_blocks").get().n,
    glossaryLocalizations: db.prepare("SELECT COUNT(*) AS n FROM glossary_term_localizations").get().n,
    glossaryLinks: db.prepare("SELECT COUNT(*) AS n FROM lesson_learning_glossary_links").get().n,
  };

  if (counts.objectives !== expectedObjectives) fail(`learning_objectives=${counts.objectives}; esperado ${expectedObjectives}`);
  if (counts.objectiveLocalizations !== expectedObjectiveLocalizations) fail(`objective localizations=${counts.objectiveLocalizations}; esperado ${expectedObjectiveLocalizations}`);
  if (counts.objectiveConceptLinks !== expectedObjectiveConceptLinks) fail(`objective concept links=${counts.objectiveConceptLinks}; esperado ${expectedObjectiveConceptLinks}`);
  if (counts.objectiveBlockLinks !== expectedObjectiveBlockLinks) fail(`objective block links=${counts.objectiveBlockLinks}; esperado ${expectedObjectiveBlockLinks}`);
  if (counts.glossaryLinks !== expectedGlossaryLinks) fail(`glossary links=${counts.glossaryLinks}; esperado ${expectedGlossaryLinks}`);
  if (counts.glossaryLocalizations !== expectedGlossaryIds.size * REQUIRED_LEARNING_CONTEXT_LOCALES.length) {
    fail(`glossary localizations=${counts.glossaryLocalizations}; esperado ${expectedGlossaryIds.size * REQUIRED_LEARNING_CONTEXT_LOCALES.length}`);
  }

  console.log("Validación de contexto educativo: PASS");
  console.log(`Objetivos: ${counts.objectives}`);
  console.log(`Localizaciones de objetivos: ${counts.objectiveLocalizations}`);
  console.log(`Vínculos objetivo-concepto: ${counts.objectiveConceptLinks}`);
  console.log(`Bloques de evidencia: ${counts.objectiveBlockLinks}`);
  console.log(`Términos contextuales: ${expectedGlossaryIds.size}`);
  console.log(`Localizaciones de glosario ES/EN: ${counts.glossaryLocalizations}`);
  console.log(`Vínculos bloque-glosario: ${counts.glossaryLinks}`);
} finally {
  db.close();
}
