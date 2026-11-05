# Bibli — Controlled Accent & Route Visual Identity v1

**Status:** implemented baseline
**Date:** 2026-11-04

## Purpose

Separate personal interface accent from semantic route/module identity so personalization never erases study context.

## Personal accent

- Storage remains `bibli-accent` for backwards compatibility.
- Policy is `curated-v1`.
- Supported choices remain Earth, Ocean, Forest, Plum and Clay.
- `--accent*` tokens belong to global controls, links, focus and user-selected interface emphasis.
- Arbitrary HEX/RGB entry is not exposed.

## Route identity

- Source: `content/learning/route-visuals.json`.
- Route identity uses independent `--route-*` tokens.
- The current Pentateuch route uses the `scroll` palette.
- Unknown routes use the controlled `neutral` fallback.
- Route color is limited to orientation surfaces such as route icons, route progress, restrained hero tint and route cards.

## Module identity

- Module identity uses independent `--module-*` tokens.
- Each route declares a curated module palette.
- A module receives a stable palette from its stable `module_id`; route/module order does not participate in the selection.
- Module color is limited to small contextual surfaces such as module number, module jump state and module context in a lesson.

## Theme behavior

Every palette provides explicit light and dark values. The route/module identity changes with the active theme but does not change when the personal accent changes.

## Accessibility guardrails

- The validator requires each semantic accent to reach at least 4.5:1 contrast against the corresponding light/dark app background.
- State is not communicated only by color; labels, numbers, text and progress semantics remain present.
- Personal focus styles continue to use the personal accent instead of route colors.

## Runtime contract

Surfaces expose:

- `data-route-visual`
- `data-route-palette`
- `data-module-visual`
- `data-module-palette`

The global layout maps light/dark raw palette values to `--route-accent`, `--route-soft`, `--route-subtle`, `--module-accent`, `--module-soft` and `--module-subtle`.
