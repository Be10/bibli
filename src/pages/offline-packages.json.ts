import { createHash } from "node:crypto";
import { sitePath } from "../lib/site-paths";
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

function uniqueUrls(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function makeRevision(urls: string[]) {
  return createHash("sha1").update(urls.join("\n")).digest("hex").slice(0, 12);
}

function buildPackage(input: Omit<OfflinePackage, "urlCount" | "revision">): OfflinePackage {
  const urls = uniqueUrls(input.urls);
  return { ...input, urls, urlCount: urls.length, revision: makeRevision(urls) };
}

export function GET() {
  const appUrls = [
    sitePath("/"),
    sitePath("/en/"),
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

  const packages: OfflinePackage[] = [
    buildPackage({
      id: "app",
      kind: "app",
      language: "all",
      title: { es: "Aplicación Bibli", en: "Bibli app" },
      description: {
        es: "Portadas, búsqueda, exploración y páginas principales para abrir Bibli sin conexión.",
        en: "Home, search, navigation and core pages for opening Bibli offline.",
      },
      urls: appUrls,
    }),
    buildPackage({
      id: "lessons-es",
      kind: "lessons",
      language: "es",
      title: { es: "Lecciones y rutas", en: "Spanish lessons and routes" },
      description: {
        es: "Todas las lecciones oficiales y sus rutas de estudio disponibles actualmente.",
        en: "All currently available official Spanish study lessons and routes.",
      },
      urls: [sitePath("/lecciones/"), sitePath("/rutas/"), ...lessonUrls],
    }),
  ];

  for (const version of getAllBibleVersions()) {
    const language = version.language === "en" ? "en" : "es";
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
      buildPackage({
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
      }),
    );
  }

  return new Response(JSON.stringify({ schemaVersion: "1.0.0", packages }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache, must-revalidate",
    },
  });
}
