# Bibli — TTS Provider Contract v1

**Status:** Implemented foundation (R1I)
**Scope:** provider abstraction, bilingual reading rules, semantic prosody metadata, audio cache contract and browser fallback.

## 1. Runtime layers

```text
GlobalTTS UI
  ↓
TTS provider contract
  ├─ Browser Web Speech fallback (active)
  └─ Cached neural adapter (provider-neutral contract)
       ↓
    Audio Cache Storage
```

The UI does not own provider-specific synthesis logic. `browser-web-speech` remains the active fallback until a neural adapter is configured.

## 2. Neural adapter contract

A neural adapter declares a stable provider `id`, a `modelId` and an asynchronous `synthesize(request)` implementation that returns an audio `Blob`.

The adapter must not place private provider credentials in browser code. For production, a hosted neural adapter should normally call a Bibli-controlled backend/worker endpoint that owns any required secret.

## 3. Stable cache identity

Generated neural audio is keyed from:

- normalized text;
- locale;
- voice ID;
- model ID;
- TTS rules version;
- semantic role.

The client cache uses Cache Storage under `bibli-tts-audio-v1`. Changing pronunciation/normalization rules therefore invalidates synthesis identity without deleting unrelated application data.

## 4. Lexicon and reading rules

`content/learning/tts-lexicon.json` is the provider-independent bilingual source for:

- Spanish and English speech locales;
- Bible book/reference normalization;
- translation labels such as RVR1960 and KJV;
- selected glossary-backed terms;
- semantic role prosody hints.

Glossary-backed entries retain `source_glossary_id`; pronunciation knowledge should reuse Bibli editorial entities where practical rather than creating a second theological glossary.

## 5. Semantic chunks

Runtime chunks retain a semantic role such as title, Bible reading, explanation, application, reflection, summary or prayer. The role can influence pace/pause now and becomes part of the cache identity for neural synthesis.

R1I does not automatically advance Dynamic lesson blocks from audio. Block/playback synchronization is the next implementation layer (R1J).
