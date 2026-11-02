import { expect, test, type Page } from "@playwright/test";

const base = "/bibli";

async function runSpanishSearch(page: Page, query: string) {
  await page.goto(`${base}/buscar/`);

  const searchResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/buscar/datos.json") && response.ok()
  );

  const input = page.locator("#search-input");
  await input.fill(query);
  await searchResponse;

  const results = page.locator("a.search-result");
  await expect(results.first()).toBeVisible({ timeout: 15_000 });

  return results;
}

test("Exact multi-word entity titles outrank Bible phrase matches", async ({
  page,
}) => {
  const scenarios = [
    { query: "Espíritu Santo", title: "Espíritu Santo", type: "Tema" },
    { query: "Reino de Dios", title: "Reino de Dios", type: "Tema" },
  ];

  for (const scenario of scenarios) {
    const results = await runSpanishSearch(page, scenario.query);
    const first = results.first();

    await expect(first.locator("h3")).toHaveText(scenario.title);
    await expect(first.locator(".search-result-type")).toHaveText(
      scenario.type
    );
  }
});

test("Exact Bible phrases keep verse priority when no exact entity title exists", async ({
  page,
}) => {
  const results = await runSpanishSearch(page, "en el principio");
  const first = results.first();

  await expect(first.locator("h3")).toHaveText("Génesis 1:1");
  await expect(first.locator(".search-result-type")).toHaveText(
    "Versículo"
  );
});
