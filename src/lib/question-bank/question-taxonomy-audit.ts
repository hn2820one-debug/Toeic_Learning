import "server-only";

import { resolvePhase1TopicForPlanSkill } from "@/lib/studyplan/resolve-phase1-topic-for-plan-skill";

export type QuestionTaxonomyAudit = {
  questionId: number;
  invalid: boolean;
  warnings: string[];
};

/**
 * Light checks for admin / debug (no UI required).
 */
export function auditQuestionBankRowLite(input: {
  id: number;
  primaryLearningSkillCode: string | null;
  topicKey: string | null;
}): QuestionTaxonomyAudit {
  const warnings: string[] = [];
  let invalid = false;

  if (!input.primaryLearningSkillCode?.trim()) {
    invalid = true;
    warnings.push("missing_primaryLearningSkillCode");
    return { questionId: input.id, invalid, warnings };
  }

  const skill = input.primaryLearningSkillCode.trim();
  const { topicKey: expectedTopic, warnings: routeWarnings } = resolvePhase1TopicForPlanSkill(skill);

  if (input.topicKey && expectedTopic && input.topicKey !== expectedTopic) {
    warnings.push(
      `topicKey_mismatch_skill: row_topic=${input.topicKey} inferred_from_skill=${expectedTopic}`,
    );
    for (const w of routeWarnings) {
      warnings.push(`route:${w}`);
    }
  }

  return { questionId: input.id, invalid, warnings };
}
