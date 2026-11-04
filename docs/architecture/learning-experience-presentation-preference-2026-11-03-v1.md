# Bibli — Lesson presentation preference addendum — 2026-11-03 v1

## Status
Approved product direction for implementation.

## Purpose
Clarify the relationship between Classic and Dynamic lesson presentation after the first R1C pilot.

## Peer presentation rule
Classic and Dynamic are peer presentations of the same canonical study lesson. Dynamic must not appear visually or structurally as a tool, card, or subview hosted inside Classic.

Within a lesson, the hierarchy is:

```text
Lesson
├─ Study
│  ├─ Classic
│  └─ Dynamic
└─ Reading
```

`Study / Reading` and `Classic / Dynamic` are separate axes. The Classic/Dynamic selector belongs at the lesson-level study controls, outside either renderer.

## Default lesson view
Bibli must expose a global study preference on Home:

- **Default lesson view / Vista predeterminada de lecciones**
- Classic / Clásica
- Dynamic / Dinámica

The preference is persistent and determines how eligible study lessons open by default. It must be available in Spanish and English.

A user may still switch Classic/Dynamic from the lesson-level controls. Changing the lesson view updates the same persisted preference so future eligible lessons remain consistent with the user's latest explicit choice.

## Dynamic separation
When Dynamic is active:

- render only the Dynamic lesson presentation in the study stage;
- hide Classic-specific navigation columns such as the long-form table of contents and study-aids side column when they do not belong to the Dynamic composition;
- keep shared global lesson controls available where appropriate;
- preserve Reading as a separate Bible-reading mode;
- continue using the same StructuredLesson and canonical Markdown source.

## Fallback
If a lesson does not yet have an eligible structured Dynamic representation, Bibli must fall back safely to Classic without breaking lesson access.

## UX principle
The Home preference should be visible and understandable without dominating the Home page. It belongs near continuation/study entry surfaces, before general discovery/navigation areas.
