export const prerender = true;

export function GET() {
  const rawBase = import.meta.env.BASE_URL ?? "/";
  const base = rawBase === "/" ? "" : rawBase.replace(/\/$/, "");
  const url = (pathname: string) => `${base}${pathname}`;

  const manifest = {
    id: url("/"),
    name: "Biblioteca Bíblica",
    short_name: "Bibli",
    description: "Recursos para escudriñar y comprender las Escrituras.",
    lang: "es",
    dir: "ltr",
    start_url: url("/"),
    scope: url("/"),
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#f7f7f8",
    theme_color: "#765982",
    categories: ["education", "books", "reference"],
    icons: [
      {
        src: url("/icons/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: url("/icons/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: url("/icons/icon-maskable-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Leer la Biblia",
        short_name: "Biblia",
        url: url("/es/biblia/"),
        icons: [{ src: url("/icons/icon-192.png"), sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Ruta principal",
        short_name: "Ruta",
        url: url("/rutas/de-la-creacion-al-pacto/"),
        icons: [{ src: url("/icons/icon-192.png"), sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Buscar en Bibli",
        short_name: "Buscar",
        url: url("/buscar/"),
        icons: [{ src: url("/icons/icon-192.png"), sizes: "192x192", type: "image/png" }],
      },
    ],
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, must-revalidate",
    },
  });
}
