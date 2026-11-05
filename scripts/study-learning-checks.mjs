import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export const LEARNING_CHECKS_VERSION = "1.0.0";
export const REQUIRED_LEARNING_CHECK_LOCALES = ["es", "en"];

const CHECK_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS learning_microchecks (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  trigger_block_id TEXT NOT NULL,
  trigger_block_key TEXT NOT NULL,
  objective_id TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  check_version TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'single-choice',
  source_kind TEXT NOT NULL DEFAULT 'editorial-registry',
  UNIQUE (lesson_id, position),
  FOREIGN KEY (lesson_id) REFERENCES study_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (objective_id) REFERENCES learning_objectives(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_microcheck_localizations (
  check_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  prompt TEXT NOT NULL,
  PRIMARY KEY (check_id, locale),
  FOREIGN KEY (check_id) REFERENCES learning_microchecks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_microcheck_concepts (
  check_id TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  PRIMARY KEY (check_id, concept_id),
  UNIQUE (check_id, position),
  FOREIGN KEY (check_id) REFERENCES learning_microchecks(id) ON DELETE CASCADE,
  FOREIGN KEY (concept_id) REFERENCES learning_concepts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_microcheck_options (
  id TEXT PRIMARY KEY,
  check_id TEXT NOT NULL,
  option_key TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  is_correct INTEGER NOT NULL DEFAULT 0 CHECK (is_correct IN (0, 1)),
  UNIQUE (check_id, option_key),
  UNIQUE (check_id, position),
  FOREIGN KEY (check_id) REFERENCES learning_microchecks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_microcheck_option_localizations (
  option_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  option_text TEXT NOT NULL,
  rationale TEXT NOT NULL,
  PRIMARY KEY (option_id, locale),
  FOREIGN KEY (option_id) REFERENCES learning_microcheck_options(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_microcheck_evidence (
  check_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  block_key TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  PRIMARY KEY (check_id, block_id),
  UNIQUE (check_id, position),
  FOREIGN KEY (check_id) REFERENCES learning_microchecks(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES study_lessons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_microcheck_evidence_localizations (
  check_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  bible_reference TEXT,
  PRIMARY KEY (check_id, block_id, locale),
  FOREIGN KEY (check_id, block_id) REFERENCES learning_microcheck_evidence(check_id, block_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_learning_microchecks_lesson
  ON learning_microchecks(lesson_id, position);
CREATE INDEX IF NOT EXISTS idx_learning_microchecks_trigger
  ON learning_microchecks(lesson_id, trigger_block_id);
CREATE INDEX IF NOT EXISTS idx_learning_microcheck_concepts_concept
  ON learning_microcheck_concepts(concept_id, check_id);
CREATE INDEX IF NOT EXISTS idx_learning_microcheck_options_check
  ON learning_microcheck_options(check_id, position);
CREATE INDEX IF NOT EXISTS idx_learning_microcheck_evidence_check
  ON learning_microcheck_evidence(check_id, position);
`;

function fail(message) {
  throw new Error(message);
}

function normalize(value) {
  return String(value ?? "").trim();
}

function loadRegistry(rootDir) {
  const registryPath = path.join(rootDir, "content", "learning", "microchecks.yaml");
  if (!fs.existsSync(registryPath)) fail(`No existe ${registryPath}`);
  const registry = yaml.load(fs.readFileSync(registryPath, "utf8"));
  if (!registry || typeof registry !== "object") fail("microchecks.yaml no contiene un objeto YAML válido");
  if (String(registry.schema_version) !== LEARNING_CHECKS_VERSION) {
    fail(`microchecks.yaml schema_version=${registry.schema_version}; esperado ${LEARNING_CHECKS_VERSION}`);
  }
  const requiredLocales = Array.isArray(registry.required_locales) ? registry.required_locales.map(String) : [];
  for (const locale of REQUIRED_LEARNING_CHECK_LOCALES) {
    if (!requiredLocales.includes(locale)) fail(`microchecks.yaml debe declarar locale requerido ${locale}`);
  }
  return registry;
}

export function ensureLearningCheckSchema(db) {
  db.exec(CHECK_SCHEMA_SQL);
}

export function indexLearningChecks(db, options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const clear = options.clear ?? true;
  ensureLearningCheckSchema(db);
  const registry = loadRegistry(rootDir);

  if (clear) {
    for (const table of [
      "learning_microcheck_evidence_localizations",
      "learning_microcheck_evidence",
      "learning_microcheck_option_localizations",
      "learning_microcheck_options",
      "learning_microcheck_concepts",
      "learning_microcheck_localizations",
      "learning_microchecks",
    ]) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
  }

  const insertCheck = db.prepare(`
    INSERT INTO learning_microchecks
      (id, lesson_id, trigger_block_id, trigger_block_key, objective_id, position, check_version, question_type, source_kind)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'single-choice', 'editorial-registry')
  `);
  const insertCheckLocale = db.prepare(`
    INSERT INTO learning_microcheck_localizations (check_id, locale, prompt)
    VALUES (?, ?, ?)
  `);
  const insertCheckConcept = db.prepare(`
    INSERT INTO learning_microcheck_concepts (check_id, concept_id, position)
    VALUES (?, ?, ?)
  `);
  const insertOption = db.prepare(`
    INSERT INTO learning_microcheck_options (id, check_id, option_key, position, is_correct)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertOptionLocale = db.prepare(`
    INSERT INTO learning_microcheck_option_localizations (option_id, locale, option_text, rationale)
    VALUES (?, ?, ?, ?)
  `);
  const insertEvidence = db.prepare(`
    INSERT INTO learning_microcheck_evidence
      (check_id, lesson_id, block_id, block_key, position)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertEvidenceLocale = db.prepare(`
    INSERT INTO learning_microcheck_evidence_localizations
      (check_id, block_id, locale, bible_reference)
    VALUES (?, ?, ?, ?)
  `);

  let checks = 0;
  let localizations = 0;
  let conceptLinks = 0;
  let optionsCount = 0;
  let optionLocalizations = 0;
  let evidenceLinks = 0;
  let evidenceLocalizations = 0;

  const lessons = registry.lessons && typeof registry.lessons === "object" ? registry.lessons : {};

  for (const [lessonId, lessonConfig] of Object.entries(lessons)) {
    const lessonExists = db.prepare("SELECT 1 FROM study_lessons WHERE id = ?").get(lessonId);
    if (!lessonExists) fail(`Microchecks referencia lesson_id desconocido: ${lessonId}`);

    const blocks = db.prepare(`
      SELECT block_id, block_key FROM lesson_learning_blocks
      WHERE lesson_id = ? AND locale = 'es'
      ORDER BY position
    `).all(lessonId);
    const blockByKey = new Map(blocks.map((row) => [row.block_key, row]));
    const checksConfig = Array.isArray(lessonConfig?.checks) ? lessonConfig.checks : [];

    for (let checkIndex = 0; checkIndex < checksConfig.length; checkIndex += 1) {
      const entry = checksConfig[checkIndex];
      const checkKey = normalize(entry?.check_key);
      if (!/^check-[0-9]{2}$/.test(checkKey)) fail(`${lessonId}: check_key inválido ${checkKey || "(vacío)"}`);
      const checkId = `${lessonId}--${checkKey}`;
      const triggerBlockKey = normalize(entry?.trigger_block);
      const triggerBlock = blockByKey.get(triggerBlockKey);
      if (!triggerBlock) fail(`${checkId}: trigger_block desconocido ${triggerBlockKey}`);

      const objectiveKey = normalize(entry?.objective_key);
      const objectiveId = `${lessonId}--${objectiveKey}`;
      const objective = db.prepare("SELECT 1 FROM learning_objectives WHERE id = ? AND lesson_id = ?").get(objectiveId, lessonId);
      if (!objective) fail(`${checkId}: objective_key desconocido ${objectiveKey}`);

      insertCheck.run(
        checkId,
        lessonId,
        triggerBlock.block_id,
        triggerBlockKey,
        objectiveId,
        checkIndex + 1,
        LEARNING_CHECKS_VERSION,
      );
      checks += 1;

      for (const locale of REQUIRED_LEARNING_CHECK_LOCALES) {
        const prompt = normalize(entry?.prompt?.[locale]);
        if (!prompt) fail(`${checkId}: falta prompt ${locale}`);
        insertCheckLocale.run(checkId, locale, prompt);
        localizations += 1;
      }

      const objectiveConceptIds = new Set(db.prepare(`
        SELECT concept_id FROM learning_objective_concepts WHERE objective_id = ?
      `).all(objectiveId).map((row) => row.concept_id));
      const conceptIds = Array.isArray(entry?.concepts) ? entry.concepts.map(normalize).filter(Boolean) : [];
      if (conceptIds.length === 0) fail(`${checkId}: debe vincular al menos un concept_id`);
      for (let conceptIndex = 0; conceptIndex < conceptIds.length; conceptIndex += 1) {
        const conceptId = conceptIds[conceptIndex];
        if (!objectiveConceptIds.has(conceptId)) fail(`${checkId}: concept_id ${conceptId} no pertenece al objetivo ${objectiveId}`);
        insertCheckConcept.run(checkId, conceptId, conceptIndex + 1);
        conceptLinks += 1;
      }

      const checkOptions = Array.isArray(entry?.options) ? entry.options : [];
      if (checkOptions.length < 3) fail(`${checkId}: debe incluir al menos 3 alternativas`);
      const correctCount = checkOptions.filter((option) => option?.correct === true).length;
      if (correctCount !== 1) fail(`${checkId}: debe existir exactamente una alternativa correcta`);
      const optionTextsByLocale = Object.fromEntries(REQUIRED_LEARNING_CHECK_LOCALES.map((locale) => [locale, new Set()]));

      for (let optionIndex = 0; optionIndex < checkOptions.length; optionIndex += 1) {
        const option = checkOptions[optionIndex];
        const optionKey = normalize(option?.option_key);
        if (!/^option-[a-z]$/.test(optionKey)) fail(`${checkId}: option_key inválido ${optionKey || "(vacío)"}`);
        const optionId = `${checkId}--${optionKey}`;
        insertOption.run(optionId, checkId, optionKey, optionIndex + 1, option.correct === true ? 1 : 0);
        optionsCount += 1;

        for (const locale of REQUIRED_LEARNING_CHECK_LOCALES) {
          const optionText = normalize(option?.text?.[locale]);
          const rationale = normalize(option?.rationale?.[locale]);
          if (!optionText || !rationale) fail(`${optionId}: falta texto/rationale ${locale}`);
          const normalizedText = optionText.toLocaleLowerCase(locale);
          if (optionTextsByLocale[locale].has(normalizedText)) fail(`${checkId}: alternativas duplicadas en ${locale}`);
          optionTextsByLocale[locale].add(normalizedText);
          insertOptionLocale.run(optionId, locale, optionText, rationale);
          optionLocalizations += 1;
        }
      }

      const evidence = Array.isArray(entry?.evidence) ? entry.evidence : [];
      if (evidence.length === 0) fail(`${checkId}: debe incluir evidencia`);
      for (let evidenceIndex = 0; evidenceIndex < evidence.length; evidenceIndex += 1) {
        const blockKey = normalize(evidence[evidenceIndex]?.block_key);
        const block = blockByKey.get(blockKey);
        if (!block) fail(`${checkId}: bloque de evidencia desconocido ${blockKey}`);
        insertEvidence.run(
          checkId,
          lessonId,
          block.block_id,
          blockKey,
          evidenceIndex + 1,
        );
        for (const locale of REQUIRED_LEARNING_CHECK_LOCALES) {
          const bibleReference = normalize(evidence[evidenceIndex]?.bible_reference?.[locale]);
          insertEvidenceLocale.run(checkId, block.block_id, locale, bibleReference || null);
          evidenceLocalizations += 1;
        }
        evidenceLinks += 1;
      }
    }
  }

  return { checks, localizations, conceptLinks, options: optionsCount, optionLocalizations, evidenceLinks, evidenceLocalizations };
}
