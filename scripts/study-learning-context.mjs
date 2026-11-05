import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export const LEARNING_CONTEXT_VERSION = "1.0.0";
export const REQUIRED_LEARNING_CONTEXT_LOCALES = ["es", "en"];

const CONTEXT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS learning_objectives (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  objective_version TEXT NOT NULL,
  source_kind TEXT NOT NULL DEFAULT 'editorial-registry',
  UNIQUE (lesson_id, position),
  FOREIGN KEY (lesson_id) REFERENCES study_lessons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_objective_localizations (
  objective_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  objective_text TEXT NOT NULL,
  PRIMARY KEY (objective_id, locale),
  FOREIGN KEY (objective_id) REFERENCES learning_objectives(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_objective_concepts (
  objective_id TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  PRIMARY KEY (objective_id, concept_id),
  UNIQUE (objective_id, position),
  FOREIGN KEY (objective_id) REFERENCES learning_objectives(id) ON DELETE CASCADE,
  FOREIGN KEY (concept_id) REFERENCES learning_concepts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_objective_blocks (
  objective_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  block_key TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  evidence_role TEXT NOT NULL DEFAULT 'supports',
  PRIMARY KEY (objective_id, block_id),
  UNIQUE (objective_id, position),
  FOREIGN KEY (objective_id) REFERENCES learning_objectives(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES study_lessons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS glossary_term_localizations (
  glossary_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  term TEXT NOT NULL,
  definition TEXT NOT NULL DEFAULT '',
  source_kind TEXT NOT NULL DEFAULT 'canonical-glossary',
  PRIMARY KEY (glossary_id, locale),
  FOREIGN KEY (glossary_id) REFERENCES glossary_terms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lesson_learning_glossary_links (
  lesson_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  block_key TEXT NOT NULL,
  glossary_id TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  source_kind TEXT NOT NULL DEFAULT 'editorial-registry',
  PRIMARY KEY (lesson_id, block_id, glossary_id),
  UNIQUE (lesson_id, block_id, position),
  FOREIGN KEY (lesson_id) REFERENCES study_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (glossary_id) REFERENCES glossary_terms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_learning_objectives_lesson
  ON learning_objectives(lesson_id, position);
CREATE INDEX IF NOT EXISTS idx_learning_objective_localizations_locale
  ON learning_objective_localizations(locale, objective_id);
CREATE INDEX IF NOT EXISTS idx_learning_objective_concepts_concept
  ON learning_objective_concepts(concept_id, objective_id);
CREATE INDEX IF NOT EXISTS idx_learning_objective_blocks_lesson
  ON learning_objective_blocks(lesson_id, block_id, objective_id);
CREATE INDEX IF NOT EXISTS idx_glossary_term_localizations_locale
  ON glossary_term_localizations(locale, term);
CREATE INDEX IF NOT EXISTS idx_lesson_learning_glossary_block
  ON lesson_learning_glossary_links(lesson_id, block_id, position);
CREATE INDEX IF NOT EXISTS idx_lesson_learning_glossary_term
  ON lesson_learning_glossary_links(glossary_id, lesson_id);
`;

function fail(message) {
  throw new Error(message);
}

function normalize(value) {
  return String(value ?? "").trim();
}

function containsTerm(text, term) {
  return normalize(text).toLocaleLowerCase("es").includes(normalize(term).toLocaleLowerCase("es"));
}

function loadRegistry(rootDir) {
  const registryPath = path.join(rootDir, "content", "learning", "lesson-context.yaml");
  if (!fs.existsSync(registryPath)) fail(`No existe ${registryPath}`);
  const registry = yaml.load(fs.readFileSync(registryPath, "utf8"));
  if (!registry || typeof registry !== "object") fail("lesson-context.yaml no contiene un objeto YAML válido");
  if (String(registry.schema_version) !== LEARNING_CONTEXT_VERSION) {
    fail(`lesson-context.yaml schema_version=${registry.schema_version}; esperado ${LEARNING_CONTEXT_VERSION}`);
  }
  const requiredLocales = Array.isArray(registry.required_locales) ? registry.required_locales.map(String) : [];
  for (const locale of REQUIRED_LEARNING_CONTEXT_LOCALES) {
    if (!requiredLocales.includes(locale)) fail(`lesson-context.yaml debe declarar locale requerido ${locale}`);
  }
  return registry;
}

export function ensureLearningContextSchema(db) {
  db.exec(CONTEXT_SCHEMA_SQL);
}

export function indexLearningContext(db, options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const clear = options.clear ?? true;
  ensureLearningContextSchema(db);
  const registry = loadRegistry(rootDir);

  if (clear) {
    for (const table of [
      "lesson_learning_glossary_links",
      "glossary_term_localizations",
      "learning_objective_blocks",
      "learning_objective_concepts",
      "learning_objective_localizations",
      "learning_objectives",
    ]) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
  }

  const insertObjective = db.prepare(`
    INSERT INTO learning_objectives (id, lesson_id, position, objective_version, source_kind)
    VALUES (?, ?, ?, ?, 'editorial-registry')
  `);
  const insertObjectiveLocale = db.prepare(`
    INSERT INTO learning_objective_localizations (objective_id, locale, objective_text)
    VALUES (?, ?, ?)
  `);
  const insertObjectiveConcept = db.prepare(`
    INSERT INTO learning_objective_concepts (objective_id, concept_id, position)
    VALUES (?, ?, ?)
  `);
  const insertObjectiveBlock = db.prepare(`
    INSERT INTO learning_objective_blocks
      (objective_id, lesson_id, block_id, block_key, position, evidence_role)
    VALUES (?, ?, ?, ?, ?, 'supports')
  `);
  const insertGlossaryLocale = db.prepare(`
    INSERT OR REPLACE INTO glossary_term_localizations
      (glossary_id, locale, term, definition, source_kind)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertGlossaryLink = db.prepare(`
    INSERT INTO lesson_learning_glossary_links
      (lesson_id, block_id, block_key, glossary_id, position, source_kind)
    VALUES (?, ?, ?, ?, ?, 'editorial-registry')
  `);

  let objectives = 0;
  let objectiveLocalizations = 0;
  let objectiveConceptLinks = 0;
  let objectiveBlockLinks = 0;
  let glossaryLocalizations = 0;
  let glossaryLinks = 0;

  const lessons = registry.lessons && typeof registry.lessons === "object" ? registry.lessons : {};

  for (const [lessonId, lessonConfig] of Object.entries(lessons)) {
    const lessonExists = db.prepare("SELECT 1 FROM study_lessons WHERE id = ?").get(lessonId);
    if (!lessonExists) fail(`Learning context referencia lesson_id desconocido: ${lessonId}`);

    const blockRows = db.prepare(`
      SELECT block_id, block_key, content_text
      FROM lesson_learning_blocks
      WHERE lesson_id = ? AND locale = 'es'
      ORDER BY position
    `).all(lessonId);
    const blockByKey = new Map(blockRows.map((row) => [row.block_key, row]));
    if (blockRows.length === 0) fail(`${lessonId}: no tiene bloques educativos ES para resolver contexto`);

    const lessonObjectives = Array.isArray(lessonConfig?.objectives) ? lessonConfig.objectives : [];
    for (let index = 0; index < lessonObjectives.length; index += 1) {
      const entry = lessonObjectives[index];
      const objectiveKey = normalize(entry?.objective_key);
      if (!/^objective-[0-9]{2}$/.test(objectiveKey)) {
        fail(`${lessonId}: objective_key inválido ${objectiveKey || "(vacío)"}`);
      }
      const objectiveId = `${lessonId}--${objectiveKey}`;
      insertObjective.run(objectiveId, lessonId, index + 1, LEARNING_CONTEXT_VERSION);
      objectives += 1;

      for (const locale of REQUIRED_LEARNING_CONTEXT_LOCALES) {
        const objectiveText = normalize(entry?.text?.[locale]);
        if (!objectiveText) fail(`${objectiveId}: falta texto ${locale}`);
        insertObjectiveLocale.run(objectiveId, locale, objectiveText);
        objectiveLocalizations += 1;
      }

      const conceptIds = Array.isArray(entry?.concepts) ? entry.concepts.map(normalize).filter(Boolean) : [];
      if (conceptIds.length === 0) fail(`${objectiveId}: debe vincular al menos un concept_id`);
      for (let conceptIndex = 0; conceptIndex < conceptIds.length; conceptIndex += 1) {
        const conceptId = conceptIds[conceptIndex];
        const linked = db.prepare(`
          SELECT 1 FROM lesson_learning_concepts WHERE lesson_id = ? AND concept_id = ?
        `).get(lessonId, conceptId);
        if (!linked) fail(`${objectiveId}: concept_id ${conceptId} no está vinculado a la lección`);
        insertObjectiveConcept.run(objectiveId, conceptId, conceptIndex + 1);
        objectiveConceptLinks += 1;
      }

      const blockKeys = Array.isArray(entry?.evidence_blocks) ? entry.evidence_blocks.map(normalize).filter(Boolean) : [];
      if (blockKeys.length === 0) fail(`${objectiveId}: debe tener al menos un bloque de evidencia`);
      for (let blockIndex = 0; blockIndex < blockKeys.length; blockIndex += 1) {
        const blockKey = blockKeys[blockIndex];
        const block = blockByKey.get(blockKey);
        if (!block) fail(`${objectiveId}: bloque de evidencia desconocido ${blockKey}`);
        insertObjectiveBlock.run(objectiveId, lessonId, block.block_id, blockKey, blockIndex + 1);
        objectiveBlockLinks += 1;
      }
    }

    const glossaryEntries = Array.isArray(lessonConfig?.contextual_glossary) ? lessonConfig.contextual_glossary : [];
    const perBlockPosition = new Map();
    for (const entry of glossaryEntries) {
      const glossaryId = normalize(entry?.glossary_id);
      const blockKey = normalize(entry?.block_key);
      const glossary = db.prepare(`
        SELECT id, term, definition, status FROM glossary_terms WHERE id = ?
      `).get(glossaryId);
      if (!glossary) fail(`${lessonId}: glossary_id desconocido ${glossaryId}`);
      if (glossary.status === "Borrador") fail(`${lessonId}: glossary_id ${glossaryId} está en Borrador`);
      const block = blockByKey.get(blockKey);
      if (!block) fail(`${lessonId}: bloque contextual desconocido ${blockKey}`);
      if (!containsTerm(block.content_text, glossary.term)) {
        fail(`${lessonId}/${blockKey}: el bloque no contiene el término canónico «${glossary.term}»`);
      }

      const esDefinition = normalize(glossary.definition);
      if (!esDefinition) fail(`${glossaryId}: falta definición canónica ES`);
      insertGlossaryLocale.run(glossaryId, "es", glossary.term, esDefinition, "canonical-glossary");
      glossaryLocalizations += 1;

      const enTerm = normalize(entry?.en?.term);
      const enDefinition = normalize(entry?.en?.definition);
      if (!enTerm || !enDefinition) fail(`${glossaryId}: falta localización inglesa del glosario contextual`);
      insertGlossaryLocale.run(glossaryId, "en", enTerm, enDefinition, "learning-context-registry");
      glossaryLocalizations += 1;

      const position = (perBlockPosition.get(block.block_id) ?? 0) + 1;
      perBlockPosition.set(block.block_id, position);
      insertGlossaryLink.run(lessonId, block.block_id, blockKey, glossaryId, position);
      glossaryLinks += 1;
    }
  }

  return {
    objectives,
    objectiveLocalizations,
    objectiveConceptLinks,
    objectiveBlockLinks,
    glossaryLocalizations,
    glossaryLinks,
  };
}
