/**
 * Optional metadata stored in `LearningSession.revisitMetaJson` alongside revisit planner `v`/`revisitCount`.
 */
import type { PracticeRuntimeMeta } from "./practice-runtime-types";

export function parsePracticeRuntimeFromRevisitMeta(raw: unknown): PracticeRuntimeMeta | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const pr = o.practiceRuntime;
  if (!pr || typeof pr !== "object") {
    return null;
  }
  const p = pr as Record<string, unknown>;
  if (p.dualAxis !== true) {
    return null;
  }
  return {
    dualAxis: true,
    mode: typeof p.mode === "string" ? p.mode : undefined,
    skill: typeof p.skill === "string" ? p.skill : undefined,
    moduleKey: typeof p.moduleKey === "string" ? p.moduleKey : undefined,
    count: typeof p.count === "number" && p.count > 0 ? p.count : 7,
  };
}

/** Merge planner updates without dropping `practiceRuntime`. */
export function mergeRevisitMetaIncrement(
  previous: unknown,
  nextRevisitCount: number,
): Record<string, unknown> {
  const base =
    previous && typeof previous === "object" ? { ...(previous as Record<string, unknown>) } : {};
  return {
    ...base,
    v: 1,
    revisitCount: nextRevisitCount,
  };
}
