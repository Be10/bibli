# Bibli — TTS / Dynamic Block Synchronization v1

**Status:** implemented foundation
**Date:** 2026-11-04

## Purpose

Synchronize read-aloud playback with the active block of the Dynamic lesson renderer without changing the canonical lesson content or coupling the UI to a specific TTS provider.

## Runtime contract

- Dynamic presentation is detected from the lesson presentation state.
- The only TTS source in Dynamic mode is the currently visible `[data-dynamic-block]`.
- A block change rebuilds the TTS queue from that block only.
- Manual block navigation while playback is active cancels stale audio and immediately starts the newly active block.
- Manual block navigation while paused moves the queue but preserves the paused state until the user resumes.
- When the final TTS fragment of a block ends, TTS requests the next Dynamic block.
- At the final lesson block, playback ends normally; it never loops.
- TTS previous/next controls cross a block boundary when the current block has no earlier/later fragment.
- Changing Study presentation (Classic/Dynamic) stops the old source and rebuilds the queue for the new presentation without automatically resuming stale audio.

## Events

### `bibli:dynamic-block-change`

Emitted by the Dynamic renderer with lesson ID, block ID/key, position, total and source (`ui`, `tts`, `review`, `deeplink`, `initial`, etc.). TTS uses this event to bind its queue to the active block.

### `bibli:tts-dynamic-navigate`

Emitted by TTS with `direction: next | previous`. The Dynamic renderer owns navigation and emits the resulting `bibli:dynamic-block-change`; TTS does not mutate the renderer directly.

## Accessibility and visual state

- The active spoken source keeps the existing `tts-active-source` affordance.
- Its enclosing Dynamic block receives `tts-active-block` while audio for that block is active.
- The visual state is supplemental; block position and player status remain available through text/ARIA surfaces.
- Reduced-motion behavior remains respected by existing scroll/highlight behavior.

## Semantic roles

Dynamic content uses the existing provider-neutral semantic roles. Microcheck prompts/options use the `question` role; block headings use `heading`; Scripture references use `bible-reading`; application/reflection/summary/prayer preserve their specialized roles.

## Provider independence

This synchronization operates above the provider layer. Browser Web Speech and any future cached neural provider receive the same block-scoped queue and semantic-role metadata.
