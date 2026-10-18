import type { SearchIndexItem } from "./search-index";

export type SearchResultItem = SearchIndexItem & {
  score: number;
};

type BibleReferenceQuery = {
  bookName: string;
  chapterNumber: number;
  verseNumber: number | null;
};

export const SEARCH_FILTER_ORDER = [
  "Versículo",
  "Glosario",
  "Lugar",
  "Personaje",
  "Evento",
  "Tema",
  "Recurso",
  "Lección",
  "Ruta",
  "Sección",
  "Libro",
  "Pasaje",
];

const TYPE_RANK: Record<string, number> = {
  Glosario: 1,
  Lugar: 2,
  Personaje: 3,
  Tema: 4,
  Evento: 5,
  Recurso: 6,
  Lección: 7,
  Libro: 8,
  Pasaje: 9,
  Versículo: 10,
  Ruta: 11,
  Sección: 12,
};

const ENTITY_TITLE_BOOST: Record<string, number> = {
  Glosario: 90,
  Lugar: 85,
  Personaje: 82,
  Tema: 78,
  Evento: 72,
  Recurso: 69,
  Lección: 66,
  Libro: 64,
  Pasaje: 58,
  Ruta: 52,
  Sección: 48,
  Versículo: 20,
};

const BIBLE_BOOK_ALIASES: Record<string, string> = {
  gn: "genesis",
  gen: "genesis",
  genesis: "genesis",

  ex: "exodo",
  exo: "exodo",
  exodo: "exodo",

  lv: "levitico",
  lev: "levitico",
  levitico: "levitico",

  nm: "numeros",
  num: "numeros",
  numeros: "numeros",

  dt: "deuteronomio",
  deut: "deuteronomio",
  deuteronomio: "deuteronomio",

  jos: "josue",
  josue: "josue",

  jue: "jueces",
  jueces: "jueces",

  rut: "rut",

  "1 sam": "1 samuel",
  "1 s": "1 samuel",
  "1sam": "1 samuel",
  "1s": "1 samuel",
  "1 samuel": "1 samuel",

  "2 sam": "2 samuel",
  "2 s": "2 samuel",
  "2sam": "2 samuel",
  "2s": "2 samuel",
  "2 samuel": "2 samuel",

  "1 re": "1 reyes",
  "1 r": "1 reyes",
  "1re": "1 reyes",
  "1r": "1 reyes",
  "1 reyes": "1 reyes",

  "2 re": "2 reyes",
  "2 r": "2 reyes",
  "2re": "2 reyes",
  "2r": "2 reyes",
  "2 reyes": "2 reyes",

  "1 cr": "1 cronicas",
  "1 cro": "1 cronicas",
  "1cr": "1 cronicas",
  "1cro": "1 cronicas",
  "1 cronicas": "1 cronicas",

  "2 cr": "2 cronicas",
  "2 cro": "2 cronicas",
  "2cr": "2 cronicas",
  "2cro": "2 cronicas",
  "2 cronicas": "2 cronicas",

  esd: "esdras",
  esdras: "esdras",

  neh: "nehemias",
  nehemias: "nehemias",

  est: "ester",
  ester: "ester",

  job: "job",

  sal: "salmos",
  salmo: "salmos",
  salmos: "salmos",
  ps: "salmos",
  pslm: "salmos",

  pr: "proverbios",
  prov: "proverbios",
  proverbios: "proverbios",

  ec: "eclesiastes",
  ecl: "eclesiastes",
  eclesiastes: "eclesiastes",

  cnt: "cantares",
  cantar: "cantares",
  cantares: "cantares",

  is: "isaias",
  isa: "isaias",
  isaias: "isaias",

  jer: "jeremias",
  jeremias: "jeremias",

  lam: "lamentaciones",
  lamentaciones: "lamentaciones",

  ez: "ezequiel",
  eze: "ezequiel",
  ezequiel: "ezequiel",

  dn: "daniel",
  dan: "daniel",
  daniel: "daniel",

  os: "oseas",
  ose: "oseas",
  oseas: "oseas",

  jl: "joel",
  joel: "joel",

  am: "amos",
  amos: "amos",

  abd: "abdias",
  abdias: "abdias",

  jon: "jonas",
  jonas: "jonas",

  miq: "miqueas",
  miqueas: "miqueas",

  nah: "nahum",
  nahum: "nahum",

  hab: "habacuc",
  habacuc: "habacuc",

  sof: "sofonias",
  sofonias: "sofonias",

  hag: "hageo",
  hageo: "hageo",

  zac: "zacarias",
  zacarias: "zacarias",

  mal: "malaquias",
  malaquias: "malaquias",

  mt: "mateo",
  mat: "mateo",
  mateo: "mateo",

  mr: "marcos",
  mar: "marcos",
  marcos: "marcos",

  lc: "lucas",
  luc: "lucas",
  lucas: "lucas",

  jn: "juan",
  juan: "juan",

  hch: "hechos",
  hechos: "hechos",

  ro: "romanos",
  rom: "romanos",
  romanos: "romanos",

  "1 co": "1 corintios",
  "1 cor": "1 corintios",
  "1co": "1 corintios",
  "1cor": "1 corintios",
  "1 corintios": "1 corintios",

  "2 co": "2 corintios",
  "2 cor": "2 corintios",
  "2co": "2 corintios",
  "2cor": "2 corintios",
  "2 corintios": "2 corintios",

  ga: "galatas",
  gal: "galatas",
  galatas: "galatas",

  ef: "efesios",
  efe: "efesios",
  efesios: "efesios",

  fil: "filipenses",
  filipenses: "filipenses",

  col: "colosenses",
  colosenses: "colosenses",

  "1 tes": "1 tesalonicenses",
  "1tes": "1 tesalonicenses",
  "1 tesalonicenses": "1 tesalonicenses",

  "2 tes": "2 tesalonicenses",
  "2tes": "2 tesalonicenses",
  "2 tesalonicenses": "2 tesalonicenses",

  "1 ti": "1 timoteo",
  "1 tim": "1 timoteo",
  "1ti": "1 timoteo",
  "1tim": "1 timoteo",
  "1 timoteo": "1 timoteo",

  "2 ti": "2 timoteo",
  "2 tim": "2 timoteo",
  "2ti": "2 timoteo",
  "2tim": "2 timoteo",
  "2 timoteo": "2 timoteo",

  tit: "tito",
  tito: "tito",

  flm: "filemon",
  filemon: "filemon",

  heb: "hebreos",
  hebreos: "hebreos",

  stg: "santiago",
  sant: "santiago",
  santiago: "santiago",

  "1 p": "1 pedro",
  "1 pe": "1 pedro",
  "1 ped": "1 pedro",
  "1p": "1 pedro",
  "1pe": "1 pedro",
  "1ped": "1 pedro",
  "1 pedro": "1 pedro",

  "2 p": "2 pedro",
  "2 pe": "2 pedro",
  "2 ped": "2 pedro",
  "2p": "2 pedro",
  "2pe": "2 pedro",
  "2ped": "2 pedro",
  "2 pedro": "2 pedro",

  "1 jn": "1 juan",
  "1jn": "1 juan",
  "1 juan": "1 juan",

  "2 jn": "2 juan",
  "2jn": "2 juan",
  "2 juan": "2 juan",

  "3 jn": "3 juan",
  "3jn": "3 juan",
  "3 juan": "3 juan",

  jud: "judas",
  judas: "judas",

  ap: "apocalipsis",
  apo: "apocalipsis",
  apoc: "apocalipsis",
  apocalipsis: "apocalipsis",
};

const normalizedItemCache = new WeakMap<
  SearchIndexItem,
  {
    title: string;
    type: string;
    summary: string;
    searchText: string;
  }
>();

export function normalizeSearchText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeReferenceText(value: string) {
  return normalizeSearchText(value)
    .replace(/[.;,]/g, " ")
    .replace(/\s*:\s*/g, ":")
    .replace(/\s+/g, " ");
}

function getNormalizedItem(item: SearchIndexItem) {
  const cached = normalizedItemCache.get(item);

  if (cached) {
    return cached;
  }

  const normalized = {
    title: normalizeSearchText(item.title),
    type: normalizeSearchText(item.type),
    summary: normalizeSearchText(item.summary),
    searchText: normalizeSearchText(item.searchText),
  };

  normalizedItemCache.set(item, normalized);

  return normalized;
}

function getTypeRank(type: string) {
  return TYPE_RANK[type] ?? 99;
}

function getEntityTitleBoost(type: string) {
  return ENTITY_TITLE_BOOST[type] ?? 0;
}

function getSearchWords(query: string) {
  return query.split(/\s+/).filter(Boolean);
}

function isPhraseSearch(query: string) {
  return getSearchWords(query).length > 1;
}

function isReferenceLikeSearch(query: string) {
  return /\d/.test(query) || /\b\d+\s*[a-záéíóúñ]+/i.test(query);
}

function hasExactPhrase(value: string, query: string) {
  return value.includes(query);
}

function hasAllWords(value: string, words: string[]) {
  return words.length > 0 && words.every((word) => value.includes(word));
}

function parseBibleReferenceQuery(rawQuery: string): BibleReferenceQuery | null {
  const query = normalizeReferenceText(rawQuery);

  const referenceMatch = query.match(/^(.+?)\s+(\d{1,3})(?::|\s+)?(\d{1,3})?$/);

  if (!referenceMatch) {
    return null;
  }

  const [, rawBookName, rawChapterNumber, rawVerseNumber] = referenceMatch;

  const compactBookName = rawBookName.replace(/\s+/g, "");
  const bookName =
    BIBLE_BOOK_ALIASES[rawBookName] ??
    BIBLE_BOOK_ALIASES[compactBookName] ??
    rawBookName;

  const chapterNumber = Number(rawChapterNumber);
  const verseNumber = rawVerseNumber ? Number(rawVerseNumber) : null;

  if (!bookName || !Number.isFinite(chapterNumber)) {
    return null;
  }

  if (chapterNumber <= 0 || (verseNumber !== null && verseNumber <= 0)) {
    return null;
  }

  return {
    bookName,
    chapterNumber,
    verseNumber,
  };
}

function getBibleReferenceScore(
  item: SearchIndexItem,
  normalizedTitle: string,
  bibleReference: BibleReferenceQuery | null
) {
  if (!bibleReference || item.type !== "Versículo") {
    return 0;
  }

  const expectedTitleStart = `${bibleReference.bookName} `;

  if (!normalizedTitle.startsWith(expectedTitleStart)) {
    return 0;
  }

  if (item.chapterNumber !== bibleReference.chapterNumber) {
    return 0;
  }

  if (
    bibleReference.verseNumber !== null &&
    item.verseNumber !== bibleReference.verseNumber
  ) {
    return 0;
  }

  if (bibleReference.verseNumber !== null) {
    return 17000;
  }

  return 14000 - Math.min(item.verseNumber, 200);
}

export function scoreSearchItem(item: SearchIndexItem, rawQuery: string) {
  const query = normalizeSearchText(rawQuery);

  if (!query) return 0;

  const { title, type, summary, searchText } = getNormalizedItem(item);
  const bibleReference = parseBibleReferenceQuery(rawQuery);

  const referenceScore = getBibleReferenceScore(item, title, bibleReference);

  if (referenceScore > 0) {
    return referenceScore;
  }

  const words = getSearchWords(query);
  const phraseSearch = isPhraseSearch(query);
  const referenceLikeSearch = isReferenceLikeSearch(query);

  let score = 0;

  /*
    Prioridad máxima para frases exactas en versículos.
    Ejemplo:
    “en el principio” debe mostrar primero:
    - Génesis 1:1
    - Juan 1:1
    antes que versículos que solo contienen “principio”.
  */
  if (
    item.type === "Versículo" &&
    phraseSearch &&
    (hasExactPhrase(summary, query) || hasExactPhrase(searchText, query))
  ) {
    score = 13000;
  } else if (title === query) {
    score = 10000 + getEntityTitleBoost(item.type);
  } else if (title.startsWith(query)) {
    score = 8500 + getEntityTitleBoost(item.type);
  } else if (title.includes(query)) {
    score = 6500 + getEntityTitleBoost(item.type);
  } else if (summary.includes(query)) {
    score = item.type === "Versículo"
      ? 6200
      : 3600 + getEntityTitleBoost(item.type);
  } else if (searchText.includes(query)) {
    score = item.type === "Versículo"
      ? 6000
      : 2200 + Math.min(getEntityTitleBoost(item.type), 40);
  }

  if (score === 0 && words.length > 1 && hasAllWords(title, words)) {
    score = 5600 + getEntityTitleBoost(item.type);
  }

  if (score === 0 && words.length > 1 && hasAllWords(summary, words)) {
    score = item.type === "Versículo" ? 4300 : 3000;
  }

  if (score === 0 && words.length > 1 && hasAllWords(searchText, words)) {
    score = item.type === "Versículo" ? 4000 : 2600;
  }

  if (score === 0 && type.includes(query)) {
    score = 1200;
  }

  /*
    Si la búsqueda no es frase ni referencia, evitamos que miles de versículos
    dominen resultados de entidades exactas como Jesús, Israel, Jordán, etc.
  */
  if (score > 0 && item.type === "Versículo") {
    if (phraseSearch || referenceLikeSearch) {
      score += 500;
    } else {
      score -= 700;
    }
  }

  return Math.max(score, 0);
}

export function compareSearchResults(a: SearchResultItem, b: SearchResultItem) {
  return (
    b.score - a.score ||
    getTypeRank(a.type) - getTypeRank(b.type) ||
    a.bookOrder - b.bookOrder ||
    a.chapterNumber - b.chapterNumber ||
    a.verseNumber - b.verseNumber ||
    a.title.localeCompare(b.title, "es")
  );
}

export function getSearchResults(
  items: SearchIndexItem[],
  rawQuery: string
): SearchResultItem[] {
  const query = normalizeSearchText(rawQuery);

  if (!query) return [];

  return items
    .map((item) => ({
      ...item,
      score: scoreSearchItem(item, query),
    }))
    .filter((item) => item.score > 0)
    .sort(compareSearchResults);
}

export function getSearchCounts(results: SearchResultItem[]) {
  return results.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = (acc[item.type] ?? 0) + 1;
    return acc;
  }, {});
}

export function getAvailableSearchFilters(results: SearchResultItem[]) {
  const counts = getSearchCounts(results);

  return SEARCH_FILTER_ORDER.filter((type) => counts[type]).map((type) => ({
    type,
    count: counts[type],
  }));
}

export function getFilteredSearchResults(
  results: SearchResultItem[],
  activeType: string
) {
  if (activeType === "Todos") {
    return results;
  }

  return results.filter((item) => item.type === activeType);
}

export function getDisplaySearchResults(
  results: SearchResultItem[],
  activeType: string,
  limit = 80
) {
  return getFilteredSearchResults(results, activeType).slice(0, limit);
}