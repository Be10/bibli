import type { CollectionEntry } from "astro:content";

export type StudyEntry = CollectionEntry<"studies">;

export function getStudySlug(entry: StudyEntry) {
  const candidate = entry.id.split(/[\\/]/).pop() ?? entry.id;
  const stem = candidate.replace(/\.md$/i, "");
  const contentVersion = String(entry.data.content_version ?? "").trim();

  if (!contentVersion) return stem;

  // Astro's glob loader can normalize an entry id such as `-v1.0.0` to
  // `-v100`. Public lesson URLs must remain revision-independent, so strip
  // either representation using the canonical content_version from frontmatter.
  const versionSuffixes = [
    `-v${contentVersion}`,
    `-v${contentVersion.replace(/[^0-9]/g, "")}`,
  ];

  for (const suffix of versionSuffixes) {
    if (suffix !== "-v" && stem.toLowerCase().endsWith(suffix.toLowerCase())) {
      return stem.slice(0, -suffix.length);
    }
  }

  return stem;
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
