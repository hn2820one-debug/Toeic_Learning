/**
 * Shape stored in `UserTopicProgress.learnProgressJson` for the LEARN stage (no scoring).
 * Indices refer to **0-based position** in the topic's ordered `Lesson[]` array (not DB `lessonIndex`).
 */
export type LearnProgressPayload = {
  seen: number[];
  understood: number[];
  reexplain: Record<string, number>;
};

export const EMPTY_LEARN_PROGRESS: LearnProgressPayload = {
  seen: [],
  understood: [],
  reexplain: {},
};

export function parseLearnProgressJson(raw: unknown): LearnProgressPayload {
  if (!raw || typeof raw !== "object") {
    return { ...EMPTY_LEARN_PROGRESS };
  }
  const o = raw as Record<string, unknown>;
  const nums = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is number => typeof x === "number" && Number.isInteger(x) && x >= 0) : [];
  const re =
    typeof o.reexplain === "object" && o.reexplain !== null && !Array.isArray(o.reexplain)
      ? Object.fromEntries(
          Object.entries(o.reexplain as Record<string, unknown>).filter(
            ([, val]) => typeof val === "number" && Number.isFinite(val),
          ) as [string, number][],
        )
      : {};
  return {
    seen: nums(o.seen),
    understood: nums(o.understood),
    reexplain: re,
  };
}

export function uniqSorted(nums: number[]): number[] {
  return [...new Set(nums)].sort((a, b) => a - b);
}

export function addSeen(payload: LearnProgressPayload, lessonPos: number): LearnProgressPayload {
  return {
    ...payload,
    seen: uniqSorted([...payload.seen, lessonPos]),
  };
}

export function addUnderstood(payload: LearnProgressPayload, lessonPos: number): LearnProgressPayload {
  return {
    ...payload,
    understood: uniqSorted([...payload.understood, lessonPos]),
  };
}

export function incrementReexplain(payload: LearnProgressPayload, lessonId: string): LearnProgressPayload {
  const n = payload.reexplain[lessonId] ?? 0;
  return {
    ...payload,
    reexplain: { ...payload.reexplain, [lessonId]: n + 1 },
  };
}

/** True when every index 0..lessonCount-1 appears in `understood`. */
export function isAllLessonsUnderstood(lessonCount: number, understood: number[]): boolean {
  if (lessonCount <= 0) {
    return false;
  }
  const set = new Set(understood);
  for (let i = 0; i < lessonCount; i++) {
    if (!set.has(i)) {
      return false;
    }
  }
  return true;
}
