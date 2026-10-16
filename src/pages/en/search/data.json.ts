import { buildSearchIndex } from "../../../lib/search-index";

export function GET() {
  return new Response(JSON.stringify(buildSearchIndex("en")), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
