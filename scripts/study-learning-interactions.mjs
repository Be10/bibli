import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export const LEARNING_INTERACTIONS_VERSION = "1.0.0";
export const REQUIRED_LEARNING_INTERACTION_LOCALES = ["es", "en"];
export const SUPPORTED_LEARNING_INTERACTION_TYPES = ["key-idea", "comparison", "visual-resource"];

const INTERACTION_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS learning_interactive_blocks (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  anchor_block_id TEXT NOT NULL,
  anchor_block_key TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  interaction_version TEXT NOT NULL,
  interaction_type TEXT NOT NULL,
  presentation TEXT NOT NULL DEFAULT 'inline',
  resource_id TEXT,
  source_kind TEXT NOT NULL DEFAULT 'editorial-registry',
  UNIQUE (lesson_id, anchor_block_id, position),
  FOREIGN KEY (lesson_id) REFERENCES study_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (resource_id) REFERENCES visual_resources(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS learning_interactive_block_localizations (
  interaction_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  eyebrow TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  instruction TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (interaction_id, locale),
  FOREIGN KEY (interaction_id) REFERENCES learning_interactive_blocks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_interactive_block_concepts (
  interaction_id TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  PRIMARY KEY (interaction_id, concept_id),
  UNIQUE (interaction_id, position),
  FOREIGN KEY (interaction_id) REFERENCES learning_interactive_blocks(id) ON DELETE CASCADE,
  FOREIGN KEY (concept_id) REFERENCES learning_concepts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_interactive_items (
  id TEXT PRIMARY KEY,
  interaction_id TEXT NOT NULL,
  item_key TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  UNIQUE (interaction_id, item_key),
  UNIQUE (interaction_id, position),
  FOREIGN KEY (interaction_id) REFERENCES learning_interactive_blocks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_interactive_item_localizations (
  item_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  PRIMARY KEY (item_id, locale),
  FOREIGN KEY (item_id) REFERENCES learning_interactive_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_learning_interactive_blocks_lesson
  ON learning_interactive_blocks(lesson_id, anchor_block_id, position);
CREATE INDEX IF NOT EXISTS idx_learning_interactive_blocks_type
  ON learning_interactive_blocks(interaction_type, lesson_id);
CREATE INDEX IF NOT EXISTS idx_learning_interactive_block_concepts_concept
  ON learning_interactive_block_concepts(concept_id, interaction_id);
CREATE INDEX IF NOT EXISTS idx_learning_interactive_items_interaction
  ON learning_interactive_items(interaction_id, position);
`;

function fail(message) {
  throw new Error(message);
}

function normalize(value) {
  return String(value ?? "").trim();
}

function loadRegistry(rootDir) {
  const registryPath = path.join(rootDir, "content", "learning", "interactive-blocks.yaml");
  if (!fs.existsSync(registryPath)) fail(`No existe ${registryPath}`);
  const registry = yaml.load(fs.readFileSync(registryPath, "utf8"));
  if (!registry || typeof registry !== "object") fail("interactive-blocks.yaml no contiene un objeto YAML válido");
  if (String(registry.schema_version) !== LEARNING_INTERACTIONS_VERSION) {
    fail(`interactive-blocks.yaml schema_version=${registry.schema_version}; esperado ${LEARNING_INTERACTIONS_VERSION}`);
  }
  const requiredLocales = Array.isArray(registry.required_locales) ? registry.required_locales.map(String) : [];
  for (const locale of REQUIRED_LEARNING_INTERACTION_LOCALES) {
    if (!requiredLocales.includes(locale)) fail(`interactive-blocks.yaml debe declarar locale requerido ${locale}`);
  }
  return registry;
}

export function ensureLearningInteractionSchema(db) {
  db.exec(INTERACTION_SCHEMA_SQL);
}

export function indexLearningInteractions(db, options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const clear = options.clear ?? true;
  ensureLearningInteractionSchema(db);
  const registry = loadRegistry(rootDir);

  if (clear) {
    for (const table of [
      "learning_interactive_item_localizations",
      "learning_interactive_items",
      "learning_interactive_block_concepts",
      "learning_interactive_block_localizations",
      "learning_interactive_blocks",
    ]) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
  }

  const insertInteraction = db.prepare(`
    INSERT INTO learning_interactive_blocks
      (id, lesson_id, anchor_block_id, anchor_block_key, position, interaction_version,
       interaction_type, presentation, resource_id, source_kind)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'editorial-registry')
  `);
  const insertLocale = db.prepare(`
    INSERT INTO learning_interactive_block_localizations
      (interaction_id, locale, eyebrow, title, body, instruction)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertConcept = db.prepare(`
    INSERT INTO learning_interactive_block_concepts (interaction_id, concept_id, position)
    VALUES (?, ?, ?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO learning_interactive_items (id, interaction_id, item_key, position)
    VALUES (?, ?, ?, ?)
  `);
  const insertItemLocale = db.prepare(`
    INSERT INTO learning_interactive_item_localizations (item_id, locale, label, title, body)
    VALUES (?, ?, ?, ?, ?)
  `);

  let interactions = 0;
  let localizations = 0;
  let conceptLinks = 0;
  let items = 0;
  let itemLocalizations = 0;

  for (const [lessonId, config] of Object.entries(registry.lessons ?? {})) {
    const lessonExists = db.prepare("SELECT 1 FROM study_lessons WHERE id = ?").get(lessonId);
    if (!lessonExists) fail(`Interactive blocks referencia lesson_id desconocido: ${lessonId}`);

    const lessonBlocks = db.prepare(`
      SELECT block_id, block_key FROM lesson_learning_blocks
      WHERE lesson_id = ? AND locale = 'es'
      ORDER BY position
    `).all(lessonId);
    const blockByKey = new Map(lessonBlocks.map((row) => [row.block_key, row]));
    const lessonConcepts = new Set(db.prepare(`
      SELECT concept_id FROM lesson_learning_concepts WHERE lesson_id = ?
    `).all(lessonId).map((row) => row.concept_id));
    const interactionConfigs = Array.isArray(config?.interactions) ? config.interactions : [];

    for (let interactionIndex = 0; interactionIndex < interactionConfigs.length; interactionIndex += 1) {
      const entry = interactionConfigs[interactionIndex];
      const interactionKey = normalize(entry?.interaction_key);
      if (!/^interaction-[0-9]{2}$/.test(interactionKey)) {
        fail(`${lessonId}: interaction_key inválido ${interactionKey || "(vacío)"}`);
      }
      const interactionId = `${lessonId}--${interactionKey}`;
      const interactionType = normalize(entry?.interaction_type);
      if (!SUPPORTED_LEARNING_INTERACTION_TYPES.includes(interactionType)) {
        fail(`${interactionId}: interaction_type no soportado ${interactionType || "(vacío)"}`);
      }
      const anchorBlockKey = normalize(entry?.anchor_block);
      const anchorBlock = blockByKey.get(anchorBlockKey);
      if (!anchorBlock) fail(`${interactionId}: anchor_block desconocido ${anchorBlockKey}`);
      const presentation = normalize(entry?.presentation) || "inline";
      const resourceId = normalize(entry?.resource_id) || null;

      if (interactionType === "visual-resource") {
        if (!resourceId) fail(`${interactionId}: visual-resource requiere resource_id`);
        const resource = db.prepare("SELECT 1 FROM visual_resources WHERE id = ?").get(resourceId);
        if (!resource) fail(`${interactionId}: resource_id desconocido ${resourceId}`);
      } else if (resourceId) {
        fail(`${interactionId}: resource_id solo se admite para visual-resource`);
      }

      insertInteraction.run(
        interactionId,
        lessonId,
        anchorBlock.block_id,
        anchorBlockKey,
        interactionIndex + 1,
        LEARNING_INTERACTIONS_VERSION,
        interactionType,
        presentation,
        resourceId,
      );
      interactions += 1;

      for (const locale of REQUIRED_LEARNING_INTERACTION_LOCALES) {
        const loc = entry?.localizations?.[locale] ?? {};
        const eyebrow = normalize(loc.eyebrow);
        const title = normalize(loc.title);
        const body = normalize(loc.body);
        const instruction = normalize(loc.instruction);
        if (!title || !body) fail(`${interactionId}: falta title/body ${locale}`);
        insertLocale.run(interactionId, locale, eyebrow, title, body, instruction);
        localizations += 1;
      }

      const concepts = Array.isArray(entry?.concepts) ? entry.concepts.map(normalize).filter(Boolean) : [];
      if (concepts.length === 0) fail(`${interactionId}: debe vincular al menos un concept_id`);
      for (let conceptIndex = 0; conceptIndex < concepts.length; conceptIndex += 1) {
        const conceptId = concepts[conceptIndex];
        if (!lessonConcepts.has(conceptId)) fail(`${interactionId}: concept_id ${conceptId} no pertenece a la lección`);
        insertConcept.run(interactionId, conceptId, conceptIndex + 1);
        conceptLinks += 1;
      }

      const interactionItems = Array.isArray(entry?.items) ? entry.items : [];
      if (interactionType === "comparison" && interactionItems.length < 2) {
        fail(`${interactionId}: comparison requiere al menos 2 items`);
      }
      if (interactionType === "key-idea" && interactionItems.length !== 0) {
        fail(`${interactionId}: key-idea no debe declarar items`);
      }

      const itemKeys = new Set();
      for (let itemIndex = 0; itemIndex < interactionItems.length; itemIndex += 1) {
        const item = interactionItems[itemIndex];
        const itemKey = normalize(item?.item_key);
        if (!/^[a-z0-9][a-z0-9-]*$/.test(itemKey)) fail(`${interactionId}: item_key inválido ${itemKey || "(vacío)"}`);
        if (itemKeys.has(itemKey)) fail(`${interactionId}: item_key duplicado ${itemKey}`);
        itemKeys.add(itemKey);
        const itemId = `${interactionId}--${itemKey}`;
        insertItem.run(itemId, interactionId, itemKey, itemIndex + 1);
        items += 1;

        for (const locale of REQUIRED_LEARNING_INTERACTION_LOCALES) {
          const loc = item?.localizations?.[locale] ?? {};
          const label = normalize(loc.label);
          const title = normalize(loc.title);
          const body = normalize(loc.body);
          if (!title || !body) fail(`${itemId}: falta title/body ${locale}`);
          insertItemLocale.run(itemId, locale, label, title, body);
          itemLocalizations += 1;
        }
      }
    }
  }

  return { interactions, localizations, conceptLinks, items, itemLocalizations };
}
