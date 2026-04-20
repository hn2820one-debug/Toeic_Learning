/**
 * JSON shape for `LearningSessionItem.practiceStateJson` in PRACTICE mode.
 */
export type PracticeItemStatus = "open" | "solved" | "revealed";

export type PracticeAttemptEntry = {
  choice: string;
  correct: boolean;
  /** Max hint layer (1–3) the learner had viewed before this submit; 0 = none. */
  hintsAtSubmit: number;
  answeredAt: string;
};

export type PracticeHintViewEntry = {
  layer: 1 | 2 | 3;
  at: string;
};

export type PracticeItemState = {
  maxHintLayerSeen: number;
  hintViews: PracticeHintViewEntry[];
  attempts: PracticeAttemptEntry[];
  status: PracticeItemStatus;
  lastSubmitKey?: string;
  /** First user interaction on this item (hint or submit), ISO — used for hesitation / time-to-correct. */
  firstOpenedAt?: string;
};

export const MAX_SUBMIT_ATTEMPTS = 3;
export const PRACTICE_QUESTION_COUNT = 10;

export function emptyPracticeItemState(): PracticeItemState {
  return {
    maxHintLayerSeen: 0,
    hintViews: [],
    attempts: [],
    status: "open",
    lastSubmitKey: undefined,
  };
}

export function parsePracticeItemState(raw: unknown): PracticeItemState {
  if (!raw || typeof raw !== "object") {
    return emptyPracticeItemState();
  }
  const o = raw as Record<string, unknown>;
  const attempts = Array.isArray(o.attempts) ? (o.attempts as PracticeAttemptEntry[]) : [];
  const hintViews = Array.isArray(o.hintViews) ? (o.hintViews as PracticeHintViewEntry[]) : [];
  const status = o.status === "solved" || o.status === "revealed" || o.status === "open" ? o.status : "open";
  const maxHintLayerSeen =
    typeof o.maxHintLayerSeen === "number" && o.maxHintLayerSeen >= 0 && o.maxHintLayerSeen <= 3
      ? o.maxHintLayerSeen
      : Math.max(0, ...hintViews.map((h) => h.layer));
  return {
    maxHintLayerSeen,
    hintViews,
    attempts,
    status,
    lastSubmitKey: typeof o.lastSubmitKey === "string" ? o.lastSubmitKey : undefined,
    firstOpenedAt: typeof o.firstOpenedAt === "string" ? o.firstOpenedAt : undefined,
  };
}

export function totalHintViews(state: PracticeItemState): number {
  return state.hintViews.length;
}

export function canRevealNextHint(state: PracticeItemState, nextLayer: 1 | 2 | 3): boolean {
  return nextLayer === (state.maxHintLayerSeen + 1) as 1 | 2 | 3 && nextLayer <= 3;
}
