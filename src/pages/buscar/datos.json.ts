import { buildSearchIndexPayload } from "../../lib/search-index";

export function GET() {
  return new Response(JSON.stringify(buildSearchIndexPayload("es")), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache, must-revalidate",
    },
  });
}