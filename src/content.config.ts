import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const studies = defineCollection({
  loader: glob({
    base: "./content/studies",
    pattern: "**/*.md",
  }),
  schema: z.object({
    artifact_type: z.literal("bible_study_lesson"),
    content_type: z.literal("lesson"),
    mode: z.literal("official"),
    route_id: z.string().min(1),
    route_name: z.string().min(1),
    route_lesson_number: z.number().int().positive(),
    book_id: z.string().min(1),
    book_name: z.string().min(1),
    primary_reference: z.string().min(1),
    coverage: z.array(z.string().min(1)).min(1),
    translation: z.string().min(1),
    lesson_id: z.string().min(1),
    content_version: z.string().min(1),
  }),
});

export const collections = { studies };
