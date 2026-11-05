import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import yaml from "js-yaml";
import {
  LEARNING_INTERACTIONS_VERSION,
  REQUIRED_LEARNING_INTERACTION_LOCALES,
  SUPPORTED_LEARNING_INTERACTION_TYPES,
} from "./study-learning-interactions.mjs";

const rootDir = process.cwd();
const dbPath = path.join(rootDir, "data", "bibli.sqlite");
const registryPath = path.join(rootDir, "content", "learning", "interactive-blocks.yaml");

function fail(message) {
  throw new Error(message);
}

if (!fs.existsSync(dbPath)) fail(`No existe ${dbPath}`);
if (!fs.existsSync(registryPath)) fail(`No existe ${registryPath}`);
const registry = yaml.load(fs.readFileSync(registryPath, "utf8"));
if (String(registry?.schema_version) !== LEARNING_INTERACTIONS_VERSION) {
  fail(`interactive-blocks.yaml schema_version inválido: ${registry?.schema_version}`);
}

const db = new Database(dbPath, { readonly: true });

try {
  const requiredTables = [
    "learning_interactive_blocks",
    "learning_interactive_block_localizations",
    "learning_interactive_block_concepts",
    "learning_interactive_items",
    "learning_interactive_item_localizations",
  ];
  for (const table of requiredTables) {
    const exists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
    if (!exists) fail(`Falta tabla ${table}`);
  }

  const expected = { interactions: 0, localizations: 0, conceptLinks: 0, items: 0, itemLocalizations: 0 };

  for (const [lessonId, config] of Object.entries(registry?.lessons ?? {})) {
    const interactions = Array.isArray(config?.interactions) ? config.interactions : [];
    for (let interactionIndex = 0; interactionIndex < interactions.length; interactionIndex += 1) {
      const entry = interactions[interactionIndex];
      const interactionId = `${lessonId}--${entry.interaction_key}`;
      const row = db.prepare(`
        SELECT lesson_id, anchor_block_key, position, interaction_version, interaction_type, presentation, resource_id
        FROM learning_interactive_blocks WHERE id = ?
      `).get(interactionId);
      if (!row) fail(`Interactive block no indexado: ${interactionId}`);
      if (row.lesson_id !== lessonId || row.position !== interactionIndex + 1) fail(`${interactionId}: identidad/posición inválida`);
      if (row.anchor_block_key !== entry.anchor_block) fail(`${interactionId}: anchor_block no coincide`);
      if (row.interaction_version !== LEARNING_INTERACTIONS_VERSION) fail(`${interactionId}: version inválida`);
      if (!SUPPORTED_LEARNING_INTERACTION_TYPES.includes(row.interaction_type) || row.interaction_type !== entry.interaction_type) {
        fail(`${interactionId}: interaction_type inválido`);
      }
      if (row.presentation !== (String(entry.presentation ?? "inline").trim() || "inline")) fail(`${interactionId}: presentation no coincide`);
      if ((row.resource_id ?? null) !== (entry.resource_id ? String(entry.resource_id).trim() : null)) fail(`${interactionId}: resource_id no coincide`);
      expected.interactions += 1;

      for (const locale of REQUIRED_LEARNING_INTERACTION_LOCALES) {
        const loc = db.prepare(`
          SELECT eyebrow, title, body, instruction
          FROM learning_interactive_block_localizations
          WHERE interaction_id=? AND locale=?
        `).get(interactionId, locale);
        const source = entry.localizations?.[locale] ?? {};
        if (!loc) fail(`${interactionId}: falta localización ${locale}`);
        if (loc.eyebrow !== String(source.eyebrow ?? "").trim()) fail(`${interactionId}: eyebrow ${locale} no coincide`);
        if (loc.title !== String(source.title ?? "").trim()) fail(`${interactionId}: title ${locale} no coincide`);
        if (loc.body !== String(source.body ?? "").trim()) fail(`${interactionId}: body ${locale} no coincide`);
        if (loc.instruction !== String(source.instruction ?? "").trim()) fail(`${interactionId}: instruction ${locale} no coincide`);
        expected.localizations += 1;
      }

      const expectedConcepts = (entry.concepts ?? []).map(String);
      const actualConcepts = db.prepare(`
        SELECT concept_id FROM learning_interactive_block_concepts
        WHERE interaction_id=? ORDER BY position
      `).all(interactionId).map((item) => item.concept_id);
      if (JSON.stringify(actualConcepts) !== JSON.stringify(expectedConcepts)) fail(`${interactionId}: concept_ids no coinciden`);
      expected.conceptLinks += expectedConcepts.length;

      const expectedItems = entry.items ?? [];
      const actualItems = db.prepare(`
        SELECT id, item_key FROM learning_interactive_items
        WHERE interaction_id=? ORDER BY position
      `).all(interactionId);
      if (actualItems.length !== expectedItems.length) fail(`${interactionId}: número de items no coincide`);
      for (let itemIndex = 0; itemIndex < expectedItems.length; itemIndex += 1) {
        const expectedItem = expectedItems[itemIndex];
        const actualItem = actualItems[itemIndex];
        if (actualItem.item_key !== expectedItem.item_key) fail(`${interactionId}: item_key no coincide en posición ${itemIndex + 1}`);
        for (const locale of REQUIRED_LEARNING_INTERACTION_LOCALES) {
          const loc = db.prepare(`
            SELECT label, title, body FROM learning_interactive_item_localizations
            WHERE item_id=? AND locale=?
          `).get(actualItem.id, locale);
          const source = expectedItem.localizations?.[locale] ?? {};
          if (!loc) fail(`${actualItem.id}: falta localización ${locale}`);
          if (loc.label !== String(source.label ?? "").trim()) fail(`${actualItem.id}: label ${locale} no coincide`);
          if (loc.title !== String(source.title ?? "").trim()) fail(`${actualItem.id}: title ${locale} no coincide`);
          if (loc.body !== String(source.body ?? "").trim()) fail(`${actualItem.id}: body ${locale} no coincide`);
          expected.itemLocalizations += 1;
        }
        expected.items += 1;
      }
    }
  }

  const counts = {
    interactions: db.prepare("SELECT COUNT(*) AS n FROM learning_interactive_blocks").get().n,
    localizations: db.prepare("SELECT COUNT(*) AS n FROM learning_interactive_block_localizations").get().n,
    conceptLinks: db.prepare("SELECT COUNT(*) AS n FROM learning_interactive_block_concepts").get().n,
    items: db.prepare("SELECT COUNT(*) AS n FROM learning_interactive_items").get().n,
    itemLocalizations: db.prepare("SELECT COUNT(*) AS n FROM learning_interactive_item_localizations").get().n,
  };
  for (const key of Object.keys(expected)) {
    if (counts[key] !== expected[key]) fail(`${key}=${counts[key]}; esperado ${expected[key]}`);
  }

  console.log("Validación de bloques interactivos: PASS");
  console.log(`Bloques interactivos: ${counts.interactions}`);
  console.log(`Localizaciones de bloques: ${counts.localizations}`);
  console.log(`Vínculos interacción-concepto: ${counts.conceptLinks}`);
  console.log(`Items interactivos: ${counts.items}`);
  console.log(`Localizaciones de items: ${counts.itemLocalizations}`);
} finally {
  db.close();
}
