import type { Prisma } from "../../generated/prisma";
import type { Phase1SessionMode } from "@/content/programs/phase1/types";

/** Closed-loop curriculum modes — dual-axis filters optional (`topicKey` scene, `primaryLearningSkillCode` skill). */
export const PHASE1_SESSION_MODE_VALUES = [
  "diagnostic",
  "lesson_drill",
  "checkpoint",
  "review",
  "mixed_practice",
] as const satisfies readonly Phase1SessionMode[];

export type ComposeSessionInput = {
  mode: Phase1SessionMode;
  moduleKey?: string;
  topicKey?: string;
  primaryLearningSkillCode?: string;
  count?: number;
};

export function buildComposeQuestionWhere(input: ComposeSessionInput): Prisma.QuestionBankItemWhereInput {
  const and: Prisma.QuestionBankItemWhereInput[] = [];
  const mk = input.moduleKey?.trim();
  const tk = input.topicKey?.trim();
  const sk = input.primaryLearningSkillCode?.trim();
  if (mk) {
    and.push({ moduleKey: mk });
  }
  if (tk) {
    and.push({ topicKey: tk });
  }
  if (sk) {
    and.push({ primaryLearningSkillCode: sk });
  }
  return and.length > 0 ? { AND: and } : {};
}
