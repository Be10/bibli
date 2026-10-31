import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { sitePath } from "../lib/site-paths";
import bibliImgDelivery from "../../content/bibli-images-r2.json";
import {
  getBibleBookPath,
  getBibleChapterPath,
  getBibleRootPath,
  getBibleVersionPath,
} from "../lib/bible-routes";
import {
  getAllBibleVersions,
  getAllBooksByLanguage,
  getAllRoutes,
  getBibleChaptersByBookId,
  getBibleSearchVerses,
  getLessonsByRouteId,
} from "../lib/queries";

export const prerender = true;

type PackageKind = "app" | "lessons" | "bible";

type OfflinePackage = {
  id: string;
  kind: PackageKind;
  language: "all" | "es" | "en";
  title: { es: string; en: string };
  description: { es: string; en: string };
  versionId?: string;
  versionLabel?: string;
  urls: string[];
  urlCount: number;
  revision: string;
};

type MediaQuality = "optimized" | "high";

type OfflineMediaAsset = {
  slug: string;
  version: number;
  key: string;
  url: string;
  sha256: string;
  bytes: number;
};

type OfflineMediaVariant = {
  quality: MediaQuality;
  label: { es: string; en: string };
  urls: string[];
  urlCount: number;
  totalBytes: number;
  revision: string;
  assets: OfflineMediaAsset[];
};

type OfflineMediaPackage = {
  id: "bibliimg";
  kind: "media";
  language: "all";
  title: { es: string; en: string };
  description: { es: string; en: string };
  revision: string;
  variants: Record<MediaQuality, OfflineMediaVariant>;
};

const root = process.cwd();
const REVISION_STRATEGY = "content-v2";

function digestParts(parts: Iterable<string | Buffer>) {
  const hash = createHash("sha256");
  for (const part of parts) {
    hash.update(part);
    hash.update("\0");
  }
  return hash.digest("hex").slice(0, 16);
}

function filesUnder(relativePath: string): string[] {
  const target = path.join(root, relativePath);
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];

  const files: string[] = [];
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) {
      files.push(...filesUnder(path.relative(root, child)));
    } else if (entry.isFile()) {
      files.push(child);
    }
  }
  return files;
}

function hashPaths(relativePaths: string[]) {
  const files = relativePaths.flatMap(filesUnder).sort((a, b) => a.localeCompare(b));
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(path.relative(root, file).split(path.sep).join("/"));
    hash.update("\0");
    hash.update(fs.readFileSync(file));
    hash.update("\0");
  }
  return hash.digest("hex").slice(0, 16);
}

function hashFile(relativePath: string) {
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) throw new Error(`Offline revision source missing: ${relativePath}`);
  return digestParts([relativePath, fs.readFileSync(file)]);
}

const appSourceRevision = hashPaths(["src", "public"]);
const databaseRevision = hashFile("data/bibli.sqlite");
const lessonsContentRevision = hashPaths([
  "content/studies",
  "content/editorial-structure.yaml",
  "content/routes.json",
  "content/study-enrichments.json",
]);

function uniqueUrls(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function makeRevision(urls: string[], contentRevisions: string[]) {
  return digestParts([REVISION_STRATEGY, appSourceRevision, ...urls, ...contentRevisions]);
}

function buildPackage(
  input: Omit<OfflinePackage, "urlCount" | "revision">,
  contentRevisions: string[],
): OfflinePackage {
  const urls = uniqueUrls(input.urls);
  return {
    ...input,
    urls,
    urlCount: urls.length,
    revision: makeRevision(urls, contentRevisions),
  };
}

function mediaAssetUrl(key: string) {
  const configured =
    import.meta.env.PUBLIC_BIBLI_MEDIA_BASE_URL
      ?.trim()
      .replace(/\/+$/, "") ?? "";

  return configured
    ? `${configured}/${key}`
    : sitePath(`/media/${key}`);
}

function buildMediaVariant(
  quality: MediaQuality,
): OfflineMediaVariant {
  const assets = bibliImgDelivery.assets
    .filter((asset) => asset.tier === quality)
    .map((asset) => ({
      slug: asset.slug,
      version: asset.version,
      key: asset.key,
      url: mediaAssetUrl(asset.key),
      sha256: asset.sha256,
      bytes: asset.bytes,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const urls = assets.map((asset) => asset.url);

  const totalBytes = assets.reduce(
    (sum, asset) => sum + asset.bytes,
    0,
  );

  const revision = digestParts([
    "bibliimg-media-v1",
    bibliImgDelivery.revision,
    quality,
    ...assets.map(
      (asset) =>
        `${asset.url}\t${asset.sha256}\t${asset.bytes}`,
    ),
  ]);

  return {
    quality,
    label:
      quality === "optimized"
        ? {
            es: "Optimizado para uso sin conexión",
            en: "Optimized for offline use",
          }
        : {
            es: "Alta calidad",
            en: "High quality",
          },
    urls,
    urlCount: urls.length,
    totalBytes,
    revision,
    assets,
  };
}

function bibleContentRevision(versionId: string, language: "es" | "en") {
  const version = getAllBibleVersions().find((item) => item.id === versionId);
  const books = getAllBooksByLanguage(language)
    .filter((book) => book.status !== "Borrador" && book.usfm_code)
    .map((book) => ({
      id: book.id,
      usfm_code: book.usfm_code,
      name: book.name,
      slug: book.slug,
      abbreviation: book.abbreviation,
      testament: book.testament,
      order_number: book.order_number,
      category: book.category,
      genre: book.genre,
      summary: book.summary,
      status: book.status,
    }));
  const verses = getBibleSearchVerses(versionId, language);
  const hash = createHash("sha256");
  hash.update(JSON.stringify(version ?? { id: versionId }));
  hash.update("\0");
  hash.update(JSON.stringify(books));
  hash.update("\0");
  for (const verse of verses) {
    hash.update(`${verse.id}\t${verse.book_id}\t${verse.chapter_number}\t${verse.verse_number}\t${verse.verse_text ?? ""}\n`);
  }
  return hash.digest("hex").slice(0, 16);
}

export function GET() {
  const appUrls = [
    sitePath("/"),
    sitePath("/en/"),
    sitePath("/mi-bibli/"),
    sitePath("/en/my-bibli/"),
    sitePath("/buscar/"),
    sitePath("/en/search/"),
    sitePath("/explorar/"),
    sitePath("/rutas/"),
    sitePath("/lecciones/"),
    sitePath("/recursos/"),
    sitePath("/glosario/"),
    sitePath("/linea-de-tiempo/"),
    sitePath("/es/biblia/"),
    sitePath("/en/bible/"),
    sitePath("/acerca/"),
    sitePath("/legal/"),
    sitePath("/descargar/"),
    sitePath("/en/download/"),
    sitePath("/offline/"),
    sitePath("/buscar/datos.json"),
    sitePath("/en/search/data.json"),
  ];

  const routes = getAllRoutes().filter((route) => route.status !== "Borrador");
  const lessonUrls = routes.flatMap((route) => [
    sitePath(`/rutas/${route.slug}/`),
    ...getLessonsByRouteId(route.id)
      .filter((lesson) => lesson.status !== "Borrador")
      .map((lesson) => sitePath(`/lecciones/${lesson.slug}/`)),
  ]);

  const packages: Array<OfflinePackage | OfflineMediaPackage> = [
    buildPackage(
      {
        id: "app",
        kind: "app",
        language: "all",
        title: { es: "Aplicación Bibli", en: "Bibli app" },
        description: {
          es: "Portadas, búsqueda, exploración y páginas principales para abrir Bibli sin conexión.",
          en: "Home, search, navigation and core pages for opening Bibli offline.",
        },
        urls: appUrls,
      },
      [databaseRevision],
    ),
    buildPackage(
      {
        id: "lessons-es",
        kind: "lessons",
        language: "es",
        title: { es: "Lecciones y rutas", en: "Spanish lessons and routes" },
        description: {
          es: "Todas las lecciones oficiales y sus rutas de estudio disponibles actualmente.",
          en: "All currently available official Spanish study lessons and routes.",
        },
        urls: [sitePath("/lecciones/"), sitePath("/rutas/"), ...lessonUrls],
      },
      [databaseRevision, lessonsContentRevision],
    ),
  ];

  for (const version of getAllBibleVersions()) {
    const language: "es" | "en" = version.language === "en" ? "en" : "es";
    const books = getAllBooksByLanguage(language).filter(
      (book) => book.status !== "Borrador" && book.usfm_code,
    );
    const urls = [getBibleRootPath(language), getBibleVersionPath(language, version.id)];

    for (const book of books) {
      urls.push(getBibleBookPath(language, version.id, book.usfm_code));
      for (const chapter of getBibleChaptersByBookId(book.id)) {
        urls.push(getBibleChapterPath(language, version.id, book.usfm_code, chapter.chapter_number));
      }
    }

    packages.push(
      buildPackage(
        {
          id: `bible-${version.id}`,
          kind: "bible",
          language,
          title: {
            es: `Biblia · ${version.abbreviation}`,
            en: `Bible · ${version.abbreviation}`,
          },
          description: {
            es: `${version.name}: todos los libros y capítulos disponibles en Bibli.`,
            en: `${version.name}: all books and chapters available in Bibli.`,
          },
          versionId: version.id,
          versionLabel: `${version.name} (${version.abbreviation})`,
          urls,
        },
        [bibleContentRevision(version.id, language)],
      ),
    );
  }

  const optimizedMedia =
    buildMediaVariant("optimized");

  const highMedia =
    buildMediaVariant("high");

  packages.push({
    id: "bibliimg",
    kind: "media",
    language: "all",
    title: {
      es: "Imágenes del Glosario",
      en: "Glossary images",
    },
    description: {
      es: "Ilustraciones editoriales de BibliImg disponibles para lectura sin conexión.",
      en: "BibliImg editorial illustrations available for offline reading.",
    },
    revision: digestParts([
      "bibliimg-media-package-v1",
      optimizedMedia.revision,
      highMedia.revision,
    ]),
    variants: {
      optimized: optimizedMedia,
      high: highMedia,
    },
  });

  return new Response(JSON.stringify({
    schemaVersion: "1.2.0",
    revisionStrategy: REVISION_STRATEGY,
    packages,
  }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache, must-revalidate",
    },
  });
}
