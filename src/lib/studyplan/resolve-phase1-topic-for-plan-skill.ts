import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";

const TOPIC_KEYS = new Set<string>(PHASE1_TOPIC_KEYS_IN_ORDER);

/** Maps LearningSkill.skillCode (30-day plan) → Phase1 topic for /learn /practice /test routes. */
const SKILL_TO_TOPIC: Record<string, Phase1TopicKey> = {
  vocab_medical: "healthEnv",
  vocab_daily_life: "daily",
  vocab_environment: "healthEnv",
  vocab_communication: "communication",
  vocab_false_friends: "communication",
  vocab_office_general: "office",
  vocab_meetings: "meetings",
  vocab_hr_recruitment: "hr",
  vocab_marketing_sales: "marketing",
  vocab_finance_banking: "finance",
  vocab_logistics: "logistics",
  vocab_technology: "tech",
  vocab_travel: "daily",
  vocab_contracts: "coordination",
  vocab_events: "marketing",
  vocab_hotel_dining: "daily",
  vocab_construction: "operations",
  vocab_real_estate: "operations",
  phrase_documents: "office",
  phrase_business_coord: "coordination",
  phrase_meetings: "meetings",
  phrase_corporate: "operations",
  phrase_problem_solving: "coordination",
  phrase_decisions: "meetings",
  phrase_time_scheduling: "office",
  phrase_numbers_data: "finance",
  phrase_customer_service: "communication",
  phrase_opinions: "communication",
  strat_p5_timing: "onboarding",
  strat_p5_eliminate: "onboarding",
  strat_p6_flow: "onboarding",
  strat_p7_skim: "onboarding",
  strat_p7_scan: "onboarding",
  strat_listen_prediction: "onboarding",
  strat_listen_paraphrase: "onboarding",
  strat_exam_endurance: "onboarding",
};

export type ResolvePlanSkillTopicResult = {
  topicKey: Phase1TopicKey | null;
  /** Non-fatal routing / content alignment notes for the day detail page. */
  warnings: string[];
};

/**
 * Resolves which Phase1 topic should receive `primaryLearningSkillCode` query links.
 * Grammar skills outside grammar_svc / grammar_svoo aggregate under grammar_svc (content hub).
 */
export function resolvePhase1TopicForPlanSkill(skillCode: string | null): ResolvePlanSkillTopicResult {
  const warnings: string[] = [];
  if (!skillCode?.trim()) {
    warnings.push("此日沒有 primarySkillCode（常見於診斷／模考日）。「開始」連結可能無法帶入主題與技能篩選。");
    return { topicKey: null, warnings };
  }
  const code = skillCode.trim();

  if (TOPIC_KEYS.has(code)) {
    return { topicKey: code as Phase1TopicKey, warnings };
  }

  if (code === "grammar_svoo") {
    return { topicKey: "grammar_svoo", warnings };
  }
  if (code.startsWith("grammar_")) {
    if (code !== "grammar_svc") {
      warnings.push(
        `文法技能「${code}」目前路由到主題 grammar_svc（教材與題庫聚合入口）。若題庫未標記此 skill，練習／測驗可能題量不足。`,
      );
    }
    return { topicKey: "grammar_svc", warnings };
  }

  const mapped = SKILL_TO_TOPIC[code];
  if (mapped) {
    return { topicKey: mapped, warnings };
  }

  warnings.push(
    `技能代碼「${code}」缺少 topic 對照表項目；已退回 office 作為保守預設。請補齊 SKILL_TO_TOPIC 對照。`,
  );
  return { topicKey: "office", warnings };
}

export function relatedTopicKeys(topicKey: Phase1TopicKey | null): Phase1TopicKey[] {
  if (!topicKey) return [];
  const idx = PHASE1_TOPIC_KEYS_IN_ORDER.indexOf(topicKey);
  if (idx === -1) return [];
  const out: Phase1TopicKey[] = [];
  if (idx > 0) out.push(PHASE1_TOPIC_KEYS_IN_ORDER[idx - 1]!);
  if (idx < PHASE1_TOPIC_KEYS_IN_ORDER.length - 1) out.push(PHASE1_TOPIC_KEYS_IN_ORDER[idx + 1]!);
  return out;
}
