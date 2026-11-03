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

test("Natural punctuation does not change search intent", async ({ page }) => {
  const scenarios = [
    { query: "“Espíritu Santo”", title: "Espíritu Santo", type: "Tema" },
    { query: "Reino de Dios?", title: "Reino de Dios", type: "Tema" },
    { query: "en el principio,", title: "Génesis 1:1", type: "Versículo" },
    { query: "Juan 3:16.", title: "Juan 3:16", type: "Versículo" },
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

test("Search filters persist in the URL and hand off to advanced search", async ({
  page,
}) => {
  await page.goto(`${base}/`);

  const searchResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/buscar/datos.json") && response.ok()
  );

  await page
    .locator('[data-context-search], [data-dock-action="search"]')
    .first()
    .click();

  const input = page.locator("[data-global-search-input]");
  await input.fill("reino");
  await searchResponse;

  const topicFilter = page.locator('[data-global-search-filter="Tema"]');
  await expect(topicFilter).toBeVisible({ timeout: 15_000 });
  await topicFilter.click();

  const allResults = page.locator("[data-global-search-all]");
  await expect(allResults).toHaveAttribute("href", /[?&]q=reino(?:&|$)/);
  await expect(allResults).toHaveAttribute("href", /[?&]type=Tema(?:&|$)/);

  await allResults.click();
  await expect(page).toHaveURL(/\/bibli\/buscar\/\?q=reino&type=Tema$/);

  const advancedTopicFilter = page.locator('[data-search-filter="Tema"]');
  await expect(advancedTopicFilter).toHaveAttribute("aria-pressed", "true", {
    timeout: 15_000,
  });

  const resultTypes = page.locator("a.search-result .search-result-type");
  await expect(resultTypes.first()).toHaveText("Tema", { timeout: 15_000 });

  await page.locator('[data-search-filter="Todos"]').click();
  await expect(page).toHaveURL(/\/bibli\/buscar\/\?q=reino$/);
});

test("English advanced search restores a shared type filter from the URL", async ({
  page,
}) => {
  const searchResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/en/search/data.json") && response.ok()
  );

  await page.goto(
    `${base}/en/search/?q=${encodeURIComponent("John 3:16")}&type=${encodeURIComponent("Versículo")}`
  );
  await searchResponse;

  const verseFilter = page.locator('[data-search-filter="Versículo"]');
  await expect(verseFilter).toHaveAttribute("aria-pressed", "true", {
    timeout: 15_000,
  });

  const resultTypes = page.locator("a.search-result .search-result-type");
  await expect(resultTypes.first()).toHaveText("Verse", { timeout: 15_000 });

  await page.locator('[data-search-filter="Todos"]').click();

  await expect
    .poll(() => new URL(page.url()).searchParams.get("q"))
    .toBe("John 3:16");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("type"))
    .toBeNull();
});
