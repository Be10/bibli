import {
  test,
  expect,
} from "@playwright/test";

const base = "/bibli";

test(
  "Canonical glossary route exposes its category hierarchy",
  async ({ page }) => {
    await page.goto(
      `${base}/glosario/personajes/adan/`
    );

    await expect(page).toHaveURL(
      /\/bibli\/glosario\/personajes\/adan\/$/
    );

    await expect(
      page.getByRole(
        "heading",
        {
          level: 1,
          name: "Adán",
        }
      )
    ).toBeVisible();

    await expect(
      page.getByRole(
        "link",
        {
          name: "Personajes",
        }
      )
    ).toHaveAttribute(
      "href",
      `${base}/glosario/personajes/`
    );
  }
);

test(
  "Category index points to canonical entity routes",
  async ({ page }) => {
    await page.goto(
      `${base}/glosario/personajes/`
    );

    await expect(
      page.getByRole(
        "heading",
        {
          level: 1,
          name: "Personajes",
        }
      )
    ).toBeVisible();

    const adanCard =
      page
        .locator(
          "a[data-catalog-item]"
        )
        .filter({
          has: page.getByRole(
            "heading",
            {
              level: 2,
              name: "Adán",
              exact: true,
            }
          ),
        });

    await expect(adanCard).toHaveCount(1);

    await expect(
      adanCard
    ).toHaveAttribute(
      "href",
      `${base}/glosario/personajes/adan/`
    );
  }
);

test(
  "Legacy glossary URL redirects to canonical categorized route",
  async ({ page }) => {
    await page.goto(
      `${base}/glosario/adan/`
    );

    await expect(page).toHaveURL(
      /\/bibli\/glosario\/personajes\/adan\/$/
    );
  }
);

test(
  "Migrated person URL redirects to canonical glossary entity",
  async ({ page }) => {
    await page.goto(
      `${base}/personajes/adan/`
    );

    await expect(page).toHaveURL(
      /\/bibli\/glosario\/personajes\/adan\/$/
    );
  }
);

test("Newly published person URL redirects to canonical glossary entity", async ({ page }) => {
  const base = "/bibli";

  await page.goto(
    `${base}/personajes/eva/`
  );

  await expect(page).toHaveURL(
    new RegExp(
      `${base}/glosario/personajes/eva/?$`
    )
  );

  await expect(
    page.getByRole(
      "heading",
      {
        level: 1,
        name: "Eva",
        exact: true,
      }
    )
  ).toBeVisible();
});
