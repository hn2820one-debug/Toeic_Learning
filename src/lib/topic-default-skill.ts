/**
 * Default `primaryLearningSkillCode` per Phase1 topic until `Lesson` rows store it in DB.
 * Aligns learn → practice/test deep links without topic-only routing.
 */
import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";

/** Primary fine skill for bank routing / strict sessions. */
export const TOPIC_DEFAULT_PRIMARY_LEARNING_SKILL: Record<Phase1TopicKey, string> = {
  onboarding: "strat_p5_timing",
  grammar_svc: "grammar_svc",
  grammar_svoo: "grammar_svoo",
  office: "vocab_office_general",
  notices: "vocab_communication",
  meetings: "vocab_meetings",
  coordination: "phrase_business_coord",
  hr: "vocab_hr_recruitment",
  finance: "vocab_finance_banking",
  operations: "phrase_corporate",
  marketing: "vocab_marketing_sales",
  logistics: "vocab_logistics",
  tech: "vocab_technology",
  communication: "vocab_communication",
  healthEnv: "vocab_medical",
  daily: "vocab_daily_life",
};

export function defaultPrimaryLearningSkillForTopic(topicKey: Phase1TopicKey): string {
  return TOPIC_DEFAULT_PRIMARY_LEARNING_SKILL[topicKey] ?? "vocab_office_general";
}

export function assertAllTopicsHaveDefaultSkill(): void {
  for (const k of PHASE1_TOPIC_KEYS_IN_ORDER) {
    if (!TOPIC_DEFAULT_PRIMARY_LEARNING_SKILL[k]) {
      throw new Error(`Missing default skill for topic ${k}`);
    }
  }
}
