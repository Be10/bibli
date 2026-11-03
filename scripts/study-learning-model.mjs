import crypto from "node:crypto";

export const LEARNING_MODEL_VERSION = "1.0.0";
export const LEARNING_ID_STRATEGY = "semantic-v1";

const SECTION_MARKERS = [
  { marker: "🧭", blockKey: "context", blockType: "exposition", semanticRole: "context", ttsRole: "explanation" },
  { marker: "🕊️", blockKey: "revelation-about-god", blockType: "exposition", semanticRole: "revelation-about-god", ttsRole: "explanation" },
  { marker: "🪞", blockKey: "revelation-about-humanity", blockType: "exposition", semanticRole: "revelation-about-humanity", ttsRole: "explanation" },
  { marker: "✝️", blockKey: "christ-connection", blockType: "exposition", semanticRole: "christ-connection", ttsRole: "explanation" },
  { marker: "🧵", blockKey: "canonical-thread", blockType: "exposition", semanticRole: "canonical-thread", ttsRole: "explanation" },
  { marker: "🎯", blockKey: "application", blockType: "application", semanticRole: "application", ttsRole: "application" },
  { marker: "💭", blockKey: "reflection", blockType: "reflection", semanticRole: "reflection", ttsRole: "question" },
  { marker: "📝", blockKey: "summary", blockType: "summary", semanticRole: "summary", ttsRole: "summary" },
  { marker: "🙏", blockKey: "prayer", blockType: "prayer", semanticRole: "prayer", ttsRole: "prayer" },
];

const LEARNING_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS lesson_learning_models (
  lesson_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  model_version TEXT NOT NULL,
  id_strategy TEXT NOT NULL,
  title TEXT NOT NULL,
  primary_reference TEXT NOT NULL,
  translation TEXT NOT NULL,
  source_content_version TEXT NOT NULL,
  source_path TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  block_count INTEGER NOT NULL CHECK (block_count >= 2),
  PRIMARY KEY (lesson_id, locale),
  FOREIGN KEY (lesson_id) REFERENCES study_lessons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lesson_learning_blocks (
  lesson_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  block_id TEXT NOT NULL,
  block_key TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  block_type TEXT NOT NULL,
  semantic_role TEXT NOT NULL,
  heading TEXT,
  content_markdown TEXT NOT NULL DEFAULT '',
  content_text TEXT NOT NULL DEFAULT '',
  tts_role TEXT NOT NULL,
  bible_reference TEXT,
  bible_translation TEXT,
  source_kind TEXT NOT NULL,
  source_position INTEGER,
  PRIMARY KEY (lesson_id, locale, block_id),
  UNIQUE (lesson_id, locale, block_key),
  UNIQUE (lesson_id, locale, position),
  FOREIGN KEY (lesson_id, locale)
    REFERENCES lesson_learning_models(lesson_id, locale)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lesson_learning_models_locale
  ON lesson_learning_models(locale, lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_learning_blocks_lesson
  ON lesson_learning_blocks(lesson_id, locale, position);
CREATE INDEX IF NOT EXISTS idx_lesson_learning_blocks_role
  ON lesson_learning_blocks(semantic_role, lesson_id, locale);
`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeLocale(value) {
  const locale = String(value ?? "").trim().toLowerCase();
  assert(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(locale), `locale de aprendizaje inválido: ${value}`);
  return locale;
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value ?? "")).digest("hex");
}

function stripInlineMarkdown(value) {
  return String(value ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-+*]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/[*_~]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function markerRule(title) {
  const normalized = String(title ?? "").replace(/\uFE0F/g, "").trim();
  return SECTION_MARKERS.find((rule) => normalized.startsWith(rule.marker.replace(/\uFE0F/g, ""))) ?? null;
}

function uniqueKey(baseKey, occurrences) {
  const count = (occurrences.get(baseKey) ?? 0) + 1;
  occurrences.set(baseKey, count);
  return count === 1 ? baseKey : `${baseKey}-${String(count).padStart(2, "0")}`;
}

function createBlock({
  lessonId,
  blockKey,
  position,
  blockType,
  semanticRole,
  heading = null,
  contentMarkdown = "",
  ttsRole,
  bibleReference = null,
  bibleTranslation = null,
  sourceKind,
  sourcePosition = null,
}) {
  return {
    lesson_id: lessonId,
    block_id: `${lessonId}--${blockKey}`,
    block_key: blockKey,
    position,
    block_type: blockType,
    semantic_role: semanticRole,
    heading,
    content_markdown: String(contentMarkdown ?? "").trim(),
    content_text: stripInlineMarkdown(contentMarkdown),
    tts_role: ttsRole,
    bible_reference: bibleReference,
    bible_translation: bibleTranslation,
    source_kind: sourceKind,
    source_position: sourcePosition,
  };
}

export function ensureLearningSchema(db) {
  db.exec(LEARNING_SCHEMA_SQL);
}

export function compileStructuredLesson({
  lessonId,
  locale,
  title,
  primaryReference,
  translation,
  contentVersion,
  sourcePath,
  sourceText,
  parsed,
}) {
  assert(typeof lessonId === "string" && lessonId.trim(), "compileStructuredLesson: falta lessonId");
  assert(typeof title === "string" && title.trim(), `${lessonId}: falta title`);
  assert(typeof primaryReference === "string" && primaryReference.trim(), `${lessonId}: falta primaryReference`);
  assert(typeof translation === "string" && translation.trim(), `${lessonId}: falta translation`);
  assert(typeof contentVersion === "string" && contentVersion.trim(), `${lessonId}: falta contentVersion`);
  assert(typeof sourcePath === "string" && sourcePath.trim(), `${lessonId}: falta sourcePath`);
  assert(parsed && typeof parsed === "object", `${lessonId}: falta documento Markdown parseado`);

  const normalizedLocale = normalizeLocale(locale);
  const sectionEntries = Array.isArray(parsed.sectionEntries) ? parsed.sectionEntries : [];
  const blocks = [];
  const keyOccurrences = new Map();
  let position = 1;
  let expositionIndex = 0;

  const titleKey = uniqueKey("title", keyOccurrences);
  blocks.push(createBlock({
    lessonId,
    blockKey: titleKey,
    position: position++,
    blockType: "title",
    semanticRole: "title",
    heading: title.trim(),
    contentMarkdown: title.trim(),
    ttsRole: "title",
    sourceKind: "markdown-h1",
    sourcePosition: 1,
  }));

  const readingKey = uniqueKey("primary-reading", keyOccurrences);
  blocks.push(createBlock({
    lessonId,
    blockKey: readingKey,
    position: position++,
    blockType: "scripture",
    semanticRole: "primary-reading",
    contentMarkdown: `${primaryReference.trim()}, ${translation.trim()}`,
    ttsRole: "bible-reading",
    bibleReference: primaryReference.trim(),
    bibleTranslation: translation.trim(),
    sourceKind: "markdown-reading",
    sourcePosition: 1,
  }));

  for (const section of sectionEntries) {
    const rule = markerRule(section.title);
    let baseKey;
    let blockType;
    let semanticRole;
    let ttsRole;

    if (rule) {
      baseKey = rule.blockKey;
      blockType = rule.blockType;
      semanticRole = rule.semanticRole;
      ttsRole = rule.ttsRole;
    } else {
      expositionIndex += 1;
      baseKey = `exposition-${String(expositionIndex).padStart(2, "0")}`;
      blockType = "exposition";
      semanticRole = "exposition";
      ttsRole = "explanation";
    }

    const blockKey = uniqueKey(baseKey, keyOccurrences);
    blocks.push(createBlock({
      lessonId,
      blockKey,
      position: position++,
      blockType,
      semanticRole,
      heading: String(section.title ?? "").trim() || null,
      contentMarkdown: section.content,
      ttsRole,
      sourceKind: "markdown-h2",
      sourcePosition: Number.isInteger(section.position) ? section.position : null,
    }));
  }

  const model = {
    lesson_id: lessonId.trim(),
    locale: normalizedLocale,
    model_version: LEARNING_MODEL_VERSION,
    id_strategy: LEARNING_ID_STRATEGY,
    title: title.trim(),
    primary_reference: primaryReference.trim(),
    translation: translation.trim(),
    source_content_version: contentVersion.trim(),
    source_path: sourcePath.trim(),
    source_sha256: sha256(sourceText),
    block_count: blocks.length,
    blocks: blocks.map((block) => ({ ...block, locale: normalizedLocale })),
  };

  assertStructuredLesson(model);
  return model;
}

export function assertStructuredLesson(model) {
  assert(model && typeof model === "object", "modelo educativo inválido");
  assert(typeof model.lesson_id === "string" && model.lesson_id, "modelo educativo sin lesson_id");
  normalizeLocale(model.locale);
  assert(model.model_version === LEARNING_MODEL_VERSION, `${model.lesson_id}: model_version no soportada`);
  assert(model.id_strategy === LEARNING_ID_STRATEGY, `${model.lesson_id}: id_strategy no soportada`);
  assert(/^[a-f0-9]{64}$/.test(model.source_sha256), `${model.lesson_id}: source_sha256 inválido`);
  assert(Array.isArray(model.blocks) && model.blocks.length >= 2, `${model.lesson_id}: modelo sin bloques suficientes`);
  assert(model.block_count === model.blocks.length, `${model.lesson_id}: block_count inconsistente`);

  const ids = new Set();
  const keys = new Set();
  for (let index = 0; index < model.blocks.length; index += 1) {
    const block = model.blocks[index];
    assert(block.lesson_id === model.lesson_id, `${model.lesson_id}: bloque con lesson_id inconsistente`);
    assert(block.locale === model.locale, `${model.lesson_id}: bloque con locale inconsistente`);
    assert(block.position === index + 1, `${model.lesson_id}: posiciones de bloque no contiguas`);
    assert(block.block_id === `${model.lesson_id}--${block.block_key}`, `${model.lesson_id}: block_id no estable`);
    assert(!ids.has(block.block_id), `${model.lesson_id}: block_id duplicado ${block.block_id}`);
    assert(!keys.has(block.block_key), `${model.lesson_id}: block_key duplicado ${block.block_key}`);
    ids.add(block.block_id);
    keys.add(block.block_key);
  }

  for (const requiredKey of ["title", "primary-reading", "context", "summary", "prayer"]) {
    assert(keys.has(requiredKey), `${model.lesson_id}: falta bloque requerido ${requiredKey}`);
  }

  return true;
}
