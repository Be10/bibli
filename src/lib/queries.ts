import { db } from "./db";
import { DEFAULT_BIBLE_VERSION_ID } from "./bible-config";

export type Route = {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  level: string | null;
  estimated_duration: string | null;
  language: string;
  status: string;
};

export type RouteModule = {
  id: string;
  route_id: string;
  title: string;
  slug: string;
  description: string | null;
  position: number;
  status: string;
};

export type Lesson = {
  id: string;
  route_id: string;
  lesson_number: number;
  title: string;
  slug: string;
  eyebrow: string | null;
  main_idea: string | null;
  objective: string | null;
  summary: string | null;
  explanation: string | null;
  remember: string | null;
  application: string | null;
  estimated_time: string | null;
  status: string;
  book_id?: string;
  primary_reference?: string;
  translation?: string;
  content_version?: string;
  source_path?: string;
  search_text?: string;
  module_id?: string | null;
  module_title?: string | null;
};

export type LessonBibleRef = {
  id: string;
  lesson_id: string;
  reference: string;
  note: string | null;
  position: number;
};

export type LessonPoint = {
  id: string;
  lesson_id: string;
  point_text: string;
  position: number;
};

export type LessonQuestion = {
  id: string;
  lesson_id: string;
  question_text: string;
  position: number;
};

export type LessonLearningModel = {
  lesson_id: string;
  locale: string;
  model_version: string;
  id_strategy: string;
  title: string;
  primary_reference: string;
  translation: string;
  source_content_version: string;
  source_path: string;
  source_sha256: string;
  block_count: number;
};

export type LessonLearningBlock = {
  lesson_id: string;
  locale: string;
  block_id: string;
  block_key: string;
  position: number;
  block_type: string;
  semantic_role: string;
  heading: string | null;
  content_markdown: string;
  content_text: string;
  tts_role: string;
  bible_reference: string | null;
  bible_translation: string | null;
  source_kind: string;
  source_position: number | null;
};

export type LearningObjective = {
  objective_id: string;
  lesson_id: string;
  position: number;
  locale: string;
  objective_text: string;
  concept_ids: string[];
  evidence_block_ids: string[];
  evidence_block_keys: string[];
};

export type ContextualGlossaryTerm = {
  lesson_id: string;
  block_id: string;
  block_key: string;
  glossary_id: string;
  position: number;
  locale: string;
  term: string;
  definition: string;
  slug: string;
};

export type LearningMicrocheckOption = {
  option_id: string;
  option_key: string;
  position: number;
  is_correct: boolean;
  option_text: string;
  rationale: string;
};

export type LearningMicrocheckEvidence = {
  block_id: string;
  block_key: string;
  position: number;
  bible_reference: string | null;
};

export type LearningMicrocheck = {
  check_id: string;
  lesson_id: string;
  trigger_block_id: string;
  trigger_block_key: string;
  objective_id: string;
  position: number;
  locale: string;
  prompt: string;
  concept_ids: string[];
  options: LearningMicrocheckOption[];
  evidence: LearningMicrocheckEvidence[];
};

export type LearningInteractiveItem = {
  item_id: string;
  item_key: string;
  position: number;
  locale: string;
  label: string;
  title: string;
  body: string;
};

export type LearningInteractiveBlock = {
  interaction_id: string;
  lesson_id: string;
  anchor_block_id: string;
  anchor_block_key: string;
  position: number;
  interaction_version: string;
  interaction_type: "key-idea" | "comparison" | "visual-resource";
  presentation: string;
  resource_id: string | null;
  locale: string;
  eyebrow: string;
  title: string;
  body: string;
  instruction: string;
  concept_ids: string[];
  items: LearningInteractiveItem[];
  resource_title: string | null;
  resource_type: string | null;
  resource_description: string | null;
  resource_alt_text: string | null;
  resource_url: string | null;
};

export type StructuredLesson = LessonLearningModel & {
  blocks: LessonLearningBlock[];
  objectives: LearningObjective[];
  contextual_glossary: ContextualGlossaryTerm[];
  microchecks: LearningMicrocheck[];
  interactive_blocks: LearningInteractiveBlock[];
  concepts: LessonLearningConcept[];
};

export type LearningConcept = {
  concept_id: string;
  concept_version: string;
  status: string;
  source_kind: string;
  locale: string;
  label: string;
  short_description: string;
};

export type LessonLearningConcept = LearningConcept & {
  importance: "core" | "supporting";
  review_block_id: string | null;
  review_block_key: string | null;
};

export type BlockLearningConcept = LessonLearningConcept & {
  block_id: string;
  block_key: string;
  relation_role: string;
};

export type LearningReviewCatalogItem = {
  concept_id: string;
  label: string;
  short_description: string;
  importance: "core" | "supporting";
  lesson_id: string;
  lesson_slug: string;
  lesson_title: string;
  review_block_key: string | null;
  check: LearningMicrocheck;
};


export type RelatedItem = {
  title: string;
  slug: string;
  definition?: string | null;
  summary?: string | null;
};

export function getRouteBySlug(slug: string): Route | undefined {
  return db
    .prepare("SELECT * FROM routes WHERE slug = ?")
    .get(slug) as Route | undefined;
}

export function getRouteModules(routeId: string): RouteModule[] {
  return db.prepare(`
    SELECT * FROM route_modules
    WHERE route_id = ? AND status != 'Borrador'
    ORDER BY position ASC
  `).all(routeId) as RouteModule[];
}

export function getRoutesByLessonId(lessonId: string): Route[] {
  return db.prepare(`
    SELECT routes.*
    FROM route_lessons
    JOIN routes ON routes.id = route_lessons.route_id
    WHERE route_lessons.lesson_id = ?
    ORDER BY route_lessons.is_primary DESC, routes.title ASC
  `).all(lessonId) as Route[];
}

export function getLessonsByRouteId(routeId: string): Lesson[] {
  return db
    .prepare(
      `
      SELECT
        study_lessons.id,
        route_lessons.route_id,
        route_lessons.position AS lesson_number,
        study_lessons.title,
        study_lessons.slug,
        NULL AS eyebrow,
        NULL AS main_idea,
        NULL AS objective,
        'Estudio de ' || study_lessons.primary_reference AS summary,
        NULL AS explanation,
        NULL AS remember,
        NULL AS application,
        CAST(study_lessons.estimated_minutes AS TEXT) || ' min' AS estimated_time,
        study_lessons.status,
        study_lessons.book_id,
        study_lessons.primary_reference,
        study_lessons.translation,
        study_lessons.content_version,
        study_lessons.source_path,
        study_lessons.search_text,
        route_lessons.module_id,
        route_modules.title AS module_title
      FROM route_lessons
      JOIN study_lessons ON study_lessons.id = route_lessons.lesson_id
      LEFT JOIN route_modules ON route_modules.id = route_lessons.module_id
      WHERE route_lessons.route_id = ?
      ORDER BY route_lessons.position ASC
      `
    )
    .all(routeId) as Lesson[];
}

export function getLessonBySlug(slug: string): Lesson | undefined {
  return db
    .prepare("SELECT * FROM lessons WHERE slug = ?")
    .get(slug) as Lesson | undefined;
}

export function getBibleRefsByLessonId(lessonId: string): LessonBibleRef[] {
  const row = db.prepare(
    `SELECT id, primary_reference FROM study_lessons WHERE id = ?`
  ).get(lessonId) as { id: string; primary_reference: string } | undefined;

  if (!row) return [];
  return [{
    id: `${row.id}--primary`,
    lesson_id: row.id,
    reference: row.primary_reference,
    note: "Referencia principal",
    position: 1,
  }];
}

export function getPointsByLessonId(_lessonId: string): LessonPoint[] {
  return [];
}

export function getQuestionsByLessonId(_lessonId: string): LessonQuestion[] {
  return [];
}

function hasDatabaseTable(tableName: string): boolean {
  return Boolean(db.prepare(`
    SELECT 1
    FROM sqlite_master
    WHERE type = 'table' AND name = ?
    LIMIT 1
  `).get(tableName));
}

export function getLearningModelByLessonId(
  lessonId: string,
  locale = "es",
): LessonLearningModel | undefined {
  if (!hasDatabaseTable("lesson_learning_models")) return undefined;
  return db.prepare(`
    SELECT *
    FROM lesson_learning_models
    WHERE lesson_id = ? AND locale = ?
  `).get(lessonId, locale) as LessonLearningModel | undefined;
}

export function getLearningBlocksByLessonId(
  lessonId: string,
  locale = "es",
): LessonLearningBlock[] {
  if (!hasDatabaseTable("lesson_learning_blocks")) return [];
  return db.prepare(`
    SELECT *
    FROM lesson_learning_blocks
    WHERE lesson_id = ? AND locale = ?
    ORDER BY position ASC
  `).all(lessonId, locale) as LessonLearningBlock[];
}

export function getLearningObjectivesByLessonId(
  lessonId: string,
  locale = "es",
): LearningObjective[] {
  if (!hasDatabaseTable("learning_objectives") || !hasDatabaseTable("learning_objective_localizations")) return [];
  const rows = db.prepare(`
    SELECT
      o.id AS objective_id, o.lesson_id, o.position,
      l.locale, l.objective_text
    FROM learning_objectives o
    JOIN learning_objective_localizations l ON l.objective_id = o.id
    WHERE o.lesson_id = ? AND l.locale = ?
    ORDER BY o.position ASC
  `).all(lessonId, locale) as Array<Omit<LearningObjective, "concept_ids" | "evidence_block_ids" | "evidence_block_keys">>;

  const concepts = hasDatabaseTable("learning_objective_concepts")
    ? db.prepare(`
        SELECT concept_id FROM learning_objective_concepts
        WHERE objective_id = ? ORDER BY position ASC
      `)
    : null;
  const blocks = hasDatabaseTable("learning_objective_blocks")
    ? db.prepare(`
        SELECT block_id, block_key FROM learning_objective_blocks
        WHERE objective_id = ? ORDER BY position ASC
      `)
    : null;

  return rows.map((row) => {
    const conceptRows = concepts ? concepts.all(row.objective_id) as Array<{ concept_id: string }> : [];
    const blockRows = blocks ? blocks.all(row.objective_id) as Array<{ block_id: string; block_key: string }> : [];
    return {
      ...row,
      concept_ids: conceptRows.map((item) => item.concept_id),
      evidence_block_ids: blockRows.map((item) => item.block_id),
      evidence_block_keys: blockRows.map((item) => item.block_key),
    };
  });
}

export function getContextualGlossaryByLessonId(
  lessonId: string,
  locale = "es",
): ContextualGlossaryTerm[] {
  if (!hasDatabaseTable("lesson_learning_glossary_links") || !hasDatabaseTable("glossary_term_localizations")) return [];
  return db.prepare(`
    SELECT
      gl.lesson_id, gl.block_id, gl.block_key, gl.glossary_id, gl.position,
      loc.locale, loc.term, loc.definition, g.slug
    FROM lesson_learning_glossary_links gl
    JOIN glossary_term_localizations loc
      ON loc.glossary_id = gl.glossary_id
     AND loc.locale = ?
    JOIN glossary_terms g ON g.id = gl.glossary_id
    JOIN lesson_learning_blocks b
      ON b.lesson_id = gl.lesson_id
     AND b.block_id = gl.block_id
     AND b.locale = ?
    WHERE gl.lesson_id = ?
    ORDER BY b.position ASC, gl.position ASC
  `).all(locale, locale, lessonId) as ContextualGlossaryTerm[];
}

export function getLearningMicrochecksByLessonId(
  lessonId: string,
  locale = "es",
): LearningMicrocheck[] {
  const requiredTables = [
    "learning_microchecks",
    "learning_microcheck_localizations",
    "learning_microcheck_concepts",
    "learning_microcheck_options",
    "learning_microcheck_option_localizations",
    "learning_microcheck_evidence",
    "learning_microcheck_evidence_localizations",
  ];
  if (requiredTables.some((table) => !hasDatabaseTable(table))) return [];

  const rows = db.prepare(`
    SELECT
      c.id AS check_id, c.lesson_id, c.trigger_block_id, c.trigger_block_key,
      c.objective_id, c.position, l.locale, l.prompt
    FROM learning_microchecks c
    JOIN learning_microcheck_localizations l ON l.check_id = c.id
    WHERE c.lesson_id = ? AND l.locale = ?
    ORDER BY c.position ASC
  `).all(lessonId, locale) as Array<Omit<LearningMicrocheck, "concept_ids" | "options" | "evidence">>;

  const conceptStmt = db.prepare(`
    SELECT concept_id FROM learning_microcheck_concepts
    WHERE check_id = ? ORDER BY position ASC
  `);
  const optionStmt = db.prepare(`
    SELECT
      o.id AS option_id, o.option_key, o.position, o.is_correct,
      l.option_text, l.rationale
    FROM learning_microcheck_options o
    JOIN learning_microcheck_option_localizations l
      ON l.option_id = o.id AND l.locale = ?
    WHERE o.check_id = ?
    ORDER BY o.position ASC
  `);
  const evidenceStmt = db.prepare(`
    SELECT e.block_id, e.block_key, e.position, l.bible_reference
    FROM learning_microcheck_evidence e
    LEFT JOIN learning_microcheck_evidence_localizations l
      ON l.check_id = e.check_id
     AND l.block_id = e.block_id
     AND l.locale = ?
    WHERE e.check_id = ?
    ORDER BY e.position ASC
  `);

  return rows.map((row) => ({
    ...row,
    concept_ids: (conceptStmt.all(row.check_id) as Array<{ concept_id: string }>).map((item) => item.concept_id),
    options: (optionStmt.all(locale, row.check_id) as Array<Omit<LearningMicrocheckOption, "is_correct"> & { is_correct: number }>).map((option) => ({
      ...option,
      is_correct: option.is_correct === 1,
    })),
    evidence: evidenceStmt.all(locale, row.check_id) as LearningMicrocheckEvidence[],
  }));
}

export function getLearningInteractiveBlocksByLessonId(
  lessonId: string,
  locale = "es",
): LearningInteractiveBlock[] {
  const requiredTables = [
    "learning_interactive_blocks",
    "learning_interactive_block_localizations",
    "learning_interactive_block_concepts",
    "learning_interactive_items",
    "learning_interactive_item_localizations",
  ];
  if (requiredTables.some((table) => !hasDatabaseTable(table))) return [];

  const rows = db.prepare(`
    SELECT
      i.id AS interaction_id, i.lesson_id, i.anchor_block_id, i.anchor_block_key,
      i.position, i.interaction_version, i.interaction_type, i.presentation, i.resource_id,
      l.locale, l.eyebrow, l.title, l.body, l.instruction,
      vr.title AS resource_title, vr.resource_type, vr.description AS resource_description,
      vr.alt_text AS resource_alt_text, vr.url AS resource_url
    FROM learning_interactive_blocks i
    JOIN learning_interactive_block_localizations l
      ON l.interaction_id = i.id AND l.locale = ?
    LEFT JOIN visual_resources vr ON vr.id = i.resource_id
    JOIN lesson_learning_blocks b
      ON b.lesson_id = i.lesson_id
     AND b.block_id = i.anchor_block_id
     AND b.locale = ?
    WHERE i.lesson_id = ?
    ORDER BY b.position ASC, i.position ASC
  `).all(locale, locale, lessonId) as Array<Omit<LearningInteractiveBlock, "concept_ids" | "items">>;

  const conceptStmt = db.prepare(`
    SELECT concept_id FROM learning_interactive_block_concepts
    WHERE interaction_id = ? ORDER BY position ASC
  `);
  const itemStmt = db.prepare(`
    SELECT
      item.id AS item_id, item.item_key, item.position, loc.locale,
      loc.label, loc.title, loc.body
    FROM learning_interactive_items item
    JOIN learning_interactive_item_localizations loc
      ON loc.item_id = item.id AND loc.locale = ?
    WHERE item.interaction_id = ?
    ORDER BY item.position ASC
  `);

  return rows.map((row) => ({
    ...row,
    concept_ids: (conceptStmt.all(row.interaction_id) as Array<{ concept_id: string }>).map((item) => item.concept_id),
    items: itemStmt.all(locale, row.interaction_id) as LearningInteractiveItem[],
  }));
}

export function getStructuredLessonByLessonId(
  lessonId: string,
  locale = "es",
): StructuredLesson | undefined {
  const model = getLearningModelByLessonId(lessonId, locale);
  if (!model) return undefined;
  return {
    ...model,
    blocks: getLearningBlocksByLessonId(lessonId, locale),
    objectives: getLearningObjectivesByLessonId(lessonId, locale),
    contextual_glossary: getContextualGlossaryByLessonId(lessonId, locale),
    microchecks: getLearningMicrochecksByLessonId(lessonId, locale),
    interactive_blocks: getLearningInteractiveBlocksByLessonId(lessonId, locale),
    concepts: getLearningConceptsByLessonId(lessonId, locale),
  };
}

export function getLearningConceptById(
  conceptId: string,
  locale = "es",
): LearningConcept | undefined {
  return db.prepare(`
    SELECT
      c.id AS concept_id, c.concept_version, c.status, c.source_kind,
      l.locale, l.label, l.short_description
    FROM learning_concepts c
    JOIN learning_concept_localizations l ON l.concept_id = c.id
    WHERE c.id = ? AND l.locale = ?
  `).get(conceptId, locale) as LearningConcept | undefined;
}

export function getLearningConceptsByLessonId(
  lessonId: string,
  locale = "es",
): LessonLearningConcept[] {
  const requiredTables = [
    "learning_concepts",
    "learning_concept_localizations",
    "lesson_learning_concepts",
    "lesson_learning_block_concepts",
    "lesson_learning_blocks",
  ];
  if (requiredTables.some((table) => !hasDatabaseTable(table))) return [];

  return db.prepare(`
    SELECT
      c.id AS concept_id, c.concept_version, c.status, c.source_kind,
      l.locale, l.label, l.short_description, lc.importance,
      (
        SELECT bc.block_id
        FROM lesson_learning_block_concepts bc
        JOIN lesson_learning_blocks b
          ON b.lesson_id = bc.lesson_id
         AND b.block_id = bc.block_id
         AND b.locale = ?
        WHERE bc.lesson_id = lc.lesson_id
          AND bc.concept_id = lc.concept_id
        ORDER BY
          CASE bc.relation_role
            WHEN 'explains' THEN 0
            WHEN 'introduces' THEN 1
            WHEN 'summarizes' THEN 2
            WHEN 'connects' THEN 3
            WHEN 'applies' THEN 4
            ELSE 5
          END,
          b.position ASC
        LIMIT 1
      ) AS review_block_id,
      (
        SELECT bc.block_key
        FROM lesson_learning_block_concepts bc
        JOIN lesson_learning_blocks b
          ON b.lesson_id = bc.lesson_id
         AND b.block_id = bc.block_id
         AND b.locale = ?
        WHERE bc.lesson_id = lc.lesson_id
          AND bc.concept_id = lc.concept_id
        ORDER BY
          CASE bc.relation_role
            WHEN 'explains' THEN 0
            WHEN 'introduces' THEN 1
            WHEN 'summarizes' THEN 2
            WHEN 'connects' THEN 3
            WHEN 'applies' THEN 4
            ELSE 5
          END,
          b.position ASC
        LIMIT 1
      ) AS review_block_key
    FROM lesson_learning_concepts lc
    JOIN learning_concepts c ON c.id = lc.concept_id
    JOIN learning_concept_localizations l
      ON l.concept_id = c.id
     AND l.locale = ?
    WHERE lc.lesson_id = ?
    ORDER BY CASE lc.importance WHEN 'core' THEN 0 ELSE 1 END, l.label ASC
  `).all(locale, locale, locale, lessonId) as LessonLearningConcept[];
}

export function getLearningReviewCatalog(
  locale = "es",
): LearningReviewCatalogItem[] {
  const requiredTables = [
    "learning_concepts",
    "learning_concept_localizations",
    "lesson_learning_concepts",
    "learning_microchecks",
    "learning_microcheck_concepts",
    "study_lessons",
  ];
  if (requiredTables.some((table) => !hasDatabaseTable(table))) return [];

  const rows = db.prepare(`
    SELECT
      lc.lesson_id, lc.concept_id, lc.importance,
      cl.label, cl.short_description,
      sl.slug AS lesson_slug, sl.title AS lesson_title,
      mc.id AS check_id, mc.position AS check_position
    FROM lesson_learning_concepts lc
    JOIN learning_concepts c ON c.id = lc.concept_id
    JOIN learning_concept_localizations cl
      ON cl.concept_id = c.id
     AND cl.locale = ?
    JOIN study_lessons sl ON sl.id = lc.lesson_id
    JOIN learning_microcheck_concepts mcc ON mcc.concept_id = lc.concept_id
    JOIN learning_microchecks mc
      ON mc.id = mcc.check_id
     AND mc.lesson_id = lc.lesson_id
    WHERE c.status = 'active'
    ORDER BY
      CASE lc.importance WHEN 'core' THEN 0 ELSE 1 END,
      mc.position ASC,
      cl.label ASC
  `).all(locale) as Array<{
    lesson_id: string;
    concept_id: string;
    importance: "core" | "supporting";
    label: string;
    short_description: string;
    lesson_slug: string;
    lesson_title: string;
    check_id: string;
    check_position: number;
  }>;

  const lessonConcepts = new Map<string, LessonLearningConcept[]>();
  const lessonChecks = new Map<string, LearningMicrocheck[]>();
  const seen = new Set<string>();
  const catalog: LearningReviewCatalogItem[] = [];

  for (const row of rows) {
    const key = `${row.lesson_id}:${row.concept_id}`;
    if (seen.has(key)) continue;
    if (!lessonConcepts.has(row.lesson_id)) {
      lessonConcepts.set(row.lesson_id, getLearningConceptsByLessonId(row.lesson_id, locale));
    }
    if (!lessonChecks.has(row.lesson_id)) {
      lessonChecks.set(row.lesson_id, getLearningMicrochecksByLessonId(row.lesson_id, locale));
    }
    const concept = lessonConcepts.get(row.lesson_id)?.find((item) => item.concept_id === row.concept_id);
    const check = lessonChecks.get(row.lesson_id)?.find((item) => item.check_id === row.check_id);
    if (!check) continue;
    seen.add(key);
    catalog.push({
      concept_id: row.concept_id,
      label: row.label,
      short_description: row.short_description,
      importance: row.importance,
      lesson_id: row.lesson_id,
      lesson_slug: row.lesson_slug,
      lesson_title: row.lesson_title,
      review_block_key: concept?.review_block_key ?? null,
      check,
    });
  }

  return catalog;
}

export function getLearningConceptsByBlockId(
  lessonId: string,
  blockId: string,
  locale = "es",
): BlockLearningConcept[] {
  return db.prepare(`
    SELECT
      c.id AS concept_id, c.concept_version, c.status, c.source_kind,
      l.locale, l.label, l.short_description,
      lc.importance, bc.block_id, bc.block_key, bc.relation_role
    FROM lesson_learning_block_concepts bc
    JOIN lesson_learning_concepts lc
      ON lc.lesson_id = bc.lesson_id
     AND lc.concept_id = bc.concept_id
    JOIN learning_concepts c ON c.id = bc.concept_id
    JOIN learning_concept_localizations l
      ON l.concept_id = c.id
     AND l.locale = ?
    WHERE bc.lesson_id = ? AND bc.block_id = ?
    ORDER BY CASE lc.importance WHEN 'core' THEN 0 ELSE 1 END, l.label ASC
  `).all(locale, lessonId, blockId) as BlockLearningConcept[];
}

export function getTopicsByLessonId(lessonId: string): RelatedItem[] {
  return db
    .prepare(
      `
      SELECT topics.title, topics.slug, topics.definition
      FROM lesson_topics
      JOIN topics ON topics.id = lesson_topics.topic_id
      WHERE lesson_topics.lesson_id = ?
      ORDER BY topics.title ASC
      `
    )
    .all(lessonId) as RelatedItem[];
}

export function getLessonsByTopicId(topicId: string): Lesson[] {
  return db
    .prepare(
      `
      SELECT lessons.*
      FROM lesson_topics
      JOIN lessons ON lessons.id = lesson_topics.lesson_id
      WHERE
        lesson_topics.topic_id = ?
        AND lessons.status != 'Borrador'
      ORDER BY lessons.lesson_number ASC
      `
    )
    .all(topicId) as Lesson[];
}

export function getPeopleByLessonId(lessonId: string): RelatedItem[] {
  return db
    .prepare(
      `
      SELECT people.name AS title, people.slug, people.summary
      FROM lesson_people
      JOIN people ON people.id = lesson_people.person_id
      WHERE lesson_people.lesson_id = ?
      ORDER BY people.name ASC
      `
    )
    .all(lessonId) as RelatedItem[];
}

export function getPlacesByLessonId(lessonId: string): RelatedItem[] {
  return db
    .prepare(
      `
      SELECT places.name AS title, places.slug, places.summary
      FROM lesson_places
      JOIN places ON places.id = lesson_places.place_id
      WHERE lesson_places.lesson_id = ?
      ORDER BY places.name ASC
      `
    )
    .all(lessonId) as RelatedItem[];
}

export type StudyPlace = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  latitude: number | null;
  longitude: number | null;
  map_zoom: number | null;
};

export function getStudyPlacesByLessonId(lessonId: string): StudyPlace[] {
  return db.prepare(`
    SELECT places.id, places.name AS title, places.slug, places.summary,
           places.latitude, places.longitude, places.map_zoom
    FROM lesson_places
    JOIN places ON places.id = lesson_places.place_id
    WHERE lesson_places.lesson_id = ?
    ORDER BY places.name ASC
  `).all(lessonId) as StudyPlace[];
}

export function getLessonsByPlaceId(placeId: string): Lesson[] {
  return db
    .prepare(
      `
      SELECT lessons.*
      FROM lesson_places
      JOIN lessons ON lessons.id = lesson_places.lesson_id
      WHERE
        lesson_places.place_id = ?
        AND lessons.status != 'Borrador'
      ORDER BY lessons.lesson_number ASC
      `
    )
    .all(placeId) as Lesson[];
}

export function getGlossaryByLessonId(lessonId: string): RelatedItem[] {
  return db
    .prepare(
      `
      SELECT glossary_terms.term AS title, glossary_terms.slug, glossary_terms.definition
      FROM lesson_glossary
      JOIN glossary_terms ON glossary_terms.id = lesson_glossary.glossary_id
      WHERE lesson_glossary.lesson_id = ?
      ORDER BY glossary_terms.term ASC
      `
    )
    .all(lessonId) as RelatedItem[];
}

export function getLessonsByGlossaryId(glossaryId: string): Lesson[] {
  return db
    .prepare(
      `
      SELECT lessons.*
      FROM lesson_glossary
      JOIN lessons ON lessons.id = lesson_glossary.lesson_id
      WHERE
        lesson_glossary.glossary_id = ?
        AND lessons.status != 'Borrador'
      ORDER BY lessons.lesson_number ASC
      `
    )
    .all(glossaryId) as Lesson[];
}

export function getAllRoutes(): Route[] {
  return db
    .prepare(
      `
      SELECT *
      FROM routes
      ORDER BY title ASC
      `
    )
    .all() as Route[];
}

export function getAllLessons(): Lesson[] {
  return db
    .prepare(
      `
      SELECT *
      FROM lessons
      ORDER BY lesson_number ASC
      `
    )
    .all() as Lesson[];
}

export type Topic = {
  id: string;
  title: string;
  slug: string;
  definition: string | null;
  status: string;
};

export type Person = {
  id: string;
  name: string;
  slug: string;
  summary: string | null;
  status: string;
};

export type Place = {
  id: string;
  name: string;
  slug: string;
  place_type: string | null;
  summary: string | null;
  latitude: number | null;
  longitude: number | null;
  map_zoom: number | null;
  geographical_certainty: string | null;
  status: string;
};

export type GlossaryTerm = {
  id: string;
  term: string;
  slug: string;
  definition: string | null;
  status: string;
};

export function getAllTopics(): Topic[] {
  return db
    .prepare(
      `
      SELECT *
      FROM topics
      ORDER BY title ASC
      `
    )
    .all() as Topic[];
}

export function getTopicBySlug(slug: string): Topic | undefined {
  return db
    .prepare("SELECT * FROM topics WHERE slug = ?")
    .get(slug) as Topic | undefined;
}

export function getAllPeople(): Person[] {
  return db
    .prepare(
      `
      SELECT *
      FROM people
      ORDER BY name ASC
      `
    )
    .all() as Person[];
}

export function getPersonBySlug(slug: string): Person | undefined {
  return db
    .prepare("SELECT * FROM people WHERE slug = ?")
    .get(slug) as Person | undefined;
}

export function getAllPlaces(): Place[] {
  return db
    .prepare(
      `
      SELECT *
      FROM places
      ORDER BY name ASC
      `
    )
    .all() as Place[];
}

export function getPlaceBySlug(slug: string): Place | undefined {
  return db
    .prepare("SELECT * FROM places WHERE slug = ?")
    .get(slug) as Place | undefined;
}

export function getAllGlossaryTerms(): GlossaryTerm[] {
  return db
    .prepare(
      `
      SELECT *
      FROM glossary_terms
      ORDER BY term ASC
      `
    )
    .all() as GlossaryTerm[];
}

export function getGlossaryTermBySlug(slug: string): GlossaryTerm | undefined {
  return db
    .prepare("SELECT * FROM glossary_terms WHERE slug = ?")
    .get(slug) as GlossaryTerm | undefined;
}

export type Event = {
  id: string;
  title: string;
  slug: string;
  event_type: string | null;
  summary: string | null;
  description: string | null;
  biblical_period: string | null;
  approximate_date: string | null;
  chronological_order: number | null;
  temporal_certainty: string | null;
  geographical_certainty: string | null;
  appears_on_timeline: number;
  appears_on_map: number;
  status: string;
};

export function getAllEvents(): Event[] {
  return db
    .prepare(
      `
      SELECT *
      FROM events
      ORDER BY chronological_order ASC, title ASC
      `
    )
    .all() as Event[];
}

export function getEventsByLessonId(lessonId: string): Event[] {
  return db
    .prepare(
      `
      SELECT events.*
      FROM lesson_events
      JOIN events ON events.id = lesson_events.event_id
      WHERE lesson_events.lesson_id = ?
      ORDER BY events.chronological_order ASC, events.title ASC
      `
    )
    .all(lessonId) as Event[];
}

export function getLessonsByEventId(eventId: string): Lesson[] {
  return db
    .prepare(
      `
      SELECT lessons.*
      FROM lesson_events
      JOIN lessons ON lessons.id = lesson_events.lesson_id
      WHERE
        lesson_events.event_id = ?
        AND lessons.status != 'Borrador'
      ORDER BY lessons.lesson_number ASC
      `
    )
    .all(eventId) as Lesson[];
}

export type MapPlace = {
  id: string;
  name: string;
  slug: string;
  place_type: string | null;
  summary: string | null;
  latitude: number;
  longitude: number;
  map_zoom: number | null;
  geographical_certainty: string | null;
};

export function getMapPlaces(): MapPlace[] {
  return db
    .prepare(
      `
      SELECT
        id,
        name,
        slug,
        place_type,
        summary,
        latitude,
        longitude,
        map_zoom,
        geographical_certainty
      FROM places
      WHERE
        status != 'Borrador'
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
      ORDER BY name ASC
      `
    )
    .all() as MapPlace[];
}

export function getEventsByPlaceId(placeId: string): Event[] {
  return db
    .prepare(
      `
      SELECT events.*
      FROM event_places
      JOIN events ON events.id = event_places.event_id
      WHERE
        event_places.place_id = ?
        AND events.status != 'Borrador'
      ORDER BY events.chronological_order ASC, events.title ASC
      `
    )
    .all(placeId) as Event[];
}

export type EventRelatedPlace = {
  id: string;
  title: string;
  slug: string;
  place_type: string | null;
  summary: string | null;
  latitude: number | null;
  longitude: number | null;
  geographical_certainty: string | null;
};

export type DerivedEventRelatedPlace = EventRelatedPlace & {
  via_event_count: number;
  evidence_events: Event[];
};

export type DerivedRelatedItem = RelatedItem & {
  id: string;
  via_event_count: number;
  evidence_events: Event[];
};

export function getPeopleByEventId(eventId: string): RelatedItem[] {
  return db
    .prepare(
      `
      SELECT people.name AS title, people.slug, people.summary
      FROM event_people
      JOIN people ON people.id = event_people.person_id
      WHERE event_people.event_id = ?
      ORDER BY people.name ASC
      `
    )
    .all(eventId) as RelatedItem[];
}

export function getEventsByPersonId(personId: string): Event[] {
  return db
    .prepare(
      `
      SELECT events.*
      FROM event_people
      JOIN events ON events.id = event_people.event_id
      WHERE
        event_people.person_id = ?
        AND events.status != 'Borrador'
      ORDER BY events.chronological_order ASC, events.title ASC
      `
    )
    .all(personId) as Event[];
}

export function getLessonsByPersonId(personId: string): Lesson[] {
  return db
    .prepare(
      `
      SELECT lessons.*
      FROM lesson_people
      JOIN lessons ON lessons.id = lesson_people.lesson_id
      WHERE
        lesson_people.person_id = ?
        AND lessons.status != 'Borrador'
      ORDER BY lessons.lesson_number ASC
      `
    )
    .all(personId) as Lesson[];
}

export function getEventsByPersonAndPlaceIds(personId: string, placeId: string): Event[] {
  return db
    .prepare(
      `
      SELECT DISTINCT events.*
      FROM events
      JOIN event_people ON event_people.event_id = events.id
      JOIN event_places ON event_places.event_id = events.id
      WHERE
        event_people.person_id = ?
        AND event_places.place_id = ?
        AND events.status != 'Borrador'
      ORDER BY events.chronological_order ASC, events.title ASC
      `
    )
    .all(personId, placeId) as Event[];
}

export function getPlacesByPersonIdViaEvents(personId: string): DerivedEventRelatedPlace[] {
  const places = db
    .prepare(
      `
      SELECT
        places.id,
        places.name AS title,
        places.slug,
        places.place_type,
        places.summary,
        places.latitude,
        places.longitude,
        places.geographical_certainty,
        COUNT(DISTINCT event_people.event_id) AS via_event_count
      FROM event_people
      JOIN event_places ON event_places.event_id = event_people.event_id
      JOIN events ON events.id = event_people.event_id
      JOIN places ON places.id = event_places.place_id
      WHERE
        event_people.person_id = ?
        AND events.status != 'Borrador'
        AND places.status != 'Borrador'
      GROUP BY
        places.id,
        places.name,
        places.slug,
        places.place_type,
        places.summary,
        places.latitude,
        places.longitude,
        places.geographical_certainty
      ORDER BY places.name ASC
      `
    )
    .all(personId) as Array<Omit<DerivedEventRelatedPlace, 'evidence_events'>>;

  return places.map((place) => ({
    ...place,
    evidence_events: getEventsByPersonAndPlaceIds(personId, place.id),
  }));
}

/** @deprecated Use getPlacesByPersonIdViaEvents to preserve derived provenance. */
export function getPlacesByPersonId(personId: string): DerivedEventRelatedPlace[] {
  return getPlacesByPersonIdViaEvents(personId);
}

export function getPeopleByPlaceIdViaEvents(placeId: string): DerivedRelatedItem[] {
  const people = db
    .prepare(
      `
      SELECT
        people.id,
        people.name AS title,
        people.slug,
        people.summary,
        COUNT(DISTINCT event_places.event_id) AS via_event_count
      FROM event_places
      JOIN event_people ON event_people.event_id = event_places.event_id
      JOIN events ON events.id = event_places.event_id
      JOIN people ON people.id = event_people.person_id
      WHERE
        event_places.place_id = ?
        AND events.status != 'Borrador'
        AND people.status != 'Borrador'
      GROUP BY people.id, people.name, people.slug, people.summary
      ORDER BY people.name ASC
      `
    )
    .all(placeId) as Array<Omit<DerivedRelatedItem, 'evidence_events'>>;

  return people.map((person) => ({
    ...person,
    evidence_events: getEventsByPersonAndPlaceIds(person.id, placeId),
  }));
}

export function getPlacesByEventId(eventId: string): EventRelatedPlace[] {
  return db
    .prepare(
      `
      SELECT
        places.id,
        places.name AS title,
        places.slug,
        places.place_type,
        places.summary,
        places.latitude,
        places.longitude,
        places.geographical_certainty
      FROM event_places
      JOIN places ON places.id = event_places.place_id
      WHERE event_places.event_id = ?
      ORDER BY places.name ASC
      `
    )
    .all(eventId) as EventRelatedPlace[];
}

export function getTopicsByEventId(eventId: string): RelatedItem[] {
  return db
    .prepare(
      `
      SELECT topics.title, topics.slug, topics.definition
      FROM event_topics
      JOIN topics ON topics.id = event_topics.topic_id
      WHERE event_topics.event_id = ?
      ORDER BY topics.title ASC
      `
    )
    .all(eventId) as RelatedItem[];
}

export function getEventsByTopicId(topicId: string): Event[] {
  return db
    .prepare(
      `
      SELECT events.*
      FROM event_topics
      JOIN events ON events.id = event_topics.event_id
      WHERE
        event_topics.topic_id = ?
        AND events.status != 'Borrador'
      ORDER BY events.chronological_order ASC, events.title ASC
      `
    )
    .all(topicId) as Event[];
}

export type Book = {
  id: string;
  usfm_code: string;
  name: string;
  slug: string;
  abbreviation: string | null;
  testament: string;
  order_number: number;
  category: string | null;
  genre: string | null;
  summary: string | null;
  status: string;
};

export type BookTranslation = {
  book_id: string;
  language: string;
  name: string;
  slug: string;
  abbreviation: string | null;
  testament: string;
  category: string | null;
  genre: string | null;
  summary: string | null;
};

export function getAllBooks(): Book[] {
  return db
    .prepare(
      `
      SELECT *
      FROM books
      ORDER BY order_number ASC
      `
    )
    .all() as Book[];
}

export function getBookById(bookId: string): Book | undefined {
  return db.prepare(`SELECT * FROM books WHERE id = ? LIMIT 1`).get(bookId) as Book | undefined;
}

export function getAllBooksByLanguage(language: string): Book[] {
  return db
    .prepare(
      `
      SELECT
        books.id,
        books.usfm_code,
        book_translations.name AS name,
        book_translations.slug AS slug,
        book_translations.abbreviation AS abbreviation,
        book_translations.testament AS testament,
        books.order_number,
        book_translations.category AS category,
        book_translations.genre AS genre,
        book_translations.summary AS summary,
        books.status
      FROM books
      JOIN book_translations
        ON book_translations.book_id = books.id
        AND book_translations.language = ?
      ORDER BY books.order_number ASC
      `
    )
    .all(language) as Book[];
}

export function getBookByLocalizedSlug(
  slug: string,
  language: string
): Book | undefined {
  return db
    .prepare(
      `
      SELECT
        books.id,
        books.usfm_code,
        book_translations.name AS name,
        book_translations.slug AS slug,
        book_translations.abbreviation AS abbreviation,
        book_translations.testament AS testament,
        books.order_number,
        book_translations.category AS category,
        book_translations.genre AS genre,
        book_translations.summary AS summary,
        books.status
      FROM books
      JOIN book_translations
        ON book_translations.book_id = books.id
      WHERE
        book_translations.language = ?
        AND book_translations.slug = ?
      LIMIT 1
      `
    )
    .get(language, slug) as Book | undefined;
}

export function getBooksByLessonId(lessonId: string): Book[] {
  return db
    .prepare(
      `
      SELECT books.*
      FROM lesson_books
      JOIN books ON books.id = lesson_books.book_id
      WHERE lesson_books.lesson_id = ?
      ORDER BY books.order_number ASC
      `
    )
    .all(lessonId) as Book[];
}

export function getBooksByEventId(eventId: string): Book[] {
  return db
    .prepare(
      `
      SELECT books.*
      FROM event_books
      JOIN books ON books.id = event_books.book_id
      WHERE event_books.event_id = ?
      ORDER BY books.order_number ASC
      `
    )
    .all(eventId) as Book[];
}

export function getLessonsByBookId(bookId: string): Lesson[] {
  return db
    .prepare(
      `
      SELECT lessons.*
      FROM lesson_books
      JOIN lessons ON lessons.id = lesson_books.lesson_id
      WHERE lesson_books.book_id = ?
      ORDER BY lessons.lesson_number ASC
      `
    )
    .all(bookId) as Lesson[];
}

export function getEventsByBookId(bookId: string): Event[] {
  return db
    .prepare(
      `
      SELECT events.*
      FROM event_books
      JOIN events ON events.id = event_books.event_id
      WHERE event_books.book_id = ?
      ORDER BY events.chronological_order ASC, events.title ASC
      `
    )
    .all(bookId) as Event[];
}

export type Passage = {
  id: string;
  display_reference: string;
  slug: string;
  book_id: string;
  book_name: string;
  book_slug: string;
  book_usfm_code: string;
  start_chapter: number;
  start_verse: number | null;
  end_chapter: number;
  end_verse: number | null;
  summary: string | null;
  status: string;
};

export type EventRelatedPassage = Passage & {
  relation_type: string;
  relation_position: number;
};

export type PassageRelatedEvent = Event & {
  relation_type: string;
  relation_position: number;
};

export function getAllPassages(): Passage[] {
  return db
    .prepare(
      `
      SELECT
        passages.*,
        books.name AS book_name,
        books.slug AS book_slug,
        books.usfm_code AS book_usfm_code
      FROM passages
      JOIN books ON books.id = passages.book_id
      ORDER BY books.order_number ASC, passages.start_chapter ASC, passages.start_verse ASC
      `
    )
    .all() as Passage[];
}

export function getPassagesByBookId(bookId: string): Passage[] {
  return db
    .prepare(
      `
      SELECT
        passages.*,
        books.name AS book_name,
        books.slug AS book_slug,
        books.usfm_code AS book_usfm_code
      FROM passages
      JOIN books ON books.id = passages.book_id
      WHERE
        passages.book_id = ?
        AND passages.status != 'Borrador'
      ORDER BY passages.start_chapter ASC, passages.start_verse ASC
      `
    )
    .all(bookId) as Passage[];
}

export function getPassagesByLessonId(lessonId: string): Passage[] {
  return db
    .prepare(
      `
      SELECT
        passages.*,
        books.name AS book_name,
        books.slug AS book_slug,
        books.usfm_code AS book_usfm_code
      FROM lesson_passages
      JOIN passages ON passages.id = lesson_passages.passage_id
      JOIN books ON books.id = passages.book_id
      WHERE lesson_passages.lesson_id = ?
      ORDER BY lesson_passages.position ASC
      `
    )
    .all(lessonId) as Passage[];
}

export function getPassagesByEventId(eventId: string): EventRelatedPassage[] {
  return db
    .prepare(
      `
      SELECT
        passages.*,
        books.name AS book_name,
        books.slug AS book_slug,
        books.usfm_code AS book_usfm_code,
        event_passages.relation_type AS relation_type,
        event_passages.position AS relation_position
      FROM event_passages
      JOIN passages ON passages.id = event_passages.passage_id
      JOIN books ON books.id = passages.book_id
      WHERE event_passages.event_id = ?
      ORDER BY event_passages.position ASC
      `
    )
    .all(eventId) as EventRelatedPassage[];
}

export function getLessonsByPassageId(passageId: string): Lesson[] {
  return db
    .prepare(
      `
      SELECT lessons.*
      FROM lesson_passages
      JOIN lessons ON lessons.id = lesson_passages.lesson_id
      WHERE lesson_passages.passage_id = ?
      ORDER BY lessons.lesson_number ASC
      `
    )
    .all(passageId) as Lesson[];
}

export function getEventsByPassageId(passageId: string): PassageRelatedEvent[] {
  return db
    .prepare(
      `
      SELECT
        events.*,
        event_passages.relation_type AS relation_type,
        event_passages.position AS relation_position
      FROM event_passages
      JOIN events ON events.id = event_passages.event_id
      WHERE event_passages.passage_id = ?
      ORDER BY events.chronological_order ASC, events.title ASC
      `
    )
    .all(passageId) as PassageRelatedEvent[];
}

export type BibleVerse = {
  id: string;
  version_id: string;
  book_id: string;
  chapter_id: string;
  chapter_number: number;
  verse_number: number;
  verse_text: string | null;
};

export type BibleSearchVerse = {
  id: string;
  book_id: string;
  book_name: string;
  book_slug: string;
  book_usfm_code: string;
  book_order: number;
  chapter_number: number;
  verse_number: number;
  verse_text: string | null;
};

export function getBibleSearchVerses(
  versionId = DEFAULT_BIBLE_VERSION_ID,
  language = "es"
): BibleSearchVerse[] {
  return db
    .prepare(
      `
      SELECT
        bible_verses.id,
        books.id AS book_id,
        book_translations.name AS book_name,
        book_translations.slug AS book_slug,
        books.usfm_code AS book_usfm_code,
        books.order_number AS book_order,
        bible_verses.chapter_number,
        bible_verses.verse_number,
        bible_verses.verse_text
      FROM bible_verses
      JOIN books ON books.id = bible_verses.book_id
      JOIN book_translations
        ON book_translations.book_id = books.id
        AND book_translations.language = ?
      WHERE bible_verses.version_id = ?
      ORDER BY books.order_number ASC, bible_verses.chapter_number ASC, bible_verses.verse_number ASC
      `
    )
    .all(language, versionId) as BibleSearchVerse[];
}

export type BibleChapter = {
  book_id: string;
  book_name: string;
  book_slug: string;
  chapter_number: number;
};

export function getBibleChaptersByBookId(bookId: string): BibleChapter[] {
  return db
    .prepare(
      `
      SELECT
        bible_chapters.book_id,
        books.name AS book_name,
        books.slug AS book_slug,
        bible_chapters.chapter_number
      FROM bible_chapters
      JOIN books ON books.id = bible_chapters.book_id
      WHERE bible_chapters.book_id = ?
      ORDER BY bible_chapters.chapter_number ASC
      `
    )
    .all(bookId) as BibleChapter[];
}

export function getBibleVersesByChapter(
  bookId: string,
  chapterNumber: number,
  versionId = DEFAULT_BIBLE_VERSION_ID
): BibleVerse[] {
  return db
    .prepare(
      `
      SELECT *
      FROM bible_verses
      WHERE
        version_id = ?
        AND book_id = ?
        AND chapter_number = ?
      ORDER BY verse_number ASC
      `
    )
    .all(versionId, bookId, chapterNumber) as BibleVerse[];
}

export function getBibleVersesForRange(
  bookId: string,
  startChapter: number,
  startVerse: number | null,
  endChapter: number,
  endVerse: number | null,
  versionId = DEFAULT_BIBLE_VERSION_ID
): BibleVerse[] {
  return db.prepare(`
    SELECT *
    FROM bible_verses
    WHERE version_id = ?
      AND book_id = ?
      AND (chapter_number > ? OR (chapter_number = ? AND (? IS NULL OR verse_number >= ?)))
      AND (chapter_number < ? OR (chapter_number = ? AND (? IS NULL OR verse_number <= ?)))
    ORDER BY chapter_number ASC, verse_number ASC
  `).all(
    versionId, bookId,
    startChapter, startChapter, startVerse, startVerse,
    endChapter, endChapter, endVerse, endVerse
  ) as BibleVerse[];
}

export function resolveBibleVersionId(label: string): string | undefined {
  const normalized = label.trim().toLowerCase();
  const row = db.prepare(`
    SELECT id FROM bible_versions
    WHERE lower(id) = ? OR lower(abbreviation) = ? OR lower(name) = ?
    LIMIT 1
  `).get(normalized, normalized, normalized) as { id: string } | undefined;
  return row?.id;
}

export type BibleVersion = {
  id: string;
  name: string;
  abbreviation: string;
  language: string;
  copyright_status: string | null;
  copyright_notice: string | null;
  license_notes: string | null;
  permission_scope: string | null;
  source_notes: string | null;
  status: string;
};

export function getBibleVersionById(versionId: string): BibleVersion | undefined {
  return db
    .prepare(
      `
      SELECT *
      FROM bible_versions
      WHERE id = ?
      `
    )
    .get(versionId) as BibleVersion | undefined;
}

export function getAllBibleVersions(): BibleVersion[] {
  return db
    .prepare(
      `
      SELECT *
      FROM bible_versions
      WHERE status != 'Borrador'
      ORDER BY language ASC, name ASC
      `
    )
    .all() as BibleVersion[];
}

export function getBibleVersionsByLanguage(
  language: string
): BibleVersion[] {
  return db
    .prepare(
      `
      SELECT *
      FROM bible_versions
      WHERE
        language = ?
        AND status != 'Borrador'
      ORDER BY name ASC
      `
    )
    .all(language) as BibleVersion[];
}

export function getBibleVersesByPassageId(
  passageId: string,
  versionId = DEFAULT_BIBLE_VERSION_ID
): BibleVerse[] {
  return db
    .prepare(
      `
      SELECT bible_verses.*
      FROM passages
      JOIN bible_verses
        ON bible_verses.book_id = passages.book_id
      WHERE
        passages.id = ?
        AND bible_verses.version_id = ?
        AND (
          (
            passages.start_chapter = passages.end_chapter
            AND bible_verses.chapter_number = passages.start_chapter
            AND (
              passages.start_verse IS NULL
              OR bible_verses.verse_number >= passages.start_verse
            )
            AND (
              passages.end_verse IS NULL
              OR bible_verses.verse_number <= passages.end_verse
            )
          )
          OR
          (
            passages.start_chapter <> passages.end_chapter
            AND (
              (
                bible_verses.chapter_number > passages.start_chapter
                AND bible_verses.chapter_number < passages.end_chapter
              )
              OR
              (
                bible_verses.chapter_number = passages.start_chapter
                AND (
                  passages.start_verse IS NULL
                  OR bible_verses.verse_number >= passages.start_verse
                )
              )
              OR
              (
                bible_verses.chapter_number = passages.end_chapter
                AND (
                  passages.end_verse IS NULL
                  OR bible_verses.verse_number <= passages.end_verse
                )
              )
            )
          )
        )
      ORDER BY bible_verses.chapter_number ASC, bible_verses.verse_number ASC
      `
    )
    .all(passageId, versionId) as BibleVerse[];
}

export type VisualResource = {
  id: string;
  title: string;
  slug: string;
  resource_type: string;
  description: string | null;
  alt_text: string | null;
  url: string | null;
  status: string;
};

export type VisualResourceLesson = {
  id: string;
  route_id: string;
  lesson_number: number;
  title: string;
  slug: string;
  eyebrow: string | null;
  main_idea: string | null;
  summary: string | null;
  estimated_time: string | null;
  status: string;
};

export function getAllVisualResources(): VisualResource[] {
  return db
    .prepare(
      `
      SELECT *
      FROM visual_resources
      ORDER BY resource_type ASC, title ASC
      `
    )
    .all() as VisualResource[];
}

export function getVisualResourceBySlug(
  slug: string
): VisualResource | undefined {
  return db
    .prepare(
      `
      SELECT *
      FROM visual_resources
      WHERE slug = ?
      `
    )
    .get(slug) as VisualResource | undefined;
}

export function getVisualResourcesByLessonId(
  lessonId: string
): VisualResource[] {
  return db
    .prepare(
      `
      SELECT visual_resources.*
      FROM lesson_visual_resources
      JOIN visual_resources
        ON visual_resources.id = lesson_visual_resources.visual_resource_id
      WHERE lesson_visual_resources.lesson_id = ?
      ORDER BY visual_resources.resource_type ASC, visual_resources.title ASC
      `
    )
    .all(lessonId) as VisualResource[];
}

export function getLessonsByVisualResourceId(
  visualResourceId: string
): VisualResourceLesson[] {
  return db
    .prepare(
      `
      SELECT
        lessons.id,
        lessons.route_id,
        lessons.lesson_number,
        lessons.title,
        lessons.slug,
        lessons.eyebrow,
        lessons.main_idea,
        lessons.summary,
        lessons.estimated_time,
        lessons.status
      FROM lesson_visual_resources
      JOIN lessons
        ON lessons.id = lesson_visual_resources.lesson_id
      WHERE
        lesson_visual_resources.visual_resource_id = ?
        AND lessons.status != 'Borrador'
      ORDER BY lessons.lesson_number ASC
      `
    )
    .all(visualResourceId) as VisualResourceLesson[];
}