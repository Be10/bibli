import routing from "../../content/glossary-route-map.json";

export type GlossaryCategory =
  keyof typeof routing.categories;

export type GlossaryCategoryMeta = {
  label: string;
  itemLabel: string;
};

export function getGlossaryCategory(
  slug: string
): GlossaryCategory | null {
  return (
    routing.routes as Record<
      string,
      GlossaryCategory
    >
  )[slug] ?? null;
}

export function requireGlossaryCategory(
  slug: string
): GlossaryCategory {
  const category =
    getGlossaryCategory(slug);

  if (!category) {
    throw new Error(
      `Glossary routing missing for slug: ${slug}`
    );
  }

  return category;
}

export function getGlossaryCategoryMeta(
  category: GlossaryCategory
): GlossaryCategoryMeta {
  return routing.categories[
    category
  ] as GlossaryCategoryMeta;
}

export function getGlossaryCategoryMetaBySlug(
  slug: string
): GlossaryCategoryMeta {
  return getGlossaryCategoryMeta(
    requireGlossaryCategory(slug)
  );
}

export function glossaryCategoryPath(
  category: GlossaryCategory
): string {
  return `/glosario/${category}/`;
}

export function glossaryCanonicalPath(
  slug: string
): string {
  return `/glosario/${requireGlossaryCategory(
    slug
  )}/${slug}/`;
}

export function getGlossaryCanonicalPath(
  slug: string
): string | null {
  const category =
    getGlossaryCategory(slug);

  return category
    ? `/glosario/${category}/${slug}/`
    : null;
}
