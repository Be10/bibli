import registryJson from "../../content/bibli-images-integrated.json";
import { sitePath } from "./site-paths";

export type BibliImgLocale = "es-419" | "en-US";

type LocalizedText = {
  display_name: string;
  definition: string;
  historical_context: string | null;
  original_language_note: string | null;
  alt_text: string;
};

type LocalizedReferences = Record<BibliImgLocale, string[]>;

export type IntegratedBibliImgEntry = {
  entityKey: string;
  canonicalName: string;
  group: string;
  sourceStatus: "approved";
  glossarySlug: string;
  localization: {
    default_locale: BibliImgLocale;
    required_locales: BibliImgLocale[];
  };
  locales: Record<BibliImgLocale, LocalizedText>;
  originalTerms: Array<{
    language: string;
    script: string | null;
    transliteration: string | null;
    lemma: string | null;
    meaning: Record<BibliImgLocale, string | null>;
    certainty: string | null;
  }>;
  biblicalReferences: {
    primary: LocalizedReferences;
    additional: LocalizedReferences;
    occurrencesSource: string | null;
    occurrencesCount: number | null;
  };
  historical: {
    period: string | null;
    region: string | null;
    certainty: string;
  };
  visual: {
    version: number;
    aspectRatio: string;
    hasAlpha: boolean;
    masterChecksum: string;
    optimizedPath: string;
    highPath: string;
    optimizedWidth: number;
    optimizedHeight: number;
    highWidth: number;
    highHeight: number;
    optimizedChecksum: string;
    highChecksum: string;
  };
  approval: {
    approved_at: string;
    notes: string | null;
  };
  sourcePath: string;
  integrationStatus: "pilot" | "integrated";
};

type Registry = {
  schemaVersion: number;
  sourceRoot: string;
  entries: Record<string, IntegratedBibliImgEntry>;
};

const registry = registryJson as Registry;


const configuredMediaBaseUrl =
  import.meta.env.PUBLIC_BIBLI_MEDIA_BASE_URL?.trim().replace(/\/+$/, "") ?? "";

export function bibliImgMediaUrl(publicPath: string): string {
  if (!publicPath.startsWith("/media/editorial/")) {
    throw new Error(`Ruta BibliImg inesperada: ${publicPath}`);
  }

  if (!configuredMediaBaseUrl) {
    return sitePath(publicPath);
  }

  const objectKey = publicPath.replace(/^\/media\//, "");

  return `${configuredMediaBaseUrl}/${objectKey}`;
}

export function getIntegratedGlossaryEntry(slug: string): IntegratedBibliImgEntry | undefined {
  const entry = registry.entries[slug];
  return entry?.glossarySlug === slug && entry.sourceStatus === "approved" ? entry : undefined;
}

export function getIntegratedBibliImgEntries(): IntegratedBibliImgEntry[] {
  return Object.values(registry.entries);
}
