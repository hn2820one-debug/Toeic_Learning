/**
 * Shared LearningSkill routing tables (same source as scripts/backfill-phase1-learning-skill).
 * Inference logic: {@link inferPrimaryLearningSkillCode} in `./infer-primary-learning-skill`.
 */
import type { Phase1SkillKey, Phase1TopicKey } from "@/content/programs/phase1/types";

import { normalizeForSubFocusCompare } from "../../../scripts/taxonomy/backfill-mappings";

/** Short tokens sometimes found in CSV / legacy notes (English / abbrev). */
export const LEGACY_TO_LEARNING_SKILL: Record<string, string> = {
  svc: "grammar_svc",
  svoo: "grammar_svoo",
  svoc: "grammar_svoc",
  gerund: "grammar_gerund",
  infinitive: "grammar_infinitive",
  participle: "grammar_participle",
  "noun clause": "grammar_noun_clause",
  "relative clause": "grammar_adj_clause",
  conjunction: "grammar_conjunction",
  preposition: "grammar_preposition",
  passive: "grammar_passive",
  "past perfect": "grammar_past_perfect",
  "present perfect": "grammar_present_perfect",
  "subject-verb": "grammar_nouns_count",
  sva: "grammar_nouns_count",
  countable: "grammar_nouns_count",
  subjunctive: "grammar_subjunctive",
};

/** Default LearningSkill per Phase1 skill family. */
export const PHASE1_SKILL_KEY_TO_LEARNING_SKILL: Record<Phase1SkillKey, string> = {
  "vocabulary.document-workflow": "phrase_documents",
  "vocabulary.formal-register": "phrase_corporate",
  "vocabulary.domain-and-abstract-meaning": "vocab_communication",
  "grammar.verb-control": "grammar_present_perfect",
  "grammar.pattern-control": "grammar_gerund",
  "grammar.sentence-linking": "grammar_conjunction",
  "reading.detail-retrieval": "strat_p7_scan",
  "reading.purpose-and-intent": "strat_p7_skim",
  "reading.inference-and-process-logic": "strat_p7_scan",
  "reading.contextual-meaning": "vocab_communication",
};

/** Normalized subFocus label → LearningSkill.skillCode. */
export const SUBFOCUS_TO_LEARNING_SKILL: Record<string, string> = {
  [normalizeForSubFocusCompare("片語動詞 / Phrasal verbs")]: "phrase_business_coord",
  [normalizeForSubFocusCompare("固定搭配 / Fixed expressions")]: "phrase_documents",
  [normalizeForSubFocusCompare("正式書面語 / Formal register")]: "phrase_corporate",
  [normalizeForSubFocusCompare("商務搭配 / Business collocation")]: "phrase_business_coord",
  [normalizeForSubFocusCompare("抽象字義 / Abstract meaning")]: "vocab_communication",
  [normalizeForSubFocusCompare("領域字彙 / Domain vocabulary")]: "vocab_office_general",

  [normalizeForSubFocusCompare("動詞時態 / Verb tense")]: "grammar_present_perfect",
  [normalizeForSubFocusCompare("被動語態 / Passive voice")]: "grammar_passive",
  [normalizeForSubFocusCompare("主詞動詞一致 / Subject-Verb Agreement")]: "grammar_nouns_count",
  [normalizeForSubFocusCompare("動名詞與不定詞 / Gerund vs. Infinitive")]: "grammar_gerund",
  [normalizeForSubFocusCompare("介系詞與固定搭配 / Prepositions & patterns")]: "grammar_preposition",
  [normalizeForSubFocusCompare("關係子句 / Relative clauses")]: "grammar_relative_pron",
  [normalizeForSubFocusCompare("連接詞與邏輯 / Conjunctions & logic")]: "grammar_conjunction",
  [normalizeForSubFocusCompare("used to 系列 / Used to family")]: "grammar_infinitive",
  [normalizeForSubFocusCompare("分詞修飾 / Participles")]: "grammar_participle",

  [normalizeForSubFocusCompare("電子郵件細節 / Email detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("公告目的 / Notice purpose")]: "strat_p7_skim",
  [normalizeForSubFocusCompare("會議細節 / Meeting detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("工作協調細節 / Coordination detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("人事規則細節 / HR detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("財務規則細節 / Finance detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("物流細節 / Logistics detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("行銷流程細節 / Marketing detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("技術報告細節 / Technical detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("說話者意圖 / Writer intent")]: "strat_p7_skim",
  [normalizeForSubFocusCompare("旅遊公告細節 / Travel notice detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("安全公告細節 / Safety notice detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("電子郵件目的 / Email purpose")]: "strat_p7_skim",
  [normalizeForSubFocusCompare("公告推論 / Notice inference")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("流程推論 / Process inference")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("語境字義 / Vocabulary in context")]: "vocab_communication",
  [normalizeForSubFocusCompare("制度變更目的 / Process change purpose")]: "strat_p7_skim",
  [normalizeForSubFocusCompare("結果推論 / Outcome inference")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("政策細節 / Policy detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("技術事故細節 / Incident detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("原因推論 / Cause inference")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("客訴原因 / Complaint reason")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("寫信者意圖 / Writer intent")]: "strat_p7_skim",
  [normalizeForSubFocusCompare("文件細節 / Short document detail")]: "strat_p7_scan",
  [normalizeForSubFocusCompare("目的判斷 / Purpose")]: "strat_p7_skim",
  [normalizeForSubFocusCompare("推論 / Inference")]: "strat_p7_scan",
};

export function topicKeyToDomainVocabSkill(topicKey: Phase1TopicKey): string {
  switch (topicKey) {
    case "tech":
      return "vocab_technology";
    case "healthEnv":
      return "vocab_medical";
    case "finance":
      return "vocab_finance_banking";
    case "hr":
      return "vocab_hr_recruitment";
    case "logistics":
      return "vocab_logistics";
    case "marketing":
      return "vocab_marketing_sales";
    case "daily":
      return "vocab_daily_life";
    case "office":
    case "notices":
    case "meetings":
    case "coordination":
    case "operations":
    case "communication":
      return "vocab_office_general";
    default:
      return "vocab_office_general";
  }
}
