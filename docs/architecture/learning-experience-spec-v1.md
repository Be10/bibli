# Bibli — Learning Experience & Personalization Specification v1

**Status:** Approved product direction / implementation backlog
**Date:** 2026-11-03
**Scope:** Web app learning experience, lesson presentation, TTS, personalization, concepts, assessment, review and bilingual support.

## 1. Core principles

1. Bibli must preserve a serious, Bible-centered study experience while supporting a more visual and interactive learning mode.
2. The Bible and the lesson's scriptural evidence remain the foundation for explanations, corrections and learning feedback.
3. User motivation should be intrinsic. Do not design around points, coins, chests, XP, streak pressure, leaderboards or artificial reward loops.
4. Assessments reinforce learning; they do not gate the next lesson.
5. Every feature in this specification must be designed at minimum for **Spanish and English** (`es` / `en`). IDs and domain entities should be language-neutral; localized labels, text, pronunciation and rules belong to locale-specific data.
6. Existing Markdown lessons remain the editorial source content. The app should derive/store a structured educational representation instead of maintaining a second manually duplicated lesson.

---

## 2. Neural TTS

### 2.1 Goal

Replace or complement robotic browser/system TTS with a more natural neural narration experience.

### 2.2 Architecture

Use a provider-agnostic TTS layer so Bibli can switch between local/open-source engines and external neural providers without rewriting the lesson experience.

Candidate strategies include:
- local/open-source neural TTS for zero per-character cost;
- hosted neural TTS when its quality is materially better;
- future providers through the same abstraction.

Do not hard-code the app to one provider.

### 2.3 Generation and playback

- Do not generate one huge audio file on every page open.
- Split content into **semantic chunks**: title, paragraph, Bible reading, explanation, quotation, reflection, application, prayer, etc.
- Allow silent prefetch/preparation after the lesson opens, without blocking the page.
- Cache generated audio using a stable key such as `hash(text + locale + voice + model + tts_rules_version)`.
- Reuse cached audio when source text and synthesis parameters have not changed.
- Present playback to the user as a continuous experience even if internally composed of multiple chunks.
- In dynamic lessons, synchronize the current audio chunk with the active block; highlight/advance carefully and avoid desynchronization.
- Support controls such as play/pause, speed and voice when appropriate.

### 2.4 Bilingual requirement

Implement at minimum:
- Spanish voices/locales and pronunciation rules;
- English voices/locales and pronunciation rules;
- locale-aware normalization of Bible references, numbers, abbreviations and textual conventions.

---

## 3. Biblical TTS lexicon and reading rules

Create a provider-independent **TTS lexicon / reading rules layer**. It is broader than a pronunciation dictionary.

It should cover:

### 3.1 Pronunciation

Biblical people, places, theological terms and other difficult words. Pronunciation data must be locale-aware (`es`, `en`).

### 3.2 Normalization

Examples:
- Bible book abbreviations;
- chapter/verse notation;
- verse ranges;
- ordinal book names;
- numbers and dates when relevant.

The visual text may remain compact while the speech form becomes natural, e.g. a reference can be expanded into a spoken form appropriate to the language.

### 3.3 Semantic reading/prosody

The synthesizer should know what type of block it is reading so it can apply suitable pauses, pacing and emphasis. Relevant block roles include:
- title;
- Bible reading;
- explanation;
- quotation;
- question;
- application;
- summary/key idea;
- prayer.

### 3.4 Reuse Bibli glossary

Where possible, use Bibli's glossary as the source for TTS terms rather than maintaining duplicate knowledge. A glossary entry may expose optional TTS fields by locale. The app may compile these into a provider-specific lexicon or SSML representation.

---

## 4. Visual personalization and color system

### 4.1 User accent color

Allow limited personalization through a curated set of accent colors. Avoid unrestricted arbitrary RGB/HEX selection if it can damage readability, accessibility or visual consistency.

The accent color may be used for active controls, links, selections, focus/active states and similar UI affordances.

### 4.2 Route/module identity color

Routes/modules may have fixed, restrained identity colors to help users distinguish them.

Keep these conceptually separate from the user accent color:
- **App/theme:** neutral and stable.
- **User accent:** personal UI preference.
- **Route/module color:** contextual/semantic identity.

Route colors should generally appear in limited elements such as icons, small bars, headers, progress accents, badges or related illustration details; they should not recolor the entire page.

All combinations must preserve contrast and work in light and dark themes.

---

## 5. Two lesson presentation modes

The same lesson content should support two presentation modes.

### 5.1 Classic reading mode

A continuous, sober reading experience close to the current Markdown presentation. Appropriate for users who prefer traditional study and longer-form reading.

### 5.2 Dynamic learning mode

An optional experience in which a lesson is transformed into a sequence of short screens/blocks. Each block should normally contain one principal idea, concise text and, when useful, a visual or interactive support.

Navigation may use next/previous actions and touch swiping where appropriate.

Images and visuals are not merely decorative; they can support understanding and reduce reading fatigue. Prefer meaningful visuals, but a restrained accompanying visual may also provide pacing when it does not distract from the lesson.

The dynamic mode must not require maintaining a duplicate editorial lesson.

---

## 6. Dynamic block system

The dynamic renderer should support multiple block types rather than only `text + image`.

Potential block types include:
- explanatory text;
- Bible passage/quotation;
- image/illustration;
- glossary term/contextual help;
- map or map interaction;
- timeline;
- progressive reveal;
- ordering events;
- matching person ↔ event / concept ↔ definition / place ↔ event;
- passage comparison;
- before/after comparison;
- promise/fulfillment comparison;
- OT/NT relationship;
- synoptic comparison;
- key-idea card;
- application;
- reflection;
- micro-check;
- end-of-lesson evaluation.

Use interactive blocks only when the lesson warrants them. Do not force every block type into every lesson.

---

## 7. Visual comparisons

Visual comparisons are an approved feature and should be implemented when they materially improve comprehension.

Examples:
- Matthew vs Mark vs Luke vs John;
- before vs after;
- promise vs fulfillment;
- OT vs NT development;
- person A vs person B;
- parallel events or passages;
- chronological or theological progression.

Possible interactions include switching between witnesses, showing similarities/differences, aligned cards, reveal controls or other suitable presentations.

This feature is **conditional**, not mandatory in every lesson.

---

## 8. Learning concepts as a first-class internal entity

Create a stable internal concept model. Concepts are not primarily a UI list; they are the semantic backbone that connects lessons, assessments, review, navigation and progress.

### 8.1 Concept identity

A concept should have a language-neutral stable ID. Example conceptual structure:

```yaml
concept_id: kingdom-of-god
labels:
  es: Reino de Dios
  en: Kingdom of God
references: []
lesson_occurrences: []
related_concepts: []
```

### 8.2 Concept relationships

A concept may connect to:
- lessons;
- lesson blocks;
- Bible references;
- glossary entries;
- questions;
- explanations;
- visuals;
- related concepts;
- review state.

### 8.3 User-facing concept state

The user does not see the internal graph/schema. They may see simple outcomes such as:
- **Conceptos comprendidos**;
- **Revisar este punto**;
- concepts to reinforce;
- links back to the exact lesson block that explains a weak concept.

A percentage may be shown only as an **estimated comprehension/mastery indicator**, not as an absolute claim that the app can measure true learning perfectly. Prefer labels such as `Progreso de comprensión` or `Dominio estimado`.

---

## 9. Learning objectives

At the start of a lesson, show a small number of concise learning objectives when useful. They should orient the learner rather than feel like a bureaucratic checklist.

The objectives should be derived from the actual lesson and its concepts.

---

## 10. Micro-checks during lessons

Use short comprehension checks at selected points in the lesson.

### 10.1 Objective questions

Prefer selectable alternatives (one correct answer plus plausible distractors) when Bibli needs to validate correctness automatically.

Distractors should reflect plausible misunderstandings rather than obviously absurd choices. Where possible, a selected wrong answer can help identify what the learner misunderstood.

### 10.2 Feedback

After an answer:
- indicate correct/incorrect;
- explain why;
- point to the Bible passage and/or exact lesson block that supports the explanation;
- allow direct navigation to **Revisar este punto**.

The goal is learning, not punishment.

---

## 11. Reflection vs assessment

Keep a strict distinction between objective comprehension and personal/theological reflection.

### 11.1 `💭 Para meditar`

The existing Markdown section `## 💭 Para meditar` should be treated as the primary source for personal reflection prompts.

These prompts:
- are optional to answer;
- are not marked correct/incorrect;
- should not be used as scored assessment;
- may appear as special reflection cards in dynamic mode.

### 11.2 Interpretation-sensitive questions

When an issue contains legitimate interpretive nuance, do not force an arbitrary binary score. Use explanatory/reflection presentation instead.

---

## 12. End-of-lesson evaluation

After a dynamic lesson, offer a short evaluation presented one question per screen/block.

Requirements:
- immediate correctness feedback;
- explanation of errors;
- scriptural/lesson evidence;
- ability to jump back to the related block;
- final result summary;
- no blocking of the next lesson;
- the user may finish the day after completing the lesson without continuing.

The result should emphasize learning status more than a raw score. Possible presentation:
- concepts understood;
- concepts to reinforce;
- important references;
- optional score/percentage as secondary information.

---

## 13. Adaptive review of errors

When a learner struggles with a concept, Bibli may reintroduce that concept later through a different question or review activity.

Guardrails are required:
- do not keep adding unlimited questions to future lessons;
- use clear per-session/per-lesson limits;
- do not repeatedly punish the same error;
- separate normal lesson flow from accumulated review when necessary;
- attach questions to `concept_id`, not merely to a specific question string.

A concept can therefore be tested with different prompts while retaining one learning identity.

---

## 14. Spaced review

Implement a lightweight spaced-review system for concepts already studied.

### 14.1 Daily study surface

Make review available as part of the normal daily study experience, alongside actions such as:
- Continue lesson;
- Review today;
- Read the Bible;
- Verse of the day.

Example user-facing copy may be as simple as `Repaso de hoy · 4 conceptos · ~2 min`.

### 14.2 Scheduling

Internally, successful retrieval can increase the interval; failure can shorten it. Exact scheduling may evolve and should be configurable/versioned.

Do not expose algorithmic complexity unless useful.

### 14.3 Separation from lessons

The review queue should normally be a small, optional activity rather than an ever-growing bundle inserted into the next lesson.

---

## 15. Connections with previous learning

Bibli may intentionally reconnect a new lesson to concepts or lessons already studied, e.g. `¿Recuerdas lo que vimos sobre…?`.

Requirements:
- use only when contextually relevant;
- avoid noisy or weak links;
- link to the prior lesson/concept when helpful;
- use the concept graph and existing canonical relationships instead of superficial keyword matching alone.

---

## 16. Key ideas / memorable closures

After a meaningful section, Bibli may show a special `Idea clave` block. These cards can use restrained ornamental/visual treatment to improve memorability without becoming decorative clutter.

At the end of the lesson, key ideas may be gathered into `Lo esencial de esta lección`.

---

## 17. Contextual glossary inside lessons

The glossary/help system should be available directly in lesson content rather than requiring the learner to leave for a separate help area.

Requirements:
- relevant terms are subtly highlighted to indicate they are interactive;
- clicking/tapping opens a concise contextual explanation without navigating away;
- offer optional deeper detail;
- integrate with the existing Bibli glossary / study-help content rather than duplicating definitions;
- support Spanish and English localization;
- glossary terms may also feed the TTS pronunciation lexicon.

---

## 18. Free recall at lesson end

Optionally offer a non-graded prompt such as `¿Qué recuerdas de esta lección?` before showing the final summary.

This activity must not be mandatory.

Allow two complementary input styles:
- free text;
- selectable floating chips/cards containing relevant ideas that can be added to the learner's own list/notes.

The user can combine suggested ideas and personally written ideas. This is reflection/retrieval practice, not scored assessment.

---

## 19. Prediction before reveal

Prediction (`¿Qué crees que sucederá?`, `¿Por qué crees que…?`) is an optional teaching technique.

Use only when it improves engagement or understanding. It must not be forced into passages where prediction would be artificial, distracting or pedagogically weak.

Usually do not score these predictions.

---

## 20. Markdown lessons and structured educational model

### 20.1 Existing Markdown remains valuable

The current lesson Markdown already contains strong source material:
- primary reference;
- contextual orientation;
- thematic exposition;
- what the passage reveals about God/us;
- Finding Jesus;
- Invisible Thread;
- application;
- `Para meditar`;
- summary;
- prayer;
- stable lesson/routing/coverage metadata.

Do not rewrite hundreds of lessons merely to support the dynamic experience.

### 20.2 Markdown must not be the only runtime data model

Create an ingestion/compilation layer:

```text
Editorial Markdown
      ↓
Lesson processing / enrichment
      ↓
Structured educational model
      ↓
Concepts · blocks · questions · evidence · glossary · visuals · TTS
      ↓
Classic renderer / Dynamic renderer / Review
```

The app should not have to infer all learning semantics from raw prose every time the lesson opens.

### 20.3 Structured educational representation

A processed lesson may contain, conceptually:
- learning objectives;
- concepts;
- semantic lesson blocks;
- Bible evidence references;
- micro-checks;
- end evaluation;
- explanations/distractor rationale;
- reflection prompts;
- glossary links;
- visuals/resources;
- comparison blocks;
- TTS semantic roles;
- key ideas;
- review relationships.

### 20.4 Future Markdown enrichment

Future lessons may optionally include lightweight structured metadata such as concept IDs or learning objectives where doing so improves reliability, but avoid turning human-readable Markdown into a large technical payload.

Prefer a separate/generated structured artifact when the educational model becomes large.

---

## 21. Bilingual data model

All systems in this specification must account for Spanish and English from the start.

Language-neutral identities should be shared across locales:
- `lesson_id`;
- `concept_id`;
- block IDs where appropriate;
- glossary entity IDs;
- Bible reference identity;
- relationship IDs.

Localized data includes:
- labels and explanatory text;
- question wording and distractors;
- reflection prompts;
- TTS voices;
- pronunciation;
- speech normalization;
- UI copy.

Do not model Spanish and English as unrelated duplicate concepts.

---

## 22. Implementation priorities / dependencies

Suggested dependency order (not a rigid release schedule):

1. Structured lesson/block model and bilingual IDs.
2. Concept entity/model and lesson-to-concept relationships.
3. Classic/dynamic renderer separation over the same source lesson.
4. Contextual glossary integration.
5. Objective micro-checks + evidence-backed feedback + `Revisar este punto`.
6. End-of-lesson concept summary.
7. Interactive block framework, including conditional visual comparisons.
8. Spaced/adaptive review engine with strict limits.
9. Neural TTS provider abstraction + bilingual TTS lexicon + cache.
10. TTS/dynamic-block synchronization.
11. Controlled accent personalization and module identity color system.

These items may be developed incrementally; architectural foundations should avoid provider/UI lock-in.

---

## 23. Non-goals / guardrails

- Do not replace deep Bible study with superficial swiping.
- Do not make the dynamic mode mandatory.
- Do not equate a quiz score with spiritual maturity or complete learning.
- Do not score subjective reflection as if it had a single objective answer.
- Do not let visuals override or distort the biblical text.
- Do not introduce uncontrolled color customization that damages accessibility.
- Do not make TTS generation block lesson opening.
- Do not force interactive/visual blocks where the lesson does not warrant them.
- Do not add extrinsic reward mechanics merely to increase engagement metrics.

---

## 24. Product intent

Bibli should support different ways of learning while remaining recognizably a serious Bible-study application. The dynamic experience should make deep study easier to absorb, revisit and remember — not simplify it into entertainment.

The target experience is a coherent system in which:

**Markdown → concepts → educational blocks → Scripture-grounded assessment → review → contextual glossary → visuals → natural bilingual TTS → learning progress**

all operate over the same canonical lesson content.


---

## 25. UI/UX patterns observed in Duomo reference video

The Duomo reference is inspiration only. Bibli must not copy its branding, artwork, layout, or visual identity. The following patterns are useful because they align with Bibli's existing learning architecture.

### 25.1 Illustrated lesson cover / entry card

A lesson may open with a strong visual cover containing:
- lesson title;
- concise contextual label;
- illustration or image;
- lightweight content-type chips;
- primary actions such as Start/Continue and Listen.

For Bibli, this should remain restrained and study-oriented. The visual should support the passage rather than become a decorative poster.

### 25.2 Semantic content cards inside lessons

The dynamic renderer may present content as distinct semantic cards rather than one long continuous surface. Candidate card types include:
- exposition;
- Scripture quotation;
- key idea;
- image/illustration;
- map;
- glossary/context;
- reflection;
- comparison;
- micro-check;
- prayer.

Card rhythm should reduce reading fatigue while preserving continuity and depth.

### 25.3 Route/module visual map

Routes and modules may have a visual path/map showing lesson sequence and position. This can use connected nodes or tiles, module colors, icons and status.

For Bibli:
- use it as navigation and orientation, not as game progression;
- prefer states such as Current, Completed, Available, Recommended and Upcoming;
- use Locked only for genuine prerequisites defined by the learning architecture;
- never block normal exploration merely to simulate progression;
- keep module identity colors separate from the user's global accent color.

### 25.4 Rich Scripture / quote cards

Important verses and Scripture excerpts may receive visually distinctive treatment using typography, spacing, subtle backgrounds, imagery or ornamentation.

These cards should make the biblical text easier to notice and remember without implying that highlighted verses are more inspired than surrounding Scripture.

### 25.5 Visual rhythm through media

Images, illustrations, maps, timelines and other media can appear between text blocks to create cognitive breathing space and reinforce meaning.

Prefer meaningful visuals. Avoid inserting images only to fill every screen.

### 25.6 Persistent but quiet navigation

Dynamic lessons may use a small persistent navigation area with:
- Previous/Back;
- Next;
- lesson/block progress;
- optional audio state.

Controls should remain predictable and accessible without dominating the reading surface.

### 25.7 Contextual actions

Where useful, individual blocks may expose lightweight actions such as:
- Listen;
- Bookmark/save;
- Share;
- Open glossary/details;
- Open related Scripture;
- Expand image/map.

Do not expose every action on every card by default; use progressive disclosure.

### 25.8 Motion and transitions

Use subtle transitions when changing lesson blocks, route nodes or contextual panels. Motion should communicate continuity, focus and hierarchy rather than create spectacle.

Respect reduced-motion accessibility preferences.

### 25.9 Lesson/library cards

Lists of lessons may use larger illustrated cards with:
- title;
- route/module identity;
- progress/status;
- short descriptor;
- optional visual.

This can make browsing easier than a flat text list, while still offering a compact/list alternative for users who prefer denser navigation.

### 25.10 Design direction for Bibli

The reference suggests a useful combination:
- soft, modern surfaces;
- generous spacing;
- clear card hierarchy;
- restrained color coding;
- visual storytelling;
- immediate audio access;
- route-oriented navigation.

Bibli should adapt these patterns into its own more sober, Scripture-centered design language. Dynamic/younger-oriented presentation can be richer, while classic mode should remain calm, dense enough for serious study and highly readable.

## 26. Decision status — UI/UX reference adoption

Status: **Approved for implementation** (2026-11-03).

The UI/UX patterns captured in Section 25 are not merely inspirational references. They are part of Bibli's intended product direction and should be considered for implementation, adapted to Bibli's own visual identity, bilingual requirements, accessibility rules, learning architecture, Scripture-centered purpose, and non-gamified design principles.

Implementation should preserve the already agreed principles: optional classic and dynamic modes, route/module visual identity without color conflicts, rich but restrained lesson cards and blocks, meaningful visual media, contextual interactions, subtle motion, and learning-first behavior.
