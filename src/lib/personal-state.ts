export const PERSONAL_STATE_SCHEMA_VERSION = 1 as const;

export const PERSONAL_STORAGE_KEYS = {
  bookmarks: "bibli-bookmarks-v1",
  notes: "bibli-notes-v1",
  history: "bibli-history-v1",
  learningProgress: "bibli-learning-progress-v1",
} as const;

export const BOOKMARKS_STORAGE_KEY = PERSONAL_STORAGE_KEYS.bookmarks;
export const NOTES_STORAGE_KEY = PERSONAL_STORAGE_KEYS.notes;
export const HISTORY_STORAGE_KEY = PERSONAL_STORAGE_KEYS.history;
export const LEARNING_PROGRESS_STORAGE_KEY = PERSONAL_STORAGE_KEYS.learningProgress;

export type PersonalLanguage = "es" | "en";
export type PersonalContentType =
  | "page"
  | "route"
  | "lesson"
  | "bible-chapter"
  | "bible-verse"
  | "passage"
  | "book"
  | "topic"
  | "person"
  | "place"
  | "event"
  | "glossary"
  | "resource";

export interface PersonalContentRefV1 {
  contentKey: string;
  href: string;
  title: string;
  contentType: PersonalContentType;
  lang: PersonalLanguage;
}

export interface BookmarkV1 extends PersonalContentRefV1 {
  id: string;
  createdAt: string;
}

export interface NoteV1 extends PersonalContentRefV1 {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryEntryV1 extends PersonalContentRefV1 {
  visitedAt: string;
}

export interface VersionedCollectionV1<T> {
  schemaVersion: typeof PERSONAL_STATE_SCHEMA_VERSION;
  items: T[];
}

export interface LearningProgressV1 {
  schemaVersion: typeof PERSONAL_STATE_SCHEMA_VERSION;
  completed: string[];
  lastLessonByRoute: Record<string, string>;
  readBibleChapters: string[];
  updatedAt?: string;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const uniqueStrings = (value: unknown) =>
  [...new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [])];

const stringRecord = (value: unknown) => {
  const source = asRecord(value);
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(source)) {
    if (key.trim() && typeof entry === "string" && entry.trim()) result[key] = entry;
  }
  return result;
};

const readJson = (key: string): unknown => {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Personal state must never make reading/navigation fail when storage is unavailable.
  }
};

export const emptyLearningProgress = (): LearningProgressV1 => ({
  schemaVersion: PERSONAL_STATE_SCHEMA_VERSION,
  completed: [],
  lastLessonByRoute: {},
  readBibleChapters: [],
});

export function normalizeLearningProgress(value: unknown): LearningProgressV1 {
  const source = asRecord(value);
  const normalized: LearningProgressV1 = {
    schemaVersion: PERSONAL_STATE_SCHEMA_VERSION,
    completed: uniqueStrings(source.completed),
    lastLessonByRoute: stringRecord(source.lastLessonByRoute),
    readBibleChapters: uniqueStrings(source.readBibleChapters),
  };
  if (typeof source.updatedAt === "string" && source.updatedAt.trim()) normalized.updatedAt = source.updatedAt;
  return normalized;
}

export function readLearningProgress(): LearningProgressV1 {
  return normalizeLearningProgress(readJson(LEARNING_PROGRESS_STORAGE_KEY));
}

export function isBibleChapterRead(ref: PersonalContentRefV1): boolean {
  if (ref.contentType !== "bible-chapter") return false;
  return readLearningProgress().readBibleChapters.includes(ref.contentKey);
}

export function toggleBibleChapterRead(ref: PersonalContentRefV1): { read: boolean; contentKey: string } {
  if (ref.contentType !== "bible-chapter") return { read: false, contentKey: ref.contentKey };
  const progress = readLearningProgress();
  const readBibleChapters = new Set(progress.readBibleChapters);
  const read = !readBibleChapters.has(ref.contentKey);
  if (read) readBibleChapters.add(ref.contentKey); else readBibleChapters.delete(ref.contentKey);
  progress.readBibleChapters = [...readBibleChapters];
  writeLearningProgress(progress);
  return { read, contentKey: ref.contentKey };
}

export function writeLearningProgress(value: LearningProgressV1): LearningProgressV1 {
  const normalized = normalizeLearningProgress(value);
  normalized.updatedAt = new Date().toISOString();
  writeJson(LEARNING_PROGRESS_STORAGE_KEY, normalized);
  dispatchPersonalChange("bibli:progress-change", normalized);
  return normalized;
}

const emptyCollection = <T>(): VersionedCollectionV1<T> => ({
  schemaVersion: PERSONAL_STATE_SCHEMA_VERSION,
  items: [],
});

const normalizeContentRef = (value: unknown): PersonalContentRefV1 | null => {
  const source = asRecord(value);
  const contentKey = typeof source.contentKey === "string" ? source.contentKey.trim() : "";
  const href = typeof source.href === "string" ? source.href.trim() : "";
  const title = typeof source.title === "string" ? source.title.trim() : "";
  const lang = source.lang === "en" ? "en" : source.lang === "es" ? "es" : null;
  const allowedTypes: PersonalContentType[] = [
    "page", "route", "lesson", "bible-chapter", "bible-verse", "passage", "book",
    "topic", "person", "place", "event", "glossary", "resource",
  ];
  const contentType = allowedTypes.includes(source.contentType as PersonalContentType)
    ? (source.contentType as PersonalContentType)
    : null;
  if (!contentKey || !href || !title || !lang || !contentType) return null;
  if (!href.startsWith("/") || href.startsWith("//")) return null;
  return { contentKey, href, title, contentType, lang };
};

const normalizeCollection = <T>(value: unknown, normalizeItem: (item: unknown) => T | null): VersionedCollectionV1<T> => {
  const source = asRecord(value);
  const rawItems = Array.isArray(source.items) ? source.items : [];
  return {
    schemaVersion: PERSONAL_STATE_SCHEMA_VERSION,
    items: rawItems.map(normalizeItem).filter((item): item is T => item !== null),
  };
};

const normalizeBookmark = (value: unknown): BookmarkV1 | null => {
  const source = asRecord(value);
  const ref = normalizeContentRef(source);
  const id = typeof source.id === "string" ? source.id.trim() : "";
  const createdAt = typeof source.createdAt === "string" ? source.createdAt.trim() : "";
  return ref && id && createdAt ? { ...ref, id, createdAt } : null;
};

const normalizeNote = (value: unknown): NoteV1 | null => {
  const source = asRecord(value);
  const ref = normalizeContentRef(source);
  const id = typeof source.id === "string" ? source.id.trim() : "";
  const text = typeof source.text === "string" ? source.text : "";
  const createdAt = typeof source.createdAt === "string" ? source.createdAt.trim() : "";
  const updatedAt = typeof source.updatedAt === "string" ? source.updatedAt.trim() : "";
  return ref && id && createdAt && updatedAt ? { ...ref, id, text, createdAt, updatedAt } : null;
};

const normalizeHistoryEntry = (value: unknown): HistoryEntryV1 | null => {
  const source = asRecord(value);
  const ref = normalizeContentRef(source);
  const visitedAt = typeof source.visitedAt === "string" ? source.visitedAt.trim() : "";
  return ref && visitedAt ? { ...ref, visitedAt } : null;
};

export function readBookmarks(): VersionedCollectionV1<BookmarkV1> {
  return normalizeCollection(readJson(BOOKMARKS_STORAGE_KEY), normalizeBookmark);
}

export function writeBookmarks(value: VersionedCollectionV1<BookmarkV1>) {
  const normalized = normalizeCollection(value, normalizeBookmark);
  writeJson(BOOKMARKS_STORAGE_KEY, normalized);
  return normalized;
}

export function readNotes(): VersionedCollectionV1<NoteV1> {
  return normalizeCollection(readJson(NOTES_STORAGE_KEY), normalizeNote);
}

export function writeNotes(value: VersionedCollectionV1<NoteV1>) {
  const normalized = normalizeCollection(value, normalizeNote);
  writeJson(NOTES_STORAGE_KEY, normalized);
  return normalized;
}

export function readHistory(): VersionedCollectionV1<HistoryEntryV1> {
  return normalizeCollection(readJson(HISTORY_STORAGE_KEY), normalizeHistoryEntry);
}

export function writeHistory(value: VersionedCollectionV1<HistoryEntryV1>) {
  const normalized = normalizeCollection(value, normalizeHistoryEntry);
  writeJson(HISTORY_STORAGE_KEY, normalized);
  return normalized;
}

export const emptyBookmarks = () => emptyCollection<BookmarkV1>();
export const emptyNotes = () => emptyCollection<NoteV1>();
export const emptyHistory = () => emptyCollection<HistoryEntryV1>();


export const PERSONAL_HISTORY_LIMIT = 50 as const;

export interface PersonalContentLocationInput {
  pathname: string;
  href: string;
  title: string;
  lang: PersonalLanguage;
}

const normalizeContentPath = (pathname: string) => {
  const clean = pathname.split(/[?#]/, 1)[0] || "/";
  return clean === "/" ? "/" : `/${clean.replace(/^\/+|\/+$/g, "")}/`;
};

export function createPersonalContentRef({
  pathname,
  href,
  title,
  lang,
}: PersonalContentLocationInput): PersonalContentRefV1 | null {
  const normalizedPath = normalizeContentPath(pathname);
  const normalizedHref = typeof href === "string" ? href.trim() : "";
  const normalizedTitle = typeof title === "string" ? title.trim() : "";
  if (!normalizedHref || !normalizedTitle) return null;

  const definitions: Array<{
    type: PersonalContentType;
    pattern: RegExp;
    key: (match: RegExpMatchArray) => string;
  }> = [
    {
      type: "bible-chapter",
      pattern: /\/(?:es\/biblia|en\/bible)\/([^/]+)\/([^/]+)\/(\d+)\/$/,
      key: (match) => `bible-chapter:${lang}:${match[1]}:${match[2]}:${match[3]}`,
    },
    { type: "lesson", pattern: /\/lecciones\/([^/]+)\/$/, key: (match) => `lesson:${match[1]}` },
    { type: "route", pattern: /\/rutas\/([^/]+)\/$/, key: (match) => `route:${match[1]}` },
    { type: "passage", pattern: /\/pasajes\/([^/]+)\/$/, key: (match) => `passage:${match[1]}` },
    { type: "book", pattern: /\/libros\/([^/]+)\/$/, key: (match) => `book:${match[1]}` },
    { type: "topic", pattern: /\/temas\/([^/]+)\/$/, key: (match) => `topic:${match[1]}` },
    { type: "person", pattern: /\/personajes\/([^/]+)\/$/, key: (match) => `person:${match[1]}` },
    { type: "place", pattern: /\/lugares\/([^/]+)\/$/, key: (match) => `place:${match[1]}` },
    { type: "event", pattern: /\/eventos\/([^/]+)\/$/, key: (match) => `event:${match[1]}` },
    { type: "glossary", pattern: /\/glosario\/([^/]+)\/$/, key: (match) => `glossary:${match[1]}` },
    { type: "resource", pattern: /\/recursos\/([^/]+)\/$/, key: (match) => `resource:${match[1]}` },
  ];

  for (const definition of definitions) {
    const match = normalizedPath.match(definition.pattern);
    if (!match) continue;
    return {
      contentKey: definition.key(match),
      href: normalizedHref,
      title: normalizedTitle,
      contentType: definition.type,
      lang,
    };
  }

  return null;
}

export function recordHistoryVisit(
  ref: PersonalContentRefV1,
  visitedAt = new Date().toISOString(),
): HistoryEntryV1 | null {
  const entry = normalizeHistoryEntry({ ...ref, visitedAt });
  if (!entry) return null;

  const current = readHistory();
  const items = [
    entry,
    ...current.items.filter(
      (item) => !(item.contentKey === entry.contentKey && item.lang === entry.lang),
    ),
  ].slice(0, PERSONAL_HISTORY_LIMIT);

  writeHistory({ schemaVersion: PERSONAL_STATE_SCHEMA_VERSION, items });
  if (typeof window !== "undefined") {
    document.dispatchEvent(new CustomEvent("bibli:history-change", { detail: entry }));
  }
  return entry;
}


export function clearHistory(lang?: PersonalLanguage): void {
  const current = readHistory();
  writeHistory({
    schemaVersion: PERSONAL_STATE_SCHEMA_VERSION,
    items: lang ? current.items.filter((item) => item.lang !== lang) : [],
  });
  dispatchPersonalChange("bibli:history-change", { cleared: true, lang: lang ?? null });
}

export function getLatestHistoryEntry(lang?: PersonalLanguage): HistoryEntryV1 | null {
  const items = readHistory().items
    .filter((entry) => !lang || entry.lang === lang)
    .sort((a, b) => Date.parse(b.visitedAt) - Date.parse(a.visitedAt));
  return items[0] ?? null;
}

const sameContentRef = (a: PersonalContentRefV1, b: PersonalContentRefV1) =>
  a.contentKey === b.contentKey && a.lang === b.lang;

const personalItemId = (kind: "bookmark" | "note", ref: PersonalContentRefV1) =>
  `${kind}:${ref.lang}:${ref.contentKey}`;

const dispatchPersonalChange = (name: string, detail: unknown) => {
  if (typeof document === "undefined") return;
  document.dispatchEvent(new CustomEvent(name, { detail }));
};

export function getBookmarkForContent(ref: PersonalContentRefV1): BookmarkV1 | null {
  return readBookmarks().items.find((item) => sameContentRef(item, ref)) ?? null;
}

export function toggleBookmark(
  ref: PersonalContentRefV1,
  createdAt = new Date().toISOString(),
): { bookmarked: boolean; item: BookmarkV1 | null } {
  const current = readBookmarks();
  const existing = current.items.find((item) => sameContentRef(item, ref));

  if (existing) {
    writeBookmarks({
      schemaVersion: PERSONAL_STATE_SCHEMA_VERSION,
      items: current.items.filter((item) => !sameContentRef(item, ref)),
    });
    dispatchPersonalChange("bibli:bookmarks-change", { ref, bookmarked: false });
    return { bookmarked: false, item: null };
  }

  const item = normalizeBookmark({
    ...ref,
    id: personalItemId("bookmark", ref),
    createdAt,
  });
  if (!item) return { bookmarked: false, item: null };

  writeBookmarks({
    schemaVersion: PERSONAL_STATE_SCHEMA_VERSION,
    items: [item, ...current.items.filter((entry) => !sameContentRef(entry, ref))],
  });
  dispatchPersonalChange("bibli:bookmarks-change", { ref: item, bookmarked: true });
  return { bookmarked: true, item };
}


export function deleteBookmark(ref: PersonalContentRefV1): boolean {
  const current = readBookmarks();
  const hadBookmark = current.items.some((item) => sameContentRef(item, ref));
  if (!hadBookmark) return false;

  writeBookmarks({
    schemaVersion: PERSONAL_STATE_SCHEMA_VERSION,
    items: current.items.filter((item) => !sameContentRef(item, ref)),
  });
  dispatchPersonalChange("bibli:bookmarks-change", { ref, bookmarked: false });
  return true;
}

export function getNoteForContent(ref: PersonalContentRefV1): NoteV1 | null {
  return readNotes().items.find((item) => sameContentRef(item, ref)) ?? null;
}

export function upsertNote(
  ref: PersonalContentRefV1,
  text: string,
  updatedAt = new Date().toISOString(),
): NoteV1 | null {
  const cleanText = String(text ?? "").trim();
  if (!cleanText) {
    deleteNote(ref);
    return null;
  }

  const current = readNotes();
  const existing = current.items.find((item) => sameContentRef(item, ref));
  const item = normalizeNote({
    ...ref,
    id: existing?.id ?? personalItemId("note", ref),
    text: cleanText,
    createdAt: existing?.createdAt ?? updatedAt,
    updatedAt,
  });
  if (!item) return null;

  writeNotes({
    schemaVersion: PERSONAL_STATE_SCHEMA_VERSION,
    items: [item, ...current.items.filter((entry) => !sameContentRef(entry, ref))],
  });
  dispatchPersonalChange("bibli:notes-change", { ref: item, deleted: false });
  return item;
}

export function deleteNote(ref: PersonalContentRefV1): boolean {
  const current = readNotes();
  const hadNote = current.items.some((item) => sameContentRef(item, ref));
  if (!hadNote) return false;

  writeNotes({
    schemaVersion: PERSONAL_STATE_SCHEMA_VERSION,
    items: current.items.filter((item) => !sameContentRef(item, ref)),
  });
  dispatchPersonalChange("bibli:notes-change", { ref, deleted: true });
  return true;
}
