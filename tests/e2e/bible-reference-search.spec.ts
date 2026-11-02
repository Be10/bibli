import { expect, test, type Page } from "@playwright/test";

const base = "/bibli";

async function expectPathAndHash(page: Page, expected: string) {
  await expect
    .poll(() => {
      const url = new URL(page.url());
      return `${url.pathname}${url.hash}`;
    })
    .toBe(expected);
}

test("Spanish search resolves direct Bible references", async ({ page }) => {
  const scenarios = [
    {
      query: "Juan 3:16",
      expected: `${base}/es/biblia/rvr1960/jhn/3/#v16`,
    },
    {
      query: "Jn 3:16",
      expected: `${base}/es/biblia/rvr1960/jhn/3/#v16`,
    },
    {
      query: "Juan 3",
      expected: `${base}/es/biblia/rvr1960/jhn/3/`,
    },
    {
      query: "Génesis 1:1-3",
      expected: `${base}/es/biblia/rvr1960/gen/1/#v1`,
    },
    {
      query: "1 Corintios 13:4",
      expected: `${base}/es/biblia/rvr1960/1co/13/#v4`,
    },
  ];

  for (const scenario of scenarios) {
    await page.goto(`${base}/buscar/`);

    const input = page.locator("#search-input");
    await input.fill(scenario.query);
    await input.press("Enter");

    await expectPathAndHash(page, scenario.expected);
  }
});

test("English search resolves direct KJV references", async ({ page }) => {
  const scenarios = [
    {
      query: "John 3:16",
      expected: `${base}/en/bible/kjv/jhn/3/#v16`,
    },
    {
      query: "Jn 3:16",
      expected: `${base}/en/bible/kjv/jhn/3/#v16`,
    },
    {
      query: "1 Corinthians 13:4",
      expected: `${base}/en/bible/kjv/1co/13/#v4`,
    },
  ];

  for (const scenario of scenarios) {
    await page.goto(`${base}/en/search/`);

    const input = page.locator("#search-input");
    await input.fill(scenario.query);
    await input.press("Enter");

    await expectPathAndHash(page, scenario.expected);
  }
});

test("Global search navigates direct references and invalid references fall back", async ({
  page,
}) => {
  await page.goto(`${base}/`);

  await page
    .locator('[data-context-search], [data-dock-action="search"]')
    .first()
    .click();

  const globalInput = page.locator("[data-global-search-input]");

  await globalInput.fill("Jn 3:16");
  await globalInput.press("Enter");

  await expectPathAndHash(
    page,
    `${base}/es/biblia/rvr1960/jhn/3/#v16`
  );

  await page.goto(`${base}/buscar/`);

  const advancedInput = page.locator("#search-input");
  await advancedInput.fill("Juan 999:999");
  await advancedInput.press("Enter");

  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(`${base}/buscar/`);

  await expect(advancedInput).toHaveValue("Juan 999:999");
});


test("Global search preview stays concise and diverse", async ({ page }) => {
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
  await input.fill("jesus");
  await searchResponse;

  const results = page.locator("a.global-search-result");

  await expect
    .poll(async () => results.count(), { timeout: 15_000 })
    .toBeGreaterThan(0);

  const resultCount = await results.count();
  expect(resultCount).toBeLessThanOrEqual(12);

  const typeLabels = await results.locator("span").allTextContents();
  expect(new Set(typeLabels).size).toBeGreaterThan(1);

  const allResults = page.locator("[data-global-search-all]");
  await expect(allResults).toBeVisible();
  await expect(allResults).toHaveAttribute("href", /[?&]q=jesus(?:&|$)/);
});
