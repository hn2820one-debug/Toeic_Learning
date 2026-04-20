import "server-only";

import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import {
  collectTestCompositionWarnings,
  getTestResultSummary,
  parseTestItemState,
  type TestResultSummary,
} from "@/lib/test-mode";
import { parseCheckpointRuntimeFromRevisitMeta } from "./test-session-meta";

export type SessionWithTestItems = {
  topicKey: string | null;
  revisitMetaJson: unknown | null;
  items: Array<{
    position: number;
    testStateJson: unknown | null;
    question: {
      questionText: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctAnswer: string;
      explanation: string | null;
      topicKey: string | null;
      primaryLearningSkillCode: string | null;
    };
  }>;
};

export function finalizeTestSession(params: {
  topicKey: Phase1TopicKey;
  session: SessionWithTestItems;
}): { summary: TestResultSummary; compositionWarnings: string[] } {
  const meta = parseCheckpointRuntimeFromRevisitMeta(params.session.revisitMetaJson);

  const summary = getTestResultSummary({
    items: params.session.items.map((it) => {
      const q = it.question;
      return {
        position: it.position,
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        primaryLearningSkillCode: q.primaryLearningSkillCode,
        testState: parseTestItemState(it.testStateJson),
      };
    }),
    skillRuleSlots: meta?.skillRuleSlots,
    targetSkillCode: meta?.skill ?? null,
  });

  const compositionWarnings = collectTestCompositionWarnings(
    params.topicKey,
    params.session.items.map((it) => ({ position: it.position, topicKey: it.question.topicKey })),
    { skillRuleSlots: meta?.skillRuleSlots },
  );

  return { summary, compositionWarnings };
}
