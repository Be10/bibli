PRAGMA foreign_keys = ON;

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
DROP TABLE IF EXISTS lesson_questions;
DROP TABLE IF EXISTS lesson_points;
DROP TABLE IF EXISTS lesson_bible_refs;
DROP TABLE IF EXISTS visual_resources;
DROP TABLE IF EXISTS glossary_terms;
DROP TABLE IF EXISTS places;
DROP TABLE IF EXISTS people;
DROP TABLE IF EXISTS topics;
DROP TABLE IF EXISTS book_translations;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS events;
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
  status TEXT NOT NULL DEFAULT 'Borrador'
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
  FOREIGN KEY (book_id) REFERENCES books(id)
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
  FOREIGN KEY (book_id) REFERENCES books(id)
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
  FOREIGN KEY (version_id) REFERENCES bible_versions(id),
  FOREIGN KEY (book_id) REFERENCES books(id),
  FOREIGN KEY (chapter_id) REFERENCES bible_chapters(id)
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

CREATE TABLE lessons (
  id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL,
  lesson_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  eyebrow TEXT,
  main_idea TEXT,
  summary TEXT,
  explanation TEXT,
  remember TEXT,
  application TEXT,
  estimated_time TEXT,
  status TEXT NOT NULL DEFAULT 'Borrador',
  FOREIGN KEY (route_id) REFERENCES routes(id)
);

CREATE TABLE lesson_bible_refs (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  reference TEXT NOT NULL,
  note TEXT,
  position INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id)
);

CREATE TABLE lesson_points (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  point_text TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id)
);

CREATE TABLE lesson_questions (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id)
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
  PRIMARY KEY (lesson_id, topic_id),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id),
  FOREIGN KEY (topic_id) REFERENCES topics(id)
);

CREATE TABLE lesson_events (
  lesson_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  PRIMARY KEY (lesson_id, event_id),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id),
  FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE TABLE lesson_books (
  lesson_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  PRIMARY KEY (lesson_id, book_id),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id),
  FOREIGN KEY (book_id) REFERENCES books(id)
);

CREATE TABLE lesson_passages (
  lesson_id TEXT NOT NULL,
  passage_id TEXT NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'principal',
  position INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (lesson_id, passage_id),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id),
  FOREIGN KEY (passage_id) REFERENCES passages(id)
);

CREATE TABLE lesson_people (
  lesson_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  PRIMARY KEY (lesson_id, person_id),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id),
  FOREIGN KEY (person_id) REFERENCES people(id)
);

CREATE TABLE lesson_places (
  lesson_id TEXT NOT NULL,
  place_id TEXT NOT NULL,
  PRIMARY KEY (lesson_id, place_id),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id),
  FOREIGN KEY (place_id) REFERENCES places(id)
);

CREATE TABLE lesson_glossary (
  lesson_id TEXT NOT NULL,
  glossary_id TEXT NOT NULL,
  PRIMARY KEY (lesson_id, glossary_id),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id),
  FOREIGN KEY (glossary_id) REFERENCES glossary_terms(id)
);

CREATE TABLE lesson_visual_resources (
  lesson_id TEXT NOT NULL,
  visual_resource_id TEXT NOT NULL,
  PRIMARY KEY (lesson_id, visual_resource_id),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id),
  FOREIGN KEY (visual_resource_id) REFERENCES visual_resources(id)
);

CREATE TABLE event_people (
  event_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  PRIMARY KEY (event_id, person_id),
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (person_id) REFERENCES people(id)
);

CREATE TABLE event_places (
  event_id TEXT NOT NULL,
  place_id TEXT NOT NULL,
  PRIMARY KEY (event_id, place_id),
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (place_id) REFERENCES places(id)
);

CREATE TABLE event_topics (
  event_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  PRIMARY KEY (event_id, topic_id),
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (topic_id) REFERENCES topics(id)
);

CREATE TABLE event_books (
  event_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  PRIMARY KEY (event_id, book_id),
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (book_id) REFERENCES books(id)
);

CREATE TABLE event_passages (
  event_id TEXT NOT NULL,
  passage_id TEXT NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'principal',
  position INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (event_id, passage_id),
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (passage_id) REFERENCES passages(id)
);