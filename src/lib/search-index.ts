import { sitePath } from "./site-paths";
import {
  getBibleBookPath,
  getBibleRootPath,
  getBibleVersePath,
} from "./bible-routes";
import {
  getDefaultBibleVersionId,
  type SupportedLanguageCode,
} from "./bible-config";
import {
  getAllBooksByLanguage,
  getAllEvents,
  getAllGlossaryTerms,
  getAllLessons,
  getAllPassages,
  getAllPeople,
  getAllPlaces,
  getAllRoutes,
  getAllTopics,
  getAllVisualResources,
  getBibleSearchVerses,
} from "./queries";

export type SearchIndexItem = {
  title: string;
  type: string;
  typeLabel?: string;
  url: string;
  summary: string;
  searchText: string;
  typePriority: number;
  bookOrder: number;
  chapterNumber: number;
  verseNumber: number;
  language?: SupportedLanguageCode;
  versionId?: string;
};

const typePriority: Record<string, number> = {
  Versículo: 1,
  Glosario: 2,
  Lugar: 3,
  Personaje: 4,
  Evento: 5,
  Tema: 6,
  Recurso: 7,
  Lección: 8,
  Libro: 9,
  Pasaje: 10,
  Ruta: 11,
  Sección: 12,
};

const typeLabels: Record<
  SupportedLanguageCode,
  Record<string, string>
> = {
  es: {
    Versículo: "Versículo",
    Glosario: "Glosario",
    Lugar: "Lugar",
    Personaje: "Personaje",
    Evento: "Evento",
    Tema: "Tema",
    Recurso: "Recurso",
    Lección: "Lección",
    Libro: "Libro",
    Pasaje: "Pasaje",
    Ruta: "Ruta",
    Sección: "Sección",
  },
  en: {
    Versículo: "Verse",
    Glosario: "Glossary",
    Lugar: "Place",
    Personaje: "Person",
    Evento: "Event",
    Tema: "Topic",
    Recurso: "Resource",
    Lección: "Lesson",
    Libro: "Book",
    Pasaje: "Passage",
    Ruta: "Route",
    Sección: "Section",
  },
};

function getTypePriority(type: string) {
  return typePriority[type] ?? 99;
}

function getTypeLabel(
  language: SupportedLanguageCode,
  type: string
) {
  return typeLabels[language][type] ?? type;
}

function joinSearchText(
  ...parts: Array<string | number | null | undefined>
) {
  return parts.filter(Boolean).join(" ");
}

function makeItem(
  language: SupportedLanguageCode,
  type: string,
  item: Omit<
    SearchIndexItem,
    "type" | "typeLabel" | "typePriority" | "language"
  >
): SearchIndexItem {
  return {
    ...item,
    type,
    typeLabel: getTypeLabel(language, type),
    typePriority: getTypePriority(type),
    language,
  };
}

export function buildSearchIndex(
  language: SupportedLanguageCode = "es"
): SearchIndexItem[] {
  const bibleVersionId = getDefaultBibleVersionId(language);
  const rawBooks = getAllBooksByLanguage(language).filter(
    (book) => book.status !== "Borrador" && book.usfm_code
  );

  const bookOrderById = new Map(
    rawBooks.map((book) => [book.id, book.order_number])
  );

  const bibleSection = makeItem(language, "Sección", {
    title: language === "en" ? "Bible" : "Biblia",
    url: getBibleRootPath(language),
    summary:
      language === "en"
        ? "Read the Bible by version, book, chapter, and verse."
        : "Lectura bíblica por versión, libro, capítulo y versículo.",
    searchText:
      language === "en"
        ? "Bible reading versions books chapters verses"
        : "Biblia lectura bíblica versiones libros capítulos versículos",
    bookOrder: 999,
    chapterNumber: 999,
    verseNumber: 999,
    versionId: bibleVersionId,
  });

  const books: SearchIndexItem[] = rawBooks.map((book) =>
    makeItem(language, "Libro", {
      title: book.name,
      url:
        language === "en"
          ? getBibleBookPath(
              language,
              bibleVersionId,
              book.usfm_code
            )
          : sitePath(`/libros/${book.slug}/`),
      summary:
        book.summary ??
        book.category ??
        (language === "en" ? "Bible book." : "Libro bíblico."),
      searchText: joinSearchText(
        book.name,
        book.abbreviation,
        book.testament,
        book.category,
        book.genre,
        book.summary,
        book.usfm_code
      ),
      bookOrder: book.order_number,
      chapterNumber: 999,
      verseNumber: 999,
      versionId: bibleVersionId,
    })
  );

  const bibleVerses: SearchIndexItem[] = getBibleSearchVerses(
    bibleVersionId,
    language
  )
    .filter((verse) => verse.verse_text)
    .map((verse) =>
      makeItem(language, "Versículo", {
        title: `${verse.book_name} ${verse.chapter_number}:${verse.verse_number}`,
        url: getBibleVersePath(
          language,
          bibleVersionId,
          verse.book_usfm_code,
          verse.chapter_number,
          verse.verse_number
        ),
        summary: verse.verse_text ?? "",
        searchText: joinSearchText(
          verse.book_name,
          verse.book_usfm_code,
          verse.chapter_number,
          verse.verse_number,
          verse.verse_text
        ),
        bookOrder: verse.book_order,
        chapterNumber: verse.chapter_number,
        verseNumber: verse.verse_number,
        versionId: bibleVersionId,
      })
    );

  // English currently has a complete localized Bible, but the editorial
  // entities outside the Bible have not yet been translated. Do not leak
  // Spanish fallbacks into the English search experience.
  if (language === "en") {
    return [bibleSection, ...books, ...bibleVerses];
  }

  const sectionItems: SearchIndexItem[] = [
    makeItem(language, "Sección", {
      title: "Lecciones",
      url: sitePath("/lecciones/"),
      summary: "Índice de lecciones publicadas de Biblioteca Bíblica.",
      searchText: "Lecciones índice lecciones publicadas Biblioteca Bíblica Bibli",
      bookOrder: 999,
      chapterNumber: 999,
      verseNumber: 999,
    }),
    bibleSection,
    makeItem(language, "Sección", {
      title: "Libros",
      url: sitePath("/libros/"),
      summary: "Directorio de libros bíblicos.",
      searchText: "Libros directorio libros bíblicos",
      bookOrder: 999,
      chapterNumber: 999,
      verseNumber: 999,
    }),
    makeItem(language, "Sección", {
      title: "Pasajes",
      url: sitePath("/pasajes/"),
      summary: "Pasajes bíblicos conectados con lecciones y eventos.",
      searchText: "Pasajes bíblicos conectados lecciones eventos",
      bookOrder: 999,
      chapterNumber: 999,
      verseNumber: 999,
    }),
    makeItem(language, "Sección", {
      title: "Eventos",
      url: sitePath("/eventos/"),
      summary: "Línea narrativa de eventos bíblicos.",
      searchText: "Eventos línea narrativa eventos bíblicos",
      bookOrder: 999,
      chapterNumber: 999,
      verseNumber: 999,
    }),
    makeItem(language, "Sección", {
      title: "Temas",
      url: sitePath("/temas/"),
      summary: "Conceptos y temas bíblicos principales.",
      searchText: "Temas conceptos bíblicos principales",
      bookOrder: 999,
      chapterNumber: 999,
      verseNumber: 999,
    }),
    makeItem(language, "Sección", {
      title: "Personajes",
      url: sitePath("/personajes/"),
      summary: "Directorio de personajes bíblicos.",
      searchText: "Personajes directorio personajes bíblicos",
      bookOrder: 999,
      chapterNumber: 999,
      verseNumber: 999,
    }),
    makeItem(language, "Sección", {
      title: "Lugares",
      url: sitePath("/lugares/"),
      summary: "Lugares bíblicos conectados con mapa y eventos.",
      searchText: "Lugares bíblicos mapa eventos",
      bookOrder: 999,
      chapterNumber: 999,
      verseNumber: 999,
    }),
    makeItem(language, "Sección", {
      title: "Mapa",
      url: sitePath("/mapa/"),
      summary: "Mapa bíblico visual con lugares registrados.",
      searchText: "Mapa bíblico visual lugares registrados geografía",
      bookOrder: 999,
      chapterNumber: 999,
      verseNumber: 999,
    }),
    makeItem(language, "Sección", {
      title: "Rutas",
      url: sitePath("/rutas/"),
      summary: "Rutas guiadas de estudio bíblico.",
      searchText: "Rutas recorridos itinerarios estudio bíblico guiado",
      bookOrder: 999,
      chapterNumber: 999,
      verseNumber: 999,
    }),
    makeItem(language, "Sección", {
      title: "Recursos visuales",
      url: sitePath("/recursos/"),
      summary: "Mapas, cronología, esquemas e infografías para el estudio bíblico.",
      searchText: "Recursos visuales mapas cronología línea de tiempo esquemas infografías",
      bookOrder: 999,
      chapterNumber: 999,
      verseNumber: 999,
    }),
    makeItem(language, "Sección", {
      title: "Glosario",
      url: sitePath("/glosario/"),
      summary: "Términos bíblicos explicados de forma clara.",
      searchText: "Glosario términos palabras definiciones bíblicas",
      bookOrder: 999,
      chapterNumber: 999,
      verseNumber: 999,
    }),
    makeItem(language, "Sección", {
      title: "Línea de tiempo",
      url: sitePath("/linea-de-tiempo/"),
      summary: "Cronología visual de los eventos bíblicos.",
      searchText: "Línea de tiempo cronología eventos historia bíblica",
      bookOrder: 999,
      chapterNumber: 999,
      verseNumber: 999,
    }),
    makeItem(language, "Sección", {
      title: "Explorar",
      url: sitePath("/explorar/"),
      summary: "Centro de navegación por todo el contenido de Bibli.",
      searchText: "Explorar navegar contenido Bibli biblioteca bíblica",
      bookOrder: 999,
      chapterNumber: 999,
      verseNumber: 999,
    }),
  ];

  const routes: SearchIndexItem[] = getAllRoutes()
    .filter((route) => route.status !== "Borrador")
    .map((route) =>
      makeItem(language, "Ruta", {
        title: route.title,
        url: sitePath(`/rutas/${route.slug}/`),
        summary: route.description ?? "Ruta guiada.",
        searchText: joinSearchText(
          route.title,
          route.subtitle,
          route.description,
          route.level,
          route.estimated_duration,
          route.id
        ),
        bookOrder: 999,
        chapterNumber: 999,
        verseNumber: 999,
      })
    );

  const lessons: SearchIndexItem[] = getAllLessons()
    .filter((lesson) => lesson.status !== "Borrador")
    .map((lesson) =>
      makeItem(language, "Lección", {
        title: lesson.title,
        url: sitePath(`/lecciones/${lesson.slug}/`),
        summary: lesson.primary_reference
          ? `Estudio de ${lesson.primary_reference}`
          : lesson.summary ?? "Lección bíblica.",
        searchText: joinSearchText(
          `Lección ${lesson.lesson_number}`,
          lesson.lesson_number,
          lesson.title,
          lesson.eyebrow,
          lesson.main_idea,
          lesson.summary,
          lesson.objective,
          lesson.primary_reference,
          lesson.translation,
          lesson.book_id,
          lesson.module_title,
          lesson.route_id,
          lesson.search_text
        ),
        bookOrder: 999,
        chapterNumber: 999,
        verseNumber: 999,
      })
    );

  const passages: SearchIndexItem[] = getAllPassages()
    .filter((passage) => passage.status !== "Borrador")
    .map((passage) =>
      makeItem(language, "Pasaje", {
        title: passage.display_reference,
        url: sitePath(`/pasajes/${passage.slug}/`),
        summary: passage.summary ?? `Pasaje en ${passage.book_name}.`,
        searchText: joinSearchText(
          passage.display_reference,
          passage.book_name,
          passage.book_usfm_code,
          passage.summary
        ),
        bookOrder: bookOrderById.get(passage.book_id) ?? 999,
        chapterNumber: passage.start_chapter,
        verseNumber: passage.start_verse ?? 999,
      })
    );

  const events: SearchIndexItem[] = getAllEvents()
    .filter((event) => event.status !== "Borrador")
    .map((event) =>
      makeItem(language, "Evento", {
        title: event.title,
        url: sitePath(`/eventos/${event.slug}/`),
        summary: event.summary ?? event.biblical_period ?? "Evento bíblico.",
        searchText: joinSearchText(
          event.title,
          event.summary,
          event.description,
          event.biblical_period,
          event.approximate_date
        ),
        bookOrder: 999,
        chapterNumber: 999,
        verseNumber: 999,
      })
    );

  const topics: SearchIndexItem[] = getAllTopics()
    .filter((topic) => topic.status !== "Borrador")
    .map((topic) =>
      makeItem(language, "Tema", {
        title: topic.title,
        url: sitePath(`/temas/${topic.slug}/`),
        summary: topic.definition ?? "Tema bíblico.",
        searchText: joinSearchText(topic.title, topic.definition),
        bookOrder: 999,
        chapterNumber: 999,
        verseNumber: 999,
      })
    );

  const people: SearchIndexItem[] = getAllPeople()
    .filter((person) => person.status !== "Borrador")
    .map((person) =>
      makeItem(language, "Personaje", {
        title: person.name,
        url: sitePath(`/personajes/${person.slug}/`),
        summary: person.summary ?? "Personaje bíblico.",
        searchText: joinSearchText(person.name, person.summary),
        bookOrder: 999,
        chapterNumber: 999,
        verseNumber: 999,
      })
    );

  const places: SearchIndexItem[] = getAllPlaces()
    .filter((place) => place.status !== "Borrador")
    .map((place) =>
      makeItem(language, "Lugar", {
        title: place.name,
        url: sitePath(`/lugares/${place.slug}/`),
        summary: place.summary ?? place.place_type ?? "Lugar bíblico.",
        searchText: joinSearchText(
          place.name,
          place.place_type,
          place.summary
        ),
        bookOrder: 999,
        chapterNumber: 999,
        verseNumber: 999,
      })
    );

  const resources: SearchIndexItem[] = getAllVisualResources()
    .filter((resource) => resource.status !== "Borrador")
    .map((resource) =>
      makeItem(language, "Recurso", {
        title: resource.title,
        url: sitePath(`/recursos/${resource.slug}/`),
        summary:
          resource.description ??
          resource.resource_type ??
          "Recurso visual para el estudio bíblico.",
        searchText: joinSearchText(
          resource.title,
          resource.resource_type,
          resource.description,
          resource.alt_text
        ),
        bookOrder: 999,
        chapterNumber: 999,
        verseNumber: 999,
      })
    );

  const glossary: SearchIndexItem[] = getAllGlossaryTerms()
    .filter((term) => term.status !== "Borrador")
    .map((term) =>
      makeItem(language, "Glosario", {
        title: term.term,
        url: sitePath(`/glosario/${term.slug}/`),
        summary: term.definition ?? "Término del glosario.",
        searchText: joinSearchText(term.term, term.definition),
        bookOrder: 999,
        chapterNumber: 999,
        verseNumber: 999,
      })
    );

  return [
    ...sectionItems,
    ...routes,
    ...lessons,
    ...books,
    ...passages,
    ...events,
    ...topics,
    ...people,
    ...places,
    ...resources,
    ...glossary,
    ...bibleVerses,
  ];
}

export const SEARCH_INDEX_PAYLOAD_VERSION = 1 as const;

export type SearchIndexPayload = {
  version: typeof SEARCH_INDEX_PAYLOAD_VERSION;
  items: Array<[
    title: string,
    type: string,
    typeLabel: string,
    url: string,
    summary: string,
    searchText: string,
    typePriority: number,
    bookOrder: number,
    chapterNumber: number,
    verseNumber: number,
  ]>;
};

export function buildSearchIndexPayload(
  language: SupportedLanguageCode = "es"
): SearchIndexPayload {
  return {
    version: SEARCH_INDEX_PAYLOAD_VERSION,
    items: buildSearchIndex(language).map((item) => [
      item.title,
      item.type,
      item.typeLabel ?? item.type,
      item.url,
      item.summary,
      item.searchText,
      item.typePriority,
      item.bookOrder,
      item.chapterNumber,
      item.verseNumber,
    ]),
  };
}
