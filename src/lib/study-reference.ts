export type ParsedStudyReference = {
  startChapter: number;
  startVerse: number | null;
  endChapter: number;
  endVerse: number | null;
};

export function parseStudyReference(reference: string): ParsedStudyReference | null {
  const normalized = reference
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const match = normalized.match(/(\d+)(?::(\d+))?(?:-(?:(\d+):)?(\d+))?$/);
  if (!match) return null;

  const startChapter = Number(match[1]);
  const startVerse = match[2] ? Number(match[2]) : null;
  const endChapter = match[3] ? Number(match[3]) : startChapter;
  const endVerse = match[4] ? Number(match[4]) : startVerse;

  return { startChapter, startVerse, endChapter, endVerse };
}
