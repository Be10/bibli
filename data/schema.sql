PRAGMA foreign_keys = ON;

DROP VIEW IF EXISTS lessons;
DROP TABLE IF EXISTS event_passages;
DROP TABLE IF EXISTS lesson_passages;
DROP TABLE IF EXISTS passages;
DROP TABLE IF EXISTS bible_verses;
DROP TABLE IF EXISTS bible_chapters;
DROP TABLE IF EXISTS bible_versions;
DROP TABLE IF EXISTS event_books;
DROP TABLE IF EXISTS lesson_books;
DROP TABLE IF EXISTS event_topics;
DROP TABLE IF EXISTS event_places;
DROP TABLE IF EXISTS event_people;
DROP TABLE IF EXISTS lesson_events;
DROP TABLE IF EXISTS lesson_visual_resources;
DROP TABLE IF EXISTS lesson_glossary;
DROP TABLE IF EXISTS lesson_places;
DROP TABLE IF EXISTS lesson_people;
DROP TABLE IF EXISTS lesson_topics;
DROP TABLE IF EXISTS visual_resources;
DROP TABLE IF EXISTS glossary_terms;
DROP TABLE IF EXISTS places;
DROP TABLE IF EXISTS people;
DROP TABLE IF EXISTS topics;
DROP TABLE IF EXISTS book_translations;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS route_lessons;
DROP TABLE IF EXISTS route_modules;
DROP TABLE IF EXISTS learning_microcheck_evidence_localizations;
DROP TABLE IF EXISTS learning_microcheck_evidence;
DROP TABLE IF EXISTS learning_microcheck_option_localizations;
DROP TABLE IF EXISTS learning_microcheck_options;
DROP TABLE IF EXISTS learning_microcheck_concepts;
DROP TABLE IF EXISTS learning_microcheck_localizations;
DROP TABLE IF EXISTS learning_microchecks;
DROP TABLE IF EXISTS lesson_learning_glossary_links;
DROP TABLE IF EXISTS glossary_term_localizations;
DROP TABLE IF EXISTS learning_objective_blocks;
DROP TABLE IF EXISTS learning_objective_concepts;
DROP TABLE IF EXISTS learning_objective_localizations;
DROP TABLE IF EXISTS learning_objectives;
DROP TABLE IF EXISTS lesson_learning_block_concepts;
DROP TABLE IF EXISTS lesson_learning_concepts;
DROP TABLE IF EXISTS learning_concept_localizations;
DROP TABLE IF EXISTS learning_concepts;
DROP TABLE IF EXISTS lesson_learning_blocks;
DROP TABLE IF EXISTS lesson_learning_models;
DROP TABLE IF EXISTS study_lessons;
DROP TABLE IF EXISTS lessons;
DROP TABLE IF EXISTS routes;

CREATE TABLE routes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subtitle TEXT,
  description TEXT,
  level TEXT,
  estimated_duration TEXT,
  language TEXT NOT NULL DEFAULT 'es',
  status TEXT NOT NULL DEFAULT 'Borrador'
);

CREATE TABLE route_modules (
  id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Publicado',
  UNIQUE (route_id, slug),
  UNIQUE (route_id, position),
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
);

CREATE TABLE books (
  id TEXT PRIMARY KEY,
  usfm_code TEXT UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  abbreviation TEXT,
  testament TEXT NOT NULL,
  order_number INTEGER NOT NULL,
  category TEXT,
  genre TEXT,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'Borrador'
);

CREATE TABLE book_translations (
  book_id TEXT NOT NULL,
  language TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  abbreviation TEXT,
  testament TEXT NOT NULL,
  category TEXT,
  genre TEXT,
  summary TEXT,
  PRIMARY KEY (book_id, language),
  UNIQUE (language, slug),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE bible_versions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'es',
  copyright_status TEXT,
  copyright_notice TEXT,
  license_notes TEXT,
  permission_scope TEXT,
  source_notes TEXT,
  status TEXT NOT NULL DEFAULT 'Borrador'
);

CREATE TABLE bible_chapters (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  UNIQUE (book_id, chapter_number),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE bible_verses (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  verse_text TEXT,
  UNIQUE (version_id, book_id, chapter_number, verse_number),
  FOREIGN KEY (version_id) REFERENCES bible_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (chapter_id) REFERENCES bible_chapters(id) ON DELETE CASCADE
);

CREATE TABLE passages (
  id TEXT PRIMARY KEY,
  display_reference TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  book_id TEXT NOT NULL,
  start_chapter INTEGER NOT NULL,
  start_verse INTEGER,
  end_chapter INTEGER NOT NULL,
  end_verse INTEGER,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'Borrador',
  FOREIGN KEY (book_id) REFERENCES books(id)
);

CREATE TABLE study_lessons (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  book_id TEXT NOT NULL,
  primary_reference TEXT NOT NULL,
  translation TEXT NOT NULL,
  content_version TEXT NOT NULL,
  source_path TEXT NOT NULL UNIQUE,
  estimated_minutes INTEGER NOT NULL DEFAULT 10,
  search_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Publicado',
  FOREIGN KEY (book_id) REFERENCES books(id)
);

CREATE TABLE lesson_learning_models (
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

CREATE TABLE lesson_learning_blocks (
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

CREATE TABLE learning_concepts (
  id TEXT PRIMARY KEY,
  concept_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  source_kind TEXT NOT NULL DEFAULT 'editorial-registry'
);

CREATE TABLE learning_concept_localizations (
  concept_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  label TEXT NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (concept_id, locale),
  FOREIGN KEY (concept_id) REFERENCES learning_concepts(id) ON DELETE CASCADE
);

CREATE TABLE lesson_learning_concepts (
  lesson_id TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  importance TEXT NOT NULL CHECK (importance IN ('core', 'supporting')),
  source_kind TEXT NOT NULL DEFAULT 'editorial-registry',
  PRIMARY KEY (lesson_id, concept_id),
  FOREIGN KEY (lesson_id) REFERENCES study_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (concept_id) REFERENCES learning_concepts(id) ON DELETE CASCADE
);

CREATE TABLE lesson_learning_block_concepts (
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


CREATE TABLE learning_objectives (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  objective_version TEXT NOT NULL,
  source_kind TEXT NOT NULL DEFAULT 'editorial-registry',
  UNIQUE (lesson_id, position),
  FOREIGN KEY (lesson_id) REFERENCES study_lessons(id) ON DELETE CASCADE
);

CREATE TABLE learning_objective_localizations (
  objective_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  objective_text TEXT NOT NULL,
  PRIMARY KEY (objective_id, locale),
  FOREIGN KEY (objective_id) REFERENCES learning_objectives(id) ON DELETE CASCADE
);

CREATE TABLE learning_objective_concepts (
  objective_id TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  PRIMARY KEY (objective_id, concept_id),
  UNIQUE (objective_id, position),
  FOREIGN KEY (objective_id) REFERENCES learning_objectives(id) ON DELETE CASCADE,
  FOREIGN KEY (concept_id) REFERENCES learning_concepts(id) ON DELETE CASCADE
);

CREATE TABLE learning_objective_blocks (
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

CREATE TABLE route_lessons (
  route_id TEXT NOT NULL,
  module_id TEXT,
  lesson_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  PRIMARY KEY (route_id, lesson_id),
  UNIQUE (route_id, position),
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES route_modules(id) ON DELETE SET NULL,
  FOREIGN KEY (lesson_id) REFERENCES study_lessons(id) ON DELETE CASCADE
);

CREATE TABLE topics (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  definition TEXT,
  status TEXT NOT NULL DEFAULT 'Borrador'
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  event_type TEXT,
  summary TEXT,
  description TEXT,
  biblical_period TEXT,
  approximate_date TEXT,
  chronological_order INTEGER,
  temporal_certainty TEXT,
  geographical_certainty TEXT,
  appears_on_timeline INTEGER NOT NULL DEFAULT 1,
  appears_on_map INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Borrador'
);

CREATE TABLE people (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'Borrador'
);

CREATE TABLE places (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  place_type TEXT,
  summary TEXT,
  latitude REAL,
  longitude REAL,
  map_zoom INTEGER,
  geographical_certainty TEXT,
  status TEXT NOT NULL DEFAULT 'Borrador'
);

CREATE TABLE glossary_terms (
  id TEXT PRIMARY KEY,
  term TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  definition TEXT,
  status TEXT NOT NULL DEFAULT 'Borrador'
);

CREATE TABLE visual_resources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  resource_type TEXT NOT NULL,
  description TEXT,
  alt_text TEXT,
  url TEXT,
  status TEXT NOT NULL DEFAULT 'Idea'
);

CREATE TABLE lesson_topics (
  lesson_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  link_source TEXT NOT NULL DEFAULT 'editorial',
  PRIMARY KEY (lesson_id, topic_id),
  FOREIGN KEY (lesson_id) REFERENCES study_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

CREATE TABLE lesson_events (
  lesson_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  link_source TEXT NOT NULL DEFAULT 'editorial',
  PRIMARY KEY (lesson_id, event_id),
  FOREIGN KEY (lesson_id) REFERENCES study_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE lesson_books (
  lesson_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  link_source TEXT NOT NULL DEFAULT 'canonical',
  PRIMARY KEY (lesson_id, book_id),
  FOREIGN KEY (lesson_id) REFERENCES study_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE lesson_passages (
  lesson_id TEXT NOT NULL,
  passage_id TEXT NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'principal',
  position INTEGER NOT NULL DEFAULT 1,
  link_source TEXT NOT NULL DEFAULT 'canonical',
  PRIMARY KEY (lesson_id, passage_id),
  FOREIGN KEY (lesson_id) REFERENCES study_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (passage_id) REFERENCES passages(id) ON DELETE CASCADE
);

CREATE TABLE lesson_people (
  lesson_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  link_source TEXT NOT NULL DEFAULT 'editorial',
  PRIMARY KEY (lesson_id, person_id),
  FOREIGN KEY (lesson_id) REFERENCES study_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
);

CREATE TABLE lesson_places (
  lesson_id TEXT NOT NULL,
  place_id TEXT NOT NULL,
  link_source TEXT NOT NULL DEFAULT 'editorial',
  PRIMARY KEY (lesson_id, place_id),
  FOREIGN KEY (lesson_id) REFERENCES study_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
);

CREATE TABLE lesson_glossary (
  lesson_id TEXT NOT NULL,
  glossary_id TEXT NOT NULL,
  link_source TEXT NOT NULL DEFAULT 'editorial',
  PRIMARY KEY (lesson_id, glossary_id),
  FOREIGN KEY (lesson_id) REFERENCES study_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (glossary_id) REFERENCES glossary_terms(id) ON DELETE CASCADE
);


CREATE TABLE glossary_term_localizations (
  glossary_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  term TEXT NOT NULL,
  definition TEXT NOT NULL DEFAULT '',
  source_kind TEXT NOT NULL DEFAULT 'canonical-glossary',
  PRIMARY KEY (glossary_id, locale),
  FOREIGN KEY (glossary_id) REFERENCES glossary_terms(id) ON DELETE CASCADE
);

CREATE TABLE lesson_learning_glossary_links (
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


CREATE TABLE learning_microchecks (
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

CREATE TABLE learning_microcheck_localizations (
  check_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  prompt TEXT NOT NULL,
  PRIMARY KEY (check_id, locale),
  FOREIGN KEY (check_id) REFERENCES learning_microchecks(id) ON DELETE CASCADE
);

CREATE TABLE learning_microcheck_concepts (
  check_id TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  PRIMARY KEY (check_id, concept_id),
  UNIQUE (check_id, position),
  FOREIGN KEY (check_id) REFERENCES learning_microchecks(id) ON DELETE CASCADE,
  FOREIGN KEY (concept_id) REFERENCES learning_concepts(id) ON DELETE CASCADE
);

CREATE TABLE learning_microcheck_options (
  id TEXT PRIMARY KEY,
  check_id TEXT NOT NULL,
  option_key TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  is_correct INTEGER NOT NULL DEFAULT 0 CHECK (is_correct IN (0, 1)),
  UNIQUE (check_id, option_key),
  UNIQUE (check_id, position),
  FOREIGN KEY (check_id) REFERENCES learning_microchecks(id) ON DELETE CASCADE
);

CREATE TABLE learning_microcheck_option_localizations (
  option_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  option_text TEXT NOT NULL,
  rationale TEXT NOT NULL,
  PRIMARY KEY (option_id, locale),
  FOREIGN KEY (option_id) REFERENCES learning_microcheck_options(id) ON DELETE CASCADE
);

CREATE TABLE learning_microcheck_evidence (
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

CREATE TABLE learning_microcheck_evidence_localizations (
  check_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  bible_reference TEXT,
  PRIMARY KEY (check_id, block_id, locale),
  FOREIGN KEY (check_id, block_id) REFERENCES learning_microcheck_evidence(check_id, block_id) ON DELETE CASCADE
);

CREATE TABLE learning_interactive_blocks (
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

CREATE TABLE learning_interactive_block_localizations (
  interaction_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  eyebrow TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  instruction TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (interaction_id, locale),
  FOREIGN KEY (interaction_id) REFERENCES learning_interactive_blocks(id) ON DELETE CASCADE
);

CREATE TABLE learning_interactive_block_concepts (
  interaction_id TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  PRIMARY KEY (interaction_id, concept_id),
  UNIQUE (interaction_id, position),
  FOREIGN KEY (interaction_id) REFERENCES learning_interactive_blocks(id) ON DELETE CASCADE,
  FOREIGN KEY (concept_id) REFERENCES learning_concepts(id) ON DELETE CASCADE
);

CREATE TABLE learning_interactive_items (
  id TEXT PRIMARY KEY,
  interaction_id TEXT NOT NULL,
  item_key TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  UNIQUE (interaction_id, item_key),
  UNIQUE (interaction_id, position),
  FOREIGN KEY (interaction_id) REFERENCES learning_interactive_blocks(id) ON DELETE CASCADE
);

CREATE TABLE learning_interactive_item_localizations (
  item_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  PRIMARY KEY (item_id, locale),
  FOREIGN KEY (item_id) REFERENCES learning_interactive_items(id) ON DELETE CASCADE
);

CREATE TABLE lesson_visual_resources (
  lesson_id TEXT NOT NULL,
  visual_resource_id TEXT NOT NULL,
  link_source TEXT NOT NULL DEFAULT 'editorial',
  PRIMARY KEY (lesson_id, visual_resource_id),
  FOREIGN KEY (lesson_id) REFERENCES study_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (visual_resource_id) REFERENCES visual_resources(id) ON DELETE CASCADE
);

CREATE TABLE event_people (
  event_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  PRIMARY KEY (event_id, person_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
);

CREATE TABLE event_places (
  event_id TEXT NOT NULL,
  place_id TEXT NOT NULL,
  PRIMARY KEY (event_id, place_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
);

CREATE TABLE event_topics (
  event_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  PRIMARY KEY (event_id, topic_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

CREATE TABLE event_books (
  event_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  PRIMARY KEY (event_id, book_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE event_passages (
  event_id TEXT NOT NULL,
  passage_id TEXT NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'principal',
  position INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (event_id, passage_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (passage_id) REFERENCES passages(id) ON DELETE CASCADE
);

CREATE VIEW lessons AS
SELECT
  study_lessons.id AS id,
  route_lessons.route_id AS route_id,
  route_lessons.position AS lesson_number,
  study_lessons.title AS title,
  study_lessons.slug AS slug,
  NULL AS eyebrow,
  NULL AS main_idea,
  NULL AS objective,
  'Estudio de ' || study_lessons.primary_reference AS summary,
  NULL AS explanation,
  NULL AS remember,
  NULL AS application,
  CAST(study_lessons.estimated_minutes AS TEXT) || ' min' AS estimated_time,
  study_lessons.status AS status,
  study_lessons.book_id AS book_id,
  study_lessons.primary_reference AS primary_reference,
  study_lessons.translation AS translation,
  study_lessons.content_version AS content_version,
  study_lessons.source_path AS source_path,
  study_lessons.search_text AS search_text
FROM study_lessons
LEFT JOIN route_lessons
  ON route_lessons.lesson_id = study_lessons.id
 AND route_lessons.is_primary = 1;

CREATE INDEX idx_bible_verses_lookup ON bible_verses(version_id, book_id, chapter_number, verse_number);
CREATE INDEX idx_route_lessons_route_position ON route_lessons(route_id, position);
CREATE INDEX idx_route_lessons_lesson ON route_lessons(lesson_id);
CREATE INDEX idx_study_lessons_book ON study_lessons(book_id);
CREATE INDEX idx_study_lessons_reference ON study_lessons(primary_reference);
CREATE INDEX idx_lesson_learning_models_locale ON lesson_learning_models(locale, lesson_id);
CREATE INDEX idx_lesson_learning_blocks_lesson ON lesson_learning_blocks(lesson_id, locale, position);
CREATE INDEX idx_lesson_learning_blocks_role ON lesson_learning_blocks(semantic_role, lesson_id, locale);
CREATE INDEX idx_learning_concept_localizations_locale ON learning_concept_localizations(locale, label);
CREATE INDEX idx_lesson_learning_concepts_lesson ON lesson_learning_concepts(lesson_id, importance, concept_id);
CREATE INDEX idx_lesson_learning_concepts_concept ON lesson_learning_concepts(concept_id, lesson_id);
CREATE INDEX idx_lesson_learning_block_concepts_block ON lesson_learning_block_concepts(lesson_id, block_id, concept_id);
CREATE INDEX idx_lesson_learning_block_concepts_concept ON lesson_learning_block_concepts(concept_id, lesson_id, block_id);
CREATE INDEX idx_learning_objectives_lesson ON learning_objectives(lesson_id, position);
CREATE INDEX idx_learning_objective_localizations_locale ON learning_objective_localizations(locale, objective_id);
CREATE INDEX idx_learning_objective_concepts_concept ON learning_objective_concepts(concept_id, objective_id);
CREATE INDEX idx_learning_objective_blocks_lesson ON learning_objective_blocks(lesson_id, block_id, objective_id);
CREATE INDEX idx_learning_microchecks_lesson ON learning_microchecks(lesson_id, position);
CREATE INDEX idx_learning_microchecks_trigger ON learning_microchecks(lesson_id, trigger_block_id);
CREATE INDEX idx_learning_microcheck_concepts_concept ON learning_microcheck_concepts(concept_id, check_id);
CREATE INDEX idx_learning_microcheck_options_check ON learning_microcheck_options(check_id, position);
CREATE INDEX idx_learning_microcheck_evidence_check ON learning_microcheck_evidence(check_id, position);
CREATE INDEX idx_glossary_term_localizations_locale ON glossary_term_localizations(locale, term);
CREATE INDEX idx_lesson_learning_glossary_block ON lesson_learning_glossary_links(lesson_id, block_id, position);
CREATE INDEX idx_lesson_learning_glossary_term ON lesson_learning_glossary_links(glossary_id, lesson_id);
CREATE INDEX idx_events_chronology ON events(chronological_order);
CREATE INDEX idx_lesson_topics_lesson ON lesson_topics(lesson_id);
CREATE INDEX idx_lesson_events_lesson ON lesson_events(lesson_id);
CREATE INDEX idx_lesson_books_lesson ON lesson_books(lesson_id);
CREATE INDEX idx_lesson_passages_lesson ON lesson_passages(lesson_id, position);
CREATE INDEX idx_lesson_people_lesson ON lesson_people(lesson_id);
CREATE INDEX idx_lesson_places_lesson ON lesson_places(lesson_id);
CREATE INDEX idx_lesson_glossary_lesson ON lesson_glossary(lesson_id);
CREATE INDEX idx_learning_interactive_blocks_lesson ON learning_interactive_blocks(lesson_id, anchor_block_id, position);
CREATE INDEX idx_learning_interactive_blocks_type ON learning_interactive_blocks(interaction_type, lesson_id);
CREATE INDEX idx_learning_interactive_block_concepts_concept ON learning_interactive_block_concepts(concept_id, interaction_id);
CREATE INDEX idx_learning_interactive_items_interaction ON learning_interactive_items(interaction_id, position);
CREATE INDEX idx_lesson_visual_resources_lesson ON lesson_visual_resources(lesson_id);
