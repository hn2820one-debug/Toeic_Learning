import type { CheckpointRuntimeMeta } from "./test-runtime-types";

export function parseCheckpointRuntimeFromRevisitMeta(raw: unknown): CheckpointRuntimeMeta | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const cr = o.checkpointRuntime;
  if (!cr || typeof cr !== "object") {
    return null;
  }
  const c = cr as Record<string, unknown>;
  const mode = c.mode === "test" ? "test" : c.mode === "checkpoint" ? "checkpoint" : null;
  if (!mode) {
    return null;
  }
  const topicKey = typeof c.topicKey === "string" ? c.topicKey : "";
  return {
    mode,
    skill: typeof c.skill === "string" ? c.skill : undefined,
    topicKey,
    moduleKey: typeof c.moduleKey === "string" ? c.moduleKey : undefined,
    count: typeof c.count === "number" && c.count > 0 ? c.count : 15,
    skillRuleSlots: typeof c.skillRuleSlots === "number" && c.skillRuleSlots >= 0 ? c.skillRuleSlots : 10,
    secondsPerQuestion: typeof c.secondsPerQuestion === "number" && c.secondsPerQuestion > 0 ? c.secondsPerQuestion : 30,
  };
}
