# Bibli — Learning Experience Implementation Handoff — 2026-11-03 v1

## Purpose

This file is the cross-chat handoff and audit index for the learning-experience work discussed on 2026-11-03. It does not replace the approved specifications. It tells future Bibli implementation chats which files are authoritative, how they relate, what must remain stable, and which cross-cutting rules apply to every feature.

## Authoritative files

Read these in this order before implementing or changing the learning experience:

1. `docs/architecture/learning-experience-spec-v1.md`
   - Stable baseline already being implemented.
   - Covers bilingual learning architecture, neural TTS, TTS lexicon, visual personalization, classic/dynamic modes, blocks, comparisons, concepts, assessment, spaced review, glossary, Markdown compilation model, and approved UI/UX patterns inspired by the Duomo reference.

2. `docs/architecture/daily-learning-rhythm-v1.md`
   - Complementary approved specification.
   - Covers morning study, same-day reinforcement, night interiorization, shareable verse/idea cards, route start, adaptive calendar, multiple-route behavior, exploration states, primary/secondary routes, daily activity budget, and calendar recalculation.

3. `docs/architecture/learning-experience-additions-2026-11-03-v1.md`
   - Incremental addendum.
   - Covers time-available session adaptation, anchor concept, weekly summary, exact resume, contextual notes, learned-connections map, offline/prepared study, content-bearing notifications, simple rescheduling, and accessibility foundations.

## Specification stability rule

- Treat `learning-experience-spec-v1.md` as a stable implementation baseline while work is in progress.
- Treat `daily-learning-rhythm-v1.md` as a stable complementary specification while work is in progress.
- New approved ideas must be added through versioned incremental addenda unless an explicit consolidation/refactor is requested.
- Do not silently rewrite existing specifications that another implementation chat may already be using.

## Global bilingual invariant — mandatory

**Everything in this learning experience must be implemented at minimum in Spanish and English.**

This is a release-level requirement, not a later localization task. A feature is not considered complete if it works only in one language.

The rule applies to, at minimum:

- UI labels, navigation, empty/error/loading states and accessibility copy;
- classic and dynamic lesson experiences;
- learning objectives;
- concepts and user-facing concept labels;
- questions, distractors, feedback and explanations;
- `Para meditar` / reflection surfaces;
- summaries, key ideas and daily reinforcement content;
- review/spaced repetition;
- route/calendar/planning surfaces and notifications;
- glossary/contextual help;
- shareable verse/idea cards;
- TTS voices, pronunciation, reference normalization, prosody rules and lexicon;
- offline/prepared-study metadata and sync-related copy;
- notes and learned-connections surfaces;
- visual-resource metadata, captions, alt text and contextual labels;
- all new functionality added later to this learning-experience system.

Language-neutral IDs should be shared where appropriate (`lesson_id`, `concept_id`, block/reference/relationship IDs). Spanish and English are localized representations of the same underlying entity, not unrelated duplicates.

## Implementation working model approved by the user

The user should not need to manually rewrite hundreds of lesson Markdown files or prepare a second set of lessons for dynamic mode.

Implementation should primarily use:

1. the existing canonical lesson Markdown;
2. the approved architecture documents listed above;
3. Bibli's existing code/data structures;
4. a generated/validated structured educational model derived from those lessons.

Expected pipeline:

`Editorial Markdown -> enrichment/compilation -> structured educational model -> classic/dynamic renderers + assessment + review + glossary + visuals + TTS`

Future Markdown may gain lightweight metadata when useful, but large runtime learning payloads should live in generated/structured artifacts rather than making the Markdown difficult to maintain.

The implementation assistant is expected to handle architecture, code, data models, transformation/import logic, tests and integration. The user should mainly provide product decisions, visual/audio preference validation, and credentials or external-service choices only when actually required.

## Visual media policy confirmed in conversation

- Future illustrations for routes, courses/modules, lessons, verse cards and related learning surfaces may be generated with AI as Bibli's own visual assets.
- Until those illustrations exist, use controlled semantic colors, restrained gradients, patterns, iconography and typography as first-class placeholders/identities.
- Components must not depend structurally on having an image; a future image should be able to replace or complement the placeholder without redesigning the component.
- Visual identity must remain distinct from the user's global accent color and must preserve light/dark-mode accessibility.
- Route browsing should support both a richer visual map/path and a compact/list alternative over the same progress state.

## Coverage audit of the 2026-11-03 conversation

The following decisions were checked against the authoritative files and are represented there or in this handoff where noted:

- Natural neural TTS with provider abstraction, semantic chunks, prefetch/cache and synchronized playback: covered.
- Biblical TTS pronunciation/normalization/prosody lexicon, reusable from Bibli glossary: covered.
- Mandatory Spanish + English support for TTS and all learning systems: covered and reinforced globally in this handoff.
- Curated user accent colors separated from route/module semantic colors: covered.
- Classic reading mode plus optional dynamic learning mode over one canonical lesson source: covered.
- Dynamic blocks with meaningful visuals and interactive block types: covered.
- Conditional visual comparisons (synoptic, promise/fulfillment, before/after, OT/NT, people/events): covered.
- Stable internal learning concepts with user-facing understood/reinforce states and estimated comprehension: covered.
- Concise lesson objectives: covered.
- Objective micro-checks with plausible distractors, immediate feedback and Scripture/lesson evidence: covered.
- `## 💭 Para meditar` as optional non-graded reflection source: covered.
- End-of-lesson evaluation with `Conceptos comprendidos`, `Revisar este punto`, evidence and no progression gate: covered.
- Adaptive error review with strict limits and concept-based identity: covered.
- Spaced review as a small daily-study surface (`Repaso de hoy`) separate from normal lessons: covered.
- Relevant connections to prior learning: covered.
- Special memorable `Idea clave` / `Lo esencial` treatment: covered.
- Contextual clickable glossary/help inside lessons: covered.
- Optional free recall with text plus selectable idea chips: covered.
- Prediction-before-reveal as optional/contextual, not mandatory: covered.
- Markdown as editorial source plus compiled structured educational model: covered.
- Duomo-inspired patterns adapted to Bibli, including lesson covers, semantic cards, route maps, rich Scripture cards, visual rhythm, quiet navigation, contextual actions, motion, lesson cards and compact/list alternative: covered and approved for implementation.
- Morning main study + midday/afternoon recall + night interiorization: covered.
- One or more lessons per day, with one lesson/day only as a recommendation: covered.
- Shareable verse/idea card available after study, without taking Scripture out of context: covered.
- Starting a route creates an adaptive projected calendar: covered.
- Exploration does not schedule content; saved-for-later does not schedule content: covered.
- `active_primary`, `active_secondary`, paused and completed route behaviors: covered.
- Normally one primary route governs the day; secondary routes do not create automatic daily debt: covered.
- Ad-hoc lesson completion records real progress without auto-activating its route: covered.
- Calendar recalculates after extra lessons or missed days and never creates an overdue debt queue: covered.
- Daily learning budget: roughly one main study + one short review + one short interiorization, condensed even after multiple lessons: covered.
- “More study != more obligations”: covered.
- Time-available selector: covered in addendum.
- Anchor concept of the day: covered in addendum.
- Optional weekly recap without streak/XP framing: covered in addendum.
- Exact interrupted-session resume including block/TTS/answers/notes: covered in addendum.
- Context-linked notes: covered in addendum.
- Learned-connections map based only on encountered/grounded material: covered in addendum.
- Offline/prepared study with safe sync: covered in addendum.
- Content-bearing notifications rather than generic reminders: covered in addendum.
- Simple adaptive rescheduling and route pause: covered in addendum.
- Accessibility from the foundation: covered in addendum and baseline.
- Avoid points, coins, chests, XP, streak pressure, leaderboards and punitive overdue language: covered.
- AI-generated Bibli visual assets later, with semantic-color placeholders meanwhile: captured explicitly in this handoff.
- Implementation responsibility model (assistant handles architecture/code/tests; user mainly validates decisions): captured explicitly in this handoff.

## Cross-chat continuation rule

Any Bibli implementation chat continuing this work should first read this handoff and the three authoritative files above before proposing or implementing related functionality.

When a new idea is approved:

1. determine whether an existing addendum already covers it;
2. if not, create a new versioned addendum rather than silently rewriting the stable baseline;
3. ensure the design is bilingual (`es` + `en`) from the data model through UI and tests;
4. preserve Scripture-centered, non-gamified, accessibility-first behavior;
5. add/adjust tests for both languages where technically meaningful.

## Audit result

Status: **PASS with handoff additions**.

The substantive product decisions discussed in the 2026-11-03 learning-experience conversation are represented across the three approved specification files. Two implementation details that were not explicit enough in those files are now captured here: (a) future AI-generated Bibli visuals with semantic-color placeholders until assets exist, and (b) the agreed implementation working model so the user does not have to manually re-author existing lessons.

The bilingual rule is now stated as a global invariant for all present and future functionality in this learning-experience scope.
