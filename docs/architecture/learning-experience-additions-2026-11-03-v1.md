# Bibli — Learning Experience Additions — 2026-11-03 v1

## Purpose

This file is an incremental addendum. It does **not** replace or redefine `learning-experience-spec-v1.md` or `daily-learning-rhythm-v1.md`.

Implementation rule from this point forward:
- Existing specifications already being implemented are treated as a stable baseline.
- New approved ideas are recorded as incremental additions/versioned addenda.
- A baseline specification should only be revised deliberately during a later consolidation/refactor step, with an explicit change review.

## Approved additions

### 1. “How much time do you have today?”
Offer an optional session-length selector such as `5 min`, `15 min`, `30 min`, or `No limit`.
Bibli adapts the suggested session without altering canonical lesson progress or creating penalties.

### 2. Anchor concept of the day
After the main study session, select one especially important concept from what was actually studied.
Reuse it subtly during later reinforcement moments using different formats rather than verbatim repetition.

### 3. Optional weekly study summary
Provide a calm weekly recap containing, when useful:
- lessons/passages studied;
- main concepts;
- meaningful connections discovered;
- concepts worth reinforcing;
- highlighted passages.

Do not use streaks, XP, ranks, coins, artificial rewards, or punitive language.

### 4. Exact session resume
If a study session is interrupted, preserve enough state to resume at the exact point, including when applicable:
- current dynamic block;
- TTS playback position/state;
- already answered checks;
- notes/reflections;
- in-lesson progress.

### 5. Context-linked notes
Allow notes to attach not only to a lesson but also to a verse/reference, block, concept, question, or other meaningful learning entity.
When the same concept or reference appears later, Bibli may discreetly surface that a related personal note exists.

### 6. Learned-connections map
Build an optional visual map of relationships the user has actually encountered through study, such as covenant, people, promises, books, events, places, and Christological/canonical connections.
Integrate with the concept system and `Hilo Invisible` while avoiding premature spoilers or unsupported relationships.

### 7. Offline / prepared study
Support preparing a lesson for later use without network access when technically practical, including the lesson content and eligible cached media/audio assets.
Offline behavior must preserve progress consistency and synchronize safely when connectivity returns.

### 8. Content-bearing notifications
When notifications are enabled, prefer useful reinforcement over generic reminders.
A notification may contain a short recall prompt, concept reminder, or contextual invitation tied to what was actually studied.
Notifications remain optional and must respect user-configured quiet times and frequency limits.

### 9. Simple adaptive rescheduling
Allow actions such as `Today I can’t`, `Move to tomorrow`, `Move to weekend`, or `Pause route` without marking lessons as overdue failures.
The calendar should represent the learner’s current rhythm, not create a debt queue.

### 10. Accessibility from the foundation
Treat accessibility as a core product requirement, including:
- scalable font size;
- readable line length and spacing;
- sufficient contrast;
- reduced-motion support;
- keyboard navigation;
- screen-reader semantics;
- TTS integration;
- accessible behavior in both classic and dynamic lesson modes.

## Product-level principle

Bibli should not think only in terms of “which lesson is next”. Daily recommendations may consider:
- active study route;
- actual next lesson;
- concepts already encountered;
- concepts that need reinforcement;
- available time;
- recent study activity.

The goal is to help the person continue understanding Scripture, without turning study into an obligation queue or an extrinsic-reward system.
