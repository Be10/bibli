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
  title: string;
  slug: string;
  place_type: string | null;
  summary: string | null;
  latitude: number | null;
  longitude: number | null;
  geographical_certainty: string | null;
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

export function getPlacesByPersonId(personId: string): EventRelatedPlace[] {
  return db
    .prepare(
      `
      SELECT DISTINCT
        places.name AS title,
        places.slug,
        places.place_type,
        places.summary,
        places.latitude,
        places.longitude,
        places.geographical_certainty
      FROM event_people
      JOIN event_places ON event_places.event_id = event_people.event_id
      JOIN places ON places.id = event_places.place_id
      WHERE
        event_people.person_id = ?
        AND places.status != 'Borrador'
      ORDER BY places.name ASC
      `
    )
    .all(personId) as EventRelatedPlace[];
}

export function getPlacesByEventId(eventId: string): EventRelatedPlace[] {
  return db
    .prepare(
      `
      SELECT
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
        COALESCE(book_translations.name, books.name) AS name,
        COALESCE(book_translations.slug, books.slug) AS slug,
        COALESCE(book_translations.abbreviation, books.abbreviation) AS abbreviation,
        COALESCE(book_translations.testament, books.testament) AS testament,
        books.order_number,
        COALESCE(book_translations.category, books.category) AS category,
        COALESCE(book_translations.genre, books.genre) AS genre,
        COALESCE(book_translations.summary, books.summary) AS summary,
        books.status
      FROM books
      LEFT JOIN book_translations
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
        COALESCE(book_translations.name, books.name) AS name,
        COALESCE(book_translations.slug, books.slug) AS slug,
        COALESCE(book_translations.abbreviation, books.abbreviation) AS abbreviation,
        COALESCE(book_translations.testament, books.testament) AS testament,
        books.order_number,
        COALESCE(book_translations.category, books.category) AS category,
        COALESCE(book_translations.genre, books.genre) AS genre,
        COALESCE(book_translations.summary, books.summary) AS summary,
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

export function getPassagesByEventId(eventId: string): Passage[] {
  return db
    .prepare(
      `
      SELECT
        passages.*,
        books.name AS book_name,
        books.slug AS book_slug,
        books.usfm_code AS book_usfm_code
      FROM event_passages
      JOIN passages ON passages.id = event_passages.passage_id
      JOIN books ON books.id = passages.book_id
      WHERE event_passages.event_id = ?
      ORDER BY event_passages.position ASC
      `
    )
    .all(eventId) as Passage[];
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

export function getEventsByPassageId(passageId: string): Event[] {
  return db
    .prepare(
      `
      SELECT events.*
      FROM event_passages
      JOIN events ON events.id = event_passages.event_id
      WHERE event_passages.passage_id = ?
      ORDER BY events.chronological_order ASC, events.title ASC
      `
    )
    .all(passageId) as Event[];
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
        COALESCE(book_translations.name, books.name) AS book_name,
        COALESCE(book_translations.slug, books.slug) AS book_slug,
        books.usfm_code AS book_usfm_code,
        books.order_number AS book_order,
        bible_verses.chapter_number,
        bible_verses.verse_number,
        bible_verses.verse_text
      FROM bible_verses
      JOIN books ON books.id = bible_verses.book_id
      LEFT JOIN book_translations
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