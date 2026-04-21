import type { PracticeRuntimeMeta } from "@/lib/practice/practice-runtime-types";

/** Rebuild `/practice` query for restarting with the same dual-axis preset. */
export function practiceEntryHref(topicKey: string, runtime: PracticeRuntimeMeta | null | undefined): string {
  const p = new URLSearchParams();
  p.set("topicKey", topicKey);
  if (runtime?.dualAxis) {
    if (runtime.mode) {
      p.set("mode", runtime.mode);
    }
    if (runtime.skill) {
      p.set("skill", runtime.skill);
    }
    if (runtime.moduleKey) {
      p.set("moduleKey", runtime.moduleKey);
    }
    p.set("count", String(runtime.count));
  }
  return `/practice?${p.toString()}`;
}
