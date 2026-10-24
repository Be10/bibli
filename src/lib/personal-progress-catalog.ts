import { db } from "./db";

export interface StudyProgressLessonCatalogItem {
  id: string;
  routeId: string;
  moduleId: string | null;
  bookId: string | null;
}

export interface StudyProgressModuleCatalogItem {
  id: string;
  routeId: string;
  title: string;
  slug: string;
  position: number;
  totalLessons: number;
}

export interface StudyProgressRouteCatalogItem {
  id: string;
  title: string;
  slug: string;
  language: string;
  totalLessons: number;
  totalModules: number;
}

export interface StudyProgressBookCatalogItem {
  id: string;
  name: string;
  slug: string;
  usfmCode: string;
  order: number;
  totalLessons: number;
}

export interface StudyProgressCatalog {
  routes: StudyProgressRouteCatalogItem[];
  modules: StudyProgressModuleCatalogItem[];
  books: StudyProgressBookCatalogItem[];
  lessons: StudyProgressLessonCatalogItem[];
}

export interface BibleProgressBookCatalogItem {
  versionId: string;
  id: string;
  name: string;
  slug: string;
  usfmCode: string;
  order: number;
  totalChapters: number;
}

export interface BibleProgressVersionCatalogItem {
  id: string;
  name: string;
  abbreviation: string;
  language: string;
  totalChapters: number;
}

export interface BibleProgressCatalog {
  versions: BibleProgressVersionCatalogItem[];
  books: BibleProgressBookCatalogItem[];
}

type StudyRow = {
  route_id: string;
  route_title: string;
  route_slug: string;
  route_language: string;
  module_id: string | null;
  module_title: string | null;
  module_slug: string | null;
  module_position: number | null;
  lesson_id: string;
  book_id: string | null;
  book_name: string | null;
  book_slug: string | null;
  book_usfm_code: string | null;
  book_order: number | null;
};

type BibleRow = {
  version_id: string;
  version_name: string;
  version_abbreviation: string;
  version_language: string;
  book_id: string;
  book_name: string;
  book_slug: string;
  book_usfm_code: string;
  book_order: number;
  total_chapters: number;
};

export function getStudyProgressCatalog(language: "es" | "en"): StudyProgressCatalog {
  const rows = db.prepare(`
    SELECT
      routes.id AS route_id,
      routes.title AS route_title,
      routes.slug AS route_slug,
      routes.language AS route_language,
      route_modules.id AS module_id,
      route_modules.title AS module_title,
      route_modules.slug AS module_slug,
      route_modules.position AS module_position,
      study_lessons.id AS lesson_id,
      study_lessons.book_id AS book_id,
      book_translations.name AS book_name,
      book_translations.slug AS book_slug,
      books.usfm_code AS book_usfm_code,
      books.order_number AS book_order
    FROM route_lessons
    JOIN routes ON routes.id = route_lessons.route_id
    JOIN study_lessons ON study_lessons.id = route_lessons.lesson_id
    LEFT JOIN route_modules ON route_modules.id = route_lessons.module_id
    LEFT JOIN books ON books.id = study_lessons.book_id
    LEFT JOIN book_translations
      ON book_translations.book_id = books.id
      AND book_translations.language = ?
    WHERE
      routes.status <> 'Borrador'
      AND study_lessons.status <> 'Borrador'
      AND (route_modules.id IS NULL OR route_modules.status <> 'Borrador')
    ORDER BY routes.title ASC, route_lessons.position ASC
  `).all(language) as StudyRow[];

  const lessons: StudyProgressLessonCatalogItem[] = rows.map((row) => ({
    id: row.lesson_id,
    routeId: row.route_id,
    moduleId: row.module_id,
    bookId: row.book_id,
  }));

  const routeMap = new Map<string, StudyProgressRouteCatalogItem>();
  const moduleMap = new Map<string, StudyProgressModuleCatalogItem>();
  const bookMap = new Map<string, StudyProgressBookCatalogItem>();
  const bookLessonIds = new Map<string, Set<string>>();
  const routeModuleIds = new Map<string, Set<string>>();

  for (const row of rows) {
    const route = routeMap.get(row.route_id) ?? {
      id: row.route_id,
      title: row.route_title,
      slug: row.route_slug,
      language: row.route_language,
      totalLessons: 0,
      totalModules: 0,
    };
    route.totalLessons += 1;
    routeMap.set(row.route_id, route);

    if (row.module_id && row.module_title && row.module_slug && row.module_position !== null) {
      const module = moduleMap.get(row.module_id) ?? {
        id: row.module_id,
        routeId: row.route_id,
        title: row.module_title,
        slug: row.module_slug,
        position: row.module_position,
        totalLessons: 0,
      };
      module.totalLessons += 1;
      moduleMap.set(row.module_id, module);
      const moduleIds = routeModuleIds.get(row.route_id) ?? new Set<string>();
      moduleIds.add(row.module_id);
      routeModuleIds.set(row.route_id, moduleIds);
    }

    if (row.book_id && row.book_name && row.book_slug && row.book_usfm_code && row.book_order !== null) {
      const book = bookMap.get(row.book_id) ?? {
        id: row.book_id,
        name: row.book_name,
        slug: row.book_slug,
        usfmCode: row.book_usfm_code,
        order: row.book_order,
        totalLessons: 0,
      };
      const lessonIds = bookLessonIds.get(row.book_id) ?? new Set<string>();
      lessonIds.add(row.lesson_id);
      bookLessonIds.set(row.book_id, lessonIds);
      book.totalLessons = lessonIds.size;
      bookMap.set(row.book_id, book);
    }
  }

  for (const route of routeMap.values()) {
    route.totalModules = routeModuleIds.get(route.id)?.size ?? 0;
  }

  return {
    routes: [...routeMap.values()],
    modules: [...moduleMap.values()].sort((a, b) => a.routeId.localeCompare(b.routeId) || a.position - b.position),
    books: [...bookMap.values()].sort((a, b) => a.order - b.order),
    lessons,
  };
}

export function getBibleProgressCatalog(language: "es" | "en"): BibleProgressCatalog {
  const rows = db.prepare(`
    SELECT
      bible_versions.id AS version_id,
      bible_versions.name AS version_name,
      bible_versions.abbreviation AS version_abbreviation,
      bible_versions.language AS version_language,
      books.id AS book_id,
      book_translations.name AS book_name,
      book_translations.slug AS book_slug,
      books.usfm_code AS book_usfm_code,
      books.order_number AS book_order,
      COUNT(DISTINCT bible_verses.chapter_number) AS total_chapters
    FROM bible_versions
    JOIN bible_verses ON bible_verses.version_id = bible_versions.id
    JOIN books ON books.id = bible_verses.book_id
    JOIN book_translations
      ON book_translations.book_id = books.id
      AND book_translations.language = bible_versions.language
    WHERE
      bible_versions.language = ?
      AND bible_versions.status <> 'Borrador'
      AND books.status <> 'Borrador'
    GROUP BY
      bible_versions.id,
      bible_versions.name,
      bible_versions.abbreviation,
      bible_versions.language,
      books.id,
      book_translations.name,
      book_translations.slug,
      books.usfm_code,
      books.order_number
    ORDER BY bible_versions.name ASC, books.order_number ASC
  `).all(language) as BibleRow[];

  const versionMap = new Map<string, BibleProgressVersionCatalogItem>();
  const books: BibleProgressBookCatalogItem[] = [];

  for (const row of rows) {
    const version = versionMap.get(row.version_id) ?? {
      id: row.version_id,
      name: row.version_name,
      abbreviation: row.version_abbreviation,
      language: row.version_language,
      totalChapters: 0,
    };
    version.totalChapters += row.total_chapters;
    versionMap.set(row.version_id, version);
    books.push({
      versionId: row.version_id,
      id: row.book_id,
      name: row.book_name,
      slug: row.book_slug,
      usfmCode: row.book_usfm_code,
      order: row.book_order,
      totalChapters: row.total_chapters,
    });
  }

  return { versions: [...versionMap.values()], books };
}
