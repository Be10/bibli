export const LEARNING_REVIEW_STORAGE_KEY = "bibli-learning-review-state-v1";
export const LEARNING_REVIEW_SCHEMA_VERSION = 1 as const;
export const LEARNING_REVIEW_SESSION_LIMIT = 4 as const;
export const LEARNING_REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const;

export type LearningReviewOutcome = "correct" | "incorrect";

export interface LearningReviewConceptStateV1 {
  conceptId: string;
  sourceLessonId: string;
  sourceCheckId: string;
  dueOn: string;
  intervalDays: number;
  reviewCount: number;
  successStreak: number;
  lastOutcome: LearningReviewOutcome;
  seededAt: string;
  lastReviewedAt?: string;
}

export interface LearningReviewStateV1 {
  schemaVersion: typeof LEARNING_REVIEW_SCHEMA_VERSION;
  concepts: Record<string, LearningReviewConceptStateV1>;
  lastSessionOn?: string;
  updatedAt?: string;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

const pad = (value: number) => String(value).padStart(2, "0");

export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addLocalDays(date: Date, days: number): string {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() + days);
  return localDateKey(copy);
}

const normalizeOutcome = (value: unknown): LearningReviewOutcome =>
  value === "incorrect" ? "incorrect" : "correct";

function normalizeConceptState(value: unknown): LearningReviewConceptStateV1 | null {
  const source = asRecord(value);
  const conceptId = typeof source.conceptId === "string" ? source.conceptId.trim() : "";
  const sourceLessonId = typeof source.sourceLessonId === "string" ? source.sourceLessonId.trim() : "";
  const sourceCheckId = typeof source.sourceCheckId === "string" ? source.sourceCheckId.trim() : "";
  const dueOn = typeof source.dueOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(source.dueOn)
    ? source.dueOn
    : localDateKey();
  const intervalDays = Number.isFinite(Number(source.intervalDays))
    ? Math.max(1, Math.round(Number(source.intervalDays)))
    : 1;
  const reviewCount = Number.isFinite(Number(source.reviewCount))
    ? Math.max(0, Math.round(Number(source.reviewCount)))
    : 0;
  const successStreak = Number.isFinite(Number(source.successStreak))
    ? Math.max(0, Math.round(Number(source.successStreak)))
    : 0;
  const seededAt = typeof source.seededAt === "string" && source.seededAt.trim()
    ? source.seededAt
    : new Date().toISOString();

  if (!conceptId || !sourceLessonId || !sourceCheckId) return null;

  const normalized: LearningReviewConceptStateV1 = {
    conceptId,
    sourceLessonId,
    sourceCheckId,
    dueOn,
    intervalDays,
    reviewCount,
    successStreak,
    lastOutcome: normalizeOutcome(source.lastOutcome),
    seededAt,
  };
  if (typeof source.lastReviewedAt === "string" && source.lastReviewedAt.trim()) {
    normalized.lastReviewedAt = source.lastReviewedAt;
  }
  return normalized;
}

export function emptyLearningReviewState(): LearningReviewStateV1 {
  return { schemaVersion: LEARNING_REVIEW_SCHEMA_VERSION, concepts: {} };
}

export function normalizeLearningReviewState(value: unknown): LearningReviewStateV1 {
  const source = asRecord(value);
  const rawConcepts = asRecord(source.concepts);
  const concepts: Record<string, LearningReviewConceptStateV1> = {};

  for (const [conceptId, rawState] of Object.entries(rawConcepts)) {
    const normalized = normalizeConceptState(rawState);
    if (!normalized) continue;
    concepts[conceptId] = { ...normalized, conceptId };
  }

  const result: LearningReviewStateV1 = {
    schemaVersion: LEARNING_REVIEW_SCHEMA_VERSION,
    concepts,
  };
  if (typeof source.lastSessionOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(source.lastSessionOn)) result.lastSessionOn = source.lastSessionOn;
  if (typeof source.updatedAt === "string" && source.updatedAt.trim()) result.updatedAt = source.updatedAt;
  return result;
}

export function readLearningReviewState(): LearningReviewStateV1 {
  if (typeof window === "undefined") return emptyLearningReviewState();
  try {
    return normalizeLearningReviewState(JSON.parse(window.localStorage.getItem(LEARNING_REVIEW_STORAGE_KEY) || "null"));
  } catch {
    return emptyLearningReviewState();
  }
}

export function writeLearningReviewState(value: LearningReviewStateV1): LearningReviewStateV1 {
  const normalized = normalizeLearningReviewState(value);
  normalized.updatedAt = new Date().toISOString();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LEARNING_REVIEW_STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // Review state is progressive enhancement; storage failure must not break study.
    }
    document.dispatchEvent(new CustomEvent("bibli:learning-review-change", { detail: normalized }));
  }
  return normalized;
}

export function seedReviewFromLessonCheck(input: {
  lessonId: string;
  checkId: string;
  conceptIds: string[];
  correct: boolean;
  now?: Date;
}): LearningReviewStateV1 {
  const now = input.now ?? new Date();
  const state = readLearningReviewState();
  const dueOn = addLocalDays(now, 1);
  const outcome: LearningReviewOutcome = input.correct ? "correct" : "incorrect";

  for (const conceptId of [...new Set(input.conceptIds.filter(Boolean))]) {
    const existing = state.concepts[conceptId];
    if (existing && existing.reviewCount > 0) continue;
    state.concepts[conceptId] = {
      conceptId,
      sourceLessonId: input.lessonId,
      sourceCheckId: input.checkId,
      dueOn,
      intervalDays: 1,
      reviewCount: existing?.reviewCount ?? 0,
      successStreak: input.correct ? 1 : 0,
      lastOutcome: outcome,
      seededAt: existing?.seededAt ?? now.toISOString(),
      lastReviewedAt: existing?.lastReviewedAt,
    };
  }
  return writeLearningReviewState(state);
}

export function recordReviewOutcome(input: {
  conceptIds: string[];
  correct: boolean;
  sourceLessonId: string;
  sourceCheckId: string;
  now?: Date;
}): LearningReviewStateV1 {
  const now = input.now ?? new Date();
  const state = readLearningReviewState();
  const outcome: LearningReviewOutcome = input.correct ? "correct" : "incorrect";

  for (const conceptId of [...new Set(input.conceptIds.filter(Boolean))]) {
    const existing = state.concepts[conceptId] ?? {
      conceptId,
      sourceLessonId: input.sourceLessonId,
      sourceCheckId: input.sourceCheckId,
      dueOn: localDateKey(now),
      intervalDays: 1,
      reviewCount: 0,
      successStreak: 0,
      lastOutcome: outcome,
      seededAt: now.toISOString(),
    };

    let intervalDays = 1;
    let successStreak = 0;
    if (input.correct) {
      const currentIndex = LEARNING_REVIEW_INTERVALS_DAYS.findIndex((value) => value >= existing.intervalDays);
      const nextIndex = Math.min(
        LEARNING_REVIEW_INTERVALS_DAYS.length - 1,
        Math.max(1, currentIndex + 1),
      );
      intervalDays = LEARNING_REVIEW_INTERVALS_DAYS[nextIndex] ?? 30;
      successStreak = existing.successStreak + 1;
    }

    state.concepts[conceptId] = {
      ...existing,
      sourceLessonId: input.sourceLessonId,
      sourceCheckId: input.sourceCheckId,
      dueOn: addLocalDays(now, intervalDays),
      intervalDays,
      reviewCount: existing.reviewCount + 1,
      successStreak,
      lastOutcome: outcome,
      lastReviewedAt: now.toISOString(),
    };
  }
  return writeLearningReviewState(state);
}

export function markReviewSessionComplete(now = new Date()): LearningReviewStateV1 {
  const state = readLearningReviewState();
  state.lastSessionOn = localDateKey(now);
  return writeLearningReviewState(state);
}

export function getDueReviewConcepts(
  allowedConceptIds?: Iterable<string>,
  limit = LEARNING_REVIEW_SESSION_LIMIT,
  today = localDateKey(),
): LearningReviewConceptStateV1[] {
  const allowed = allowedConceptIds ? new Set(allowedConceptIds) : null;
  const state = readLearningReviewState();
  if (state.lastSessionOn === today) return [];
  return Object.values(state.concepts)
    .filter((item) => (!allowed || allowed.has(item.conceptId)) && item.dueOn <= today)
    .sort((a, b) => {
      if (a.lastOutcome !== b.lastOutcome) return a.lastOutcome === "incorrect" ? -1 : 1;
      if (a.dueOn !== b.dueOn) return a.dueOn.localeCompare(b.dueOn);
      return a.conceptId.localeCompare(b.conceptId);
    })
    .slice(0, Math.max(0, limit));
}

export function countDueReviewConcepts(
  allowedConceptIds?: Iterable<string>,
  today = localDateKey(),
): number {
  const allowed = allowedConceptIds ? new Set(allowedConceptIds) : null;
  const state = readLearningReviewState();
  if (state.lastSessionOn === today) return 0;
  return Object.values(state.concepts)
    .filter((item) => (!allowed || allowed.has(item.conceptId)) && item.dueOn <= today)
    .length;
}
