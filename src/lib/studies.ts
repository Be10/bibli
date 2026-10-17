import type { CollectionEntry } from "astro:content";

export type StudyEntry = CollectionEntry<"studies">;

export function getStudySlug(entry: StudyEntry) {
  const candidate = entry.id.split(/[\\/]/).pop() ?? entry.id;
  return candidate.replace(/\.md$/i, "");
}

export function getStudyTitle(entry: StudyEntry) {
  const body = entry.body ?? "";
  const match = body.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? entry.data.primary_reference;
}

export function getStudyIntro(entry: StudyEntry) {
  const body = entry.body ?? "";
  const heading = body.match(/^##\s+🧭\s+Dónde estamos\s*$/m);
  if (!heading || heading.index === undefined) return "";

  const afterHeading = body.slice(heading.index + heading[0].length).replace(/^\s+/, "");
  const nextHeadingIndex = afterHeading.search(/^##\s+/m);
  const section = nextHeadingIndex >= 0 ? afterHeading.slice(0, nextHeadingIndex) : afterHeading;
  const paragraph = section.split(/\n\s*\n/).find((value) => value.trim()) ?? "";

  return paragraph
    .replace(/\*\*/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .trim();
}

export function studyWordCount(entry: StudyEntry) {
  return (entry.body ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\[\]()!-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}
