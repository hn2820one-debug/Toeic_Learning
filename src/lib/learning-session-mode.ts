/**
 * Single source of truth for closed-loop `LearningSession.mode` (Prisma enum LearningSessionMode).
 * Route-level intents (/learn, /practice, /test, /review) map here; do not duplicate string literals across the app.
 *
 * Mapping to curriculum `Phase1SessionMode` (diagnostic, lesson_drill, …) lives in application code when composing sessions.
 */
import { LearningSessionMode } from "../../generated/prisma";

export const LEARNING_SESSION_MODES = ["learn", "practice", "test", "review", "mixed", "warmup"] as const;

export type LearningSessionModeLiteral = (typeof LEARNING_SESSION_MODES)[number];

export function isLearningSessionMode(value: string): value is LearningSessionModeLiteral {
  return (LEARNING_SESSION_MODES as readonly string[]).includes(value);
}

/** Cast validated literal to Prisma enum (same string values). */
export function toPrismaLearningSessionMode(value: LearningSessionModeLiteral): LearningSessionMode {
  return value as LearningSessionMode;
}
