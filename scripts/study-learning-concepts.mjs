import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export const LEARNING_CONCEPT_SCHEMA_VERSION = "1.0.0";
export const REQUIRED_CONCEPT_LOCALES = ["es", "en"];

const IMPORTANCE_VALUES = new Set(["core", "supporting"]);
const BLOCK_RELATION_ROLES = new Set(["introduces", "explains", "connects", "applies", "summarizes"]);

const CONCEPT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS learning_concepts (
  id TEXT PRIMARY KEY,
  concept_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  source_kind TEXT NOT NULL DEFAULT 'editorial-registry'
);

CREATE TABLE IF NOT EXISTS learning_concept_localizations (
  concept_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  label TEXT NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (concept_id, locale),
  FOREIGN KEY (concept_id) REFERENCES learning_concepts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lesson_learning_concepts (
  lesson_id TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  importance TEXT NOT NULL CHECK (importance IN ('core', 'supporting')),
  source_kind TEXT NOT NULL DEFAULT 'editorial-registry',
  PRIMARY KEY (lesson_id, concept_id),
  FOREIGN KEY (lesson_id) REFERENCES study_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (concept_id) REFERENCES learning_concepts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lesson_learning_block_concepts (
  lesson_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  block_key TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  relation_role TEXT NOT NULL,
  source_kind TEXT NOT NULL DEFAULT 'editorial-registry',
  PRIMARY KEY (lesson_id, block_id, concept_id),
  FOREIGN KEY (lesson_id) REFERENCES study_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (concept_id) REFERENCES learning_concepts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_learning_concept_localizations_locale
  ON learning_concept_localizations(locale, label);
CREATE INDEX IF NOT EXISTS idx_lesson_learning_concepts_lesson
  ON lesson_learning_concepts(lesson_id, importance, concept_id);
CREATE INDEX IF NOT EXISTS idx_lesson_learning_concepts_concept
  ON lesson_learning_concepts(concept_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_learning_block_concepts_block
  ON lesson_learning_block_concepts(lesson_id, block_id, concept_id);
CREATE INDEX IF NOT EXISTS idx_lesson_learning_block_concepts_concept
  ON lesson_learning_block_concepts(concept_id, lesson_id, block_id);
`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeLocale(value) {
  const locale = String(value ?? "").trim().toLowerCase();
  assert(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(locale), `locale de concepto inválido: ${value}`);
  return locale;
}

function assertConceptId(value) {
  assert(
    typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
    `concept_id inválido: ${value}`,
  );
}

export function ensureLearningConceptSchema(db) {
  db.exec(CONCEPT_SCHEMA_SQL);
}

export function loadLearningConceptRegistry(rootDir = process.cwd()) {
  const registryPath = path.join(rootDir, "content", "learning", "concepts.yaml");
  if (!fs.existsSync(registryPath)) throw new Error(`No existe ${registryPath}`);

  const raw = yaml.load(fs.readFileSync(registryPath, "utf8"));
  assert(raw && typeof raw === "object", "content/learning/concepts.yaml inválido");
  assert(String(raw.schema_version) === LEARNING_CONCEPT_SCHEMA_VERSION, "schema_version de conceptos no soportada");

  const requiredLocales = Array.isArray(raw.required_locales)
    ? raw.required_locales.map(normalizeLocale)
    : [...REQUIRED_CONCEPT_LOCALES];
  for (const locale of REQUIRED_CONCEPT_LOCALES) {
    assert(requiredLocales.includes(locale), `concepts.yaml debe requerir locale ${locale}`);
  }

  const concepts = Array.isArray(raw.concepts) ? raw.concepts : [];
  assert(concepts.length > 0, "concepts.yaml no contiene conceptos");

  const seenConceptIds = new Set();
  for (const concept of concepts) {
    assertConceptId(concept.concept_id);
    assert(!seenConceptIds.has(concept.concept_id), `concept_id duplicado: ${concept.concept_id}`);
    seenConceptIds.add(concept.concept_id);

    assert(concept.status === "active" || concept.status === "draft", `${concept.concept_id}: status inválido`);
    assert(concept.labels && typeof concept.labels === "object", `${concept.concept_id}: faltan labels`);
    assert(concept.descriptions && typeof concept.descriptions === "object", `${concept.concept_id}: faltan descriptions`);

    for (const locale of requiredLocales) {
      assert(typeof concept.labels[locale] === "string" && concept.labels[locale].trim(), `${concept.concept_id}: falta label ${locale}`);
      assert(
        typeof concept.descriptions[locale] === "string" && concept.descriptions[locale].trim(),
        `${concept.concept_id}: falta description ${locale}`,
      );
    }

    const occurrences = Array.isArray(concept.occurrences) ? concept.occurrences : [];
    assert(occurrences.length > 0, `${concept.concept_id}: debe tener al menos una occurrence`);
    const seenLessons = new Set();
    for (const occurrence of occurrences) {
      assert(typeof occurrence.lesson_id === "string" && occurrence.lesson_id.trim(), `${concept.concept_id}: occurrence sin lesson_id`);
      assert(!seenLessons.has(occurrence.lesson_id), `${concept.concept_id}: lesson_id duplicado ${occurrence.lesson_id}`);
      seenLessons.add(occurrence.lesson_id);
      assert(IMPORTANCE_VALUES.has(occurrence.importance), `${concept.concept_id}/${occurrence.lesson_id}: importance inválida`);

      const blocks = Array.isArray(occurrence.blocks) ? occurrence.blocks : [];
      assert(blocks.length > 0, `${concept.concept_id}/${occurrence.lesson_id}: faltan bloques`);
      const seenBlockKeys = new Set();
      for (const block of blocks) {
        assert(typeof block.block_key === "string" && block.block_key.trim(), `${concept.concept_id}: block_key inválido`);
        assert(!seenBlockKeys.has(block.block_key), `${concept.concept_id}: block_key duplicado ${block.block_key}`);
        seenBlockKeys.add(block.block_key);
        assert(
          BLOCK_RELATION_ROLES.has(block.relation_role),
          `${concept.concept_id}/${block.block_key}: relation_role inválido`,
        );
      }
    }
  }

  return {
    schemaVersion: String(raw.schema_version),
    requiredLocales,
    concepts,
    registryPath,
  };
}

export function indexLearningConcepts(db, options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const clear = options.clear ?? true;
  ensureLearningConceptSchema(db);
  const registry = loadLearningConceptRegistry(rootDir);

  if (clear) {
    for (const table of [
      "lesson_learning_block_concepts",
      "lesson_learning_concepts",
      "learning_concept_localizations",
      "learning_concepts",
    ]) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
  }

  const insertConcept = db.prepare(`
    INSERT INTO learning_concepts (id, concept_version, status, source_kind)
    VALUES (?, ?, ?, 'editorial-registry')
  `);
  const insertLocalization = db.prepare(`
    INSERT INTO learning_concept_localizations
      (concept_id, locale, label, short_description)
    VALUES (?, ?, ?, ?)
  `);
  const insertLessonConcept = db.prepare(`
    INSERT INTO lesson_learning_concepts
      (lesson_id, concept_id, importance, source_kind)
    VALUES (?, ?, ?, 'editorial-registry')
  `);
  const insertBlockConcept = db.prepare(`
    INSERT INTO lesson_learning_block_concepts
      (lesson_id, block_id, block_key, concept_id, relation_role, source_kind)
    VALUES (?, ?, ?, ?, ?, 'editorial-registry')
  `);

  let localizationCount = 0;
  let lessonLinkCount = 0;
  let blockLinkCount = 0;

  for (const concept of registry.concepts) {
    insertConcept.run(concept.concept_id, registry.schemaVersion, concept.status);
    for (const locale of registry.requiredLocales) {
      insertLocalization.run(
        concept.concept_id,
        locale,
        concept.labels[locale].trim(),
        concept.descriptions[locale].trim(),
      );
      localizationCount += 1;
    }

    for (const occurrence of concept.occurrences) {
      const lesson = db.prepare("SELECT id FROM study_lessons WHERE id = ?").get(occurrence.lesson_id);
      assert(lesson, `${concept.concept_id}: lesson_id desconocido ${occurrence.lesson_id}`);

      const modelCount = db.prepare(`
        SELECT COUNT(*) AS n FROM lesson_learning_models WHERE lesson_id = ?
      `).get(occurrence.lesson_id).n;
      assert(modelCount > 0, `${concept.concept_id}: la lección ${occurrence.lesson_id} no tiene modelo educativo`);

      insertLessonConcept.run(occurrence.lesson_id, concept.concept_id, occurrence.importance);
      lessonLinkCount += 1;

      for (const blockLink of occurrence.blocks) {
        const blockRows = db.prepare(`
          SELECT locale, block_id
          FROM lesson_learning_blocks
          WHERE lesson_id = ? AND block_key = ?
          ORDER BY locale
        `).all(occurrence.lesson_id, blockLink.block_key);

        assert(blockRows.length > 0, `${concept.concept_id}: block_key desconocido ${occurrence.lesson_id}/${blockLink.block_key}`);
        const blockIds = new Set(blockRows.map((row) => row.block_id));
        assert(blockIds.size === 1, `${concept.concept_id}: block_id no es neutral al idioma para ${blockLink.block_key}`);

        const locales = new Set(blockRows.map((row) => row.locale));
        const modelLocales = db.prepare(`
          SELECT locale FROM lesson_learning_models WHERE lesson_id = ? ORDER BY locale
        `).all(occurrence.lesson_id).map((row) => row.locale);
        for (const locale of modelLocales) {
          assert(locales.has(locale), `${concept.concept_id}: falta ${blockLink.block_key} en locale ${locale}`);
        }

        insertBlockConcept.run(
          occurrence.lesson_id,
          [...blockIds][0],
          blockLink.block_key,
          concept.concept_id,
          blockLink.relation_role,
        );
        blockLinkCount += 1;
      }
    }
  }

  return {
    concepts: registry.concepts.length,
    localizations: localizationCount,
    lessonLinks: lessonLinkCount,
    blockLinks: blockLinkCount,
  };
}
