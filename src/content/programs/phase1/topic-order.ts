import type { Phase1TopicKey } from "./types";

/**
 * Canonical Phase 1 topic order for planners and the /learn dashboard.
 * Keep aligned with `PHASE1_TOPIC_LABELS` in skill-map.ts (same keys, stable sequence).
 */
export const PHASE1_TOPIC_KEYS_IN_ORDER: readonly Phase1TopicKey[] = [
  "office",
  "notices",
  "meetings",
  "coordination",
  "hr",
  "finance",
  "operations",
  "marketing",
  "logistics",
  "tech",
  "communication",
  "healthEnv",
  "daily",
];
