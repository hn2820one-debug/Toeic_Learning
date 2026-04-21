/**
 * 30-day closed-loop StudyPlan template — matches the 2026-04 final plan (v1.0)
 * section §4 逐日計劃 + §2 四日輪換 (Day A / B / C / D).
 *
 * One template, re-materialized per user when they "Start the 30-Day Plan".
 * Each DailyPlanItem.activitiesJson is an ordered list of 45-minute session steps.
 *
 * activity.type:
 *   - "warmup"         2-min activation quiz
 *   - "review"         FSRS due-card review
 *   - "learn"          new LEARN cards for a skill
 *   - "practice"       5-12 practice items (hints allowed early week)
 *   - "test"           timed TEST — topic-level Tested promotion
 *   - "mixed_reading"  Part 6/7 passages across skills
 *   - "mixed_mock"     mini or full mock test (Day 26 / 29)
 *   - "reflect"        written reflection / error analysis / week report
 */

export type DailyPlanActivityType =
  | "warmup"
  | "review"
  | "learn"
  | "practice"
  | "test"
  | "mixed_reading"
  | "mixed_mock"
  | "reflect";

export type DailyPlanActivity = {
  type: DailyPlanActivityType;
  /** LearningSkill.skillCode when the activity targets a specific skill */
  skillCode?: string;
  minutes: number;
  notes?: string;
};

export type DailyPlanTemplate = {
  dayNumber: number;
  dayType: "A" | "B" | "C" | "D" | "special";
  /** Main LearningSkill.skillCode focus for the day (null on diagnostic / mock days) */
  primarySkillCode: string | null;
  activities: DailyPlanActivity[];
  /** Human-readable headline for planner UI */
  headlineZh: string;
  /** Checkpoint flag — true on Day 1 baseline, Day 26 mini mock, Day 29 full mock, Day 30 summary */
  isCheckpoint?: boolean;
};

// ─────────────────────────────────────────────
//  WEEK 1 (Day 1-7) — 基礎打底
// ─────────────────────────────────────────────
const WEEK1: DailyPlanTemplate[] = [
  {
    dayNumber: 1,
    dayType: "special",
    primarySkillCode: null,
    headlineZh: "Day 1 — 基線診斷（Baseline Diagnostic）",
    isCheckpoint: true,
    activities: [
      { type: "test", minutes: 25, notes: "20 題診斷測驗，覆蓋 9 個 Weak 文法項（每項 2 題）" },
      { type: "reflect", minutes: 20, notes: "錯題映射對應 LearningSkill，系統生成 30 日個人化路徑 cache" },
    ],
  },
  {
    dayNumber: 2,
    dayType: "A",
    primarySkillCode: "grammar_svc",
    headlineZh: "Day 2 — SVC 句型 LEARN",
    activities: [
      { type: "warmup", minutes: 2, notes: "2 題基本主動詞一致" },
      { type: "learn", skillCode: "grammar_svc", minutes: 20, notes: "sound/appear/remain/seem/become + adj；半導體例子" },
      { type: "practice", skillCode: "grammar_svc", minutes: 20, notes: "7 題，允許 hint（hint penalty 計算）" },
      { type: "reflect", minutes: 3, notes: "認知負載 1-5 評分" },
    ],
  },
  {
    dayNumber: 3,
    dayType: "B",
    primarySkillCode: "grammar_svc",
    headlineZh: "Day 3 — SVC 深化 PRACTICE + Medical 詞彙",
    activities: [
      { type: "warmup", skillCode: "grammar_svc", minutes: 2 },
      { type: "review", minutes: 5, notes: "Day 2 嘅 FSRS 卡（3-5 張）" },
      { type: "practice", skillCode: "grammar_svc", minutes: 18, notes: "再 12 題，減少 hint" },
      { type: "learn", skillCode: "vocab_medical", minutes: 15, notes: "8 詞：symptom / prescription / dosage / diagnosis / recovery / chronic / acute / referral" },
      { type: "reflect", minutes: 5 },
    ],
  },
  {
    dayNumber: 4,
    dayType: "C",
    primarySkillCode: null,
    headlineZh: "Day 4 — Part 6 段落閱讀",
    activities: [
      { type: "warmup", minutes: 3, notes: "3 題混合" },
      { type: "review", minutes: 8, notes: "Day 2-3 到期卡（5-8 張）" },
      { type: "mixed_reading", minutes: 22, notes: "2 篇段落填空（每篇 4 題），至少 1 篇含 SVC" },
      { type: "reflect", minutes: 12, notes: "錯因分類 + LLM 解釋" },
    ],
  },
  {
    dayNumber: 5,
    dayType: "D",
    primarySkillCode: "grammar_svc",
    headlineZh: "Day 5 — SVC 驗收 TEST",
    activities: [
      { type: "warmup", minutes: 2 },
      { type: "review", minutes: 13, notes: "密集 10 張" },
      { type: "test", skillCode: "grammar_svc", minutes: 25, notes: "15 題，30 秒/題，無 hint；目標 topic 題 ≥80%，整體 ≥70% → Tested" },
      { type: "reflect", minutes: 5 },
    ],
  },
  {
    dayNumber: 6,
    dayType: "A",
    primarySkillCode: "grammar_svoo",
    headlineZh: "Day 6 — SVOO 授與動詞 LEARN（週末 slot）",
    activities: [
      { type: "warmup", minutes: 2 },
      { type: "review", minutes: 7, notes: "到期 7 張" },
      { type: "learn", skillCode: "grammar_svoo", minutes: 20, notes: "give/send/bring/offer/tell 人 物；介詞 to vs for" },
      { type: "practice", skillCode: "grammar_svoo", minutes: 13, notes: "8 題" },
      { type: "reflect", minutes: 3 },
    ],
  },
  {
    dayNumber: 7,
    dayType: "B",
    primarySkillCode: "grammar_svoo",
    headlineZh: "Day 7 — SVOO 深化 + 週結（Week 1 report）",
    activities: [
      { type: "warmup", minutes: 2 },
      { type: "review", minutes: 10 },
      { type: "practice", skillCode: "grammar_svoo", minutes: 18, notes: "12 題" },
      { type: "learn", skillCode: "vocab_medical", minutes: 10, notes: "再 8 個醫療詞" },
      { type: "reflect", minutes: 5, notes: "Week 1 report：完成 topic 數、正確率、估分、下週重點" },
    ],
  },
];

// ─────────────────────────────────────────────
//  WEEK 2 (Day 8-14) — 核心三項文法攻堅
// ─────────────────────────────────────────────
const WEEK2: DailyPlanTemplate[] = [
  {
    dayNumber: 8,
    dayType: "D",
    primarySkillCode: "grammar_svoo",
    headlineZh: "Day 8 — SVOO 驗收 TEST",
    activities: [
      { type: "warmup", minutes: 2 },
      { type: "review", minutes: 13 },
      { type: "test", skillCode: "grammar_svoo", minutes: 25, notes: "15 題；通過即達 Tested" },
      { type: "reflect", minutes: 5 },
    ],
  },
  {
    dayNumber: 9,
    dayType: "A",
    primarySkillCode: "grammar_gerund",
    headlineZh: "Day 9 — Gerund 動名詞 LEARN ⭐",
    activities: [
      { type: "warmup", minutes: 2 },
      { type: "review", minutes: 8 },
      { type: "learn", skillCode: "grammar_gerund", minutes: 20, notes: "介詞後一定 V-ing；特定動詞後 V-ing (consider/postpone/quit/enjoy/avoid/mind)" },
      { type: "practice", skillCode: "grammar_gerund", minutes: 12, notes: "8 題" },
      { type: "reflect", minutes: 3 },
    ],
  },
  {
    dayNumber: 10,
    dayType: "B",
    primarySkillCode: "grammar_gerund",
    headlineZh: "Day 10 — Gerund 深化 + Daily 詞彙",
    activities: [
      { type: "warmup", minutes: 2 },
      { type: "review", minutes: 5 },
      { type: "practice", skillCode: "grammar_gerund", minutes: 18, notes: "12 題，重點測試介詞後 V-ing" },
      { type: "learn", skillCode: "vocab_daily_life", minutes: 15, notes: "8 詞：appliance/commute/laundry/grocery/utilities/mortgage/maintenance/deposit" },
      { type: "reflect", minutes: 5 },
    ],
  },
  {
    dayNumber: 11,
    dayType: "C",
    primarySkillCode: null,
    headlineZh: "Day 11 — Gerund Part 6 閱讀",
    activities: [
      { type: "warmup", minutes: 3 },
      { type: "review", minutes: 5 },
      { type: "mixed_reading", minutes: 25, notes: "2 篇段落（帶 gerund 環境）" },
      { type: "reflect", minutes: 12, notes: "重點睇 gerund/infinitive 混淆" },
    ],
  },
  {
    dayNumber: 12,
    dayType: "D",
    primarySkillCode: "grammar_gerund",
    headlineZh: "Day 12 — Gerund TEST + Participle LEARN (1/2)",
    activities: [
      { type: "test", skillCode: "grammar_gerund", minutes: 20, notes: "15 題" },
      { type: "learn", skillCode: "grammar_participle", minutes: 22, notes: "-ed vs -ing；bored vs boring；過去分詞 ≠ 過去式動詞" },
      { type: "reflect", minutes: 3 },
    ],
  },
  {
    dayNumber: 13,
    dayType: "A",
    primarySkillCode: "grammar_participle",
    headlineZh: "Day 13 — Participle 完成 LEARN + PRACTICE",
    activities: [
      { type: "warmup", minutes: 2 },
      { type: "review", minutes: 5 },
      { type: "learn", skillCode: "grammar_participle", minutes: 15, notes: "分詞片語；The engineer reviewing the schematic is new here" },
      { type: "practice", skillCode: "grammar_participle", minutes: 15, notes: "10 題" },
      { type: "learn", skillCode: "vocab_daily_life", minutes: 8, notes: "再 8 個 daily 詞" },
    ],
  },
  {
    dayNumber: 14,
    dayType: "B",
    primarySkillCode: "grammar_participle",
    headlineZh: "Day 14 — Participle 深化 + 週結（Week 2 report）",
    activities: [
      { type: "warmup", minutes: 2 },
      { type: "review", minutes: 5 },
      { type: "practice", skillCode: "grammar_participle", minutes: 18, notes: "12 題" },
      { type: "learn", skillCode: "vocab_environment", minutes: 15, notes: "6 詞：emission/pollution/sustainable/conservation/renewable/ecosystem" },
      { type: "reflect", minutes: 5, notes: "Week 2 report：累積 cognitive load 平均 ≤3.5？" },
    ],
  },
];

// ─────────────────────────────────────────────
//  WEEK 3 (Day 15-21) — Noun Clause + 系統鞏固
// ─────────────────────────────────────────────
const WEEK3: DailyPlanTemplate[] = [
  {
    dayNumber: 15,
    dayType: "D",
    primarySkillCode: "grammar_participle",
    headlineZh: "Day 15 — Participle 驗收 TEST",
    activities: [
      { type: "warmup", minutes: 2 },
      { type: "review", minutes: 13 },
      { type: "test", skillCode: "grammar_participle", minutes: 25, notes: "15 題" },
      { type: "reflect", minutes: 5 },
    ],
  },
  {
    dayNumber: 16,
    dayType: "A",
    primarySkillCode: "grammar_noun_clause",
    headlineZh: "Day 16 — Noun Clause LEARN ⭐",
    activities: [
      { type: "warmup", minutes: 2 },
      { type: "review", minutes: 8 },
      { type: "learn", skillCode: "grammar_noun_clause", minutes: 20, notes: "that/whether/if/what/how/why 引導；做主語/受詞/補語" },
      { type: "practice", skillCode: "grammar_noun_clause", minutes: 12, notes: "8 題" },
      { type: "reflect", minutes: 3 },
    ],
  },
  {
    dayNumber: 17,
    dayType: "B",
    primarySkillCode: "grammar_noun_clause",
    headlineZh: "Day 17 — Noun Clause 深化 + 抽象溝通詞",
    activities: [
      { type: "warmup", minutes: 2 },
      { type: "review", minutes: 5 },
      { type: "practice", skillCode: "grammar_noun_clause", minutes: 18, notes: "12 題" },
      { type: "learn", skillCode: "vocab_communication", minutes: 15, notes: "6 詞：anecdote/interpretation/terminology/nuance/implication/rationale" },
      { type: "reflect", minutes: 5 },
    ],
  },
  {
    dayNumber: 18,
    dayType: "C",
    primarySkillCode: null,
    headlineZh: "Day 18 — 混合閱讀 ⭐ 首次長文",
    activities: [
      { type: "warmup", minutes: 3 },
      { type: "review", minutes: 5 },
      { type: "mixed_reading", minutes: 25, notes: "Part 7 單篇短文 1 篇（4-5 題）；商務 email 或公告" },
      { type: "reflect", minutes: 12, notes: "「讀唔明」vs「讀得明但選錯」區分" },
    ],
  },
  {
    dayNumber: 19,
    dayType: "D",
    primarySkillCode: "grammar_noun_clause",
    headlineZh: "Day 19 — Noun Clause TEST + Past Perfect LEARN",
    activities: [
      { type: "test", skillCode: "grammar_noun_clause", minutes: 20, notes: "15 題" },
      { type: "learn", skillCode: "grammar_past_perfect", minutes: 22, notes: "by the time / before + had + p.p.；半導體診斷例" },
      { type: "reflect", minutes: 3 },
    ],
  },
  {
    dayNumber: 20,
    dayType: "A",
    primarySkillCode: "grammar_past_perfect",
    headlineZh: "Day 20 — Past Perfect PRACTICE + 可數名詞 LEARN",
    activities: [
      { type: "warmup", minutes: 2 },
      { type: "practice", skillCode: "grammar_past_perfect", minutes: 13, notes: "8 題" },
      { type: "learn", skillCode: "grammar_nouns_count", minutes: 20, notes: "information/equipment/advice/machinery 不可數；criteria/phenomena 複數" },
      { type: "learn", skillCode: "vocab_environment", minutes: 10, notes: "再 4 個環境詞" },
    ],
  },
  {
    dayNumber: 21,
    dayType: "B",
    primarySkillCode: "grammar_nouns_count",
    headlineZh: "Day 21 — 可數名詞深化 + 週結（Week 3 report）",
    activities: [
      { type: "warmup", minutes: 2 },
      { type: "review", minutes: 5 },
      { type: "practice", skillCode: "grammar_nouns_count", minutes: 18, notes: "12 題" },
      { type: "practice", skillCode: "grammar_past_perfect", minutes: 10, notes: "5 題鞏固" },
      { type: "reflect", minutes: 10, notes: "Week 3 report + 模擬 TOEIC 估分（誠實：565-590）" },
    ],
  },
];

// ─────────────────────────────────────────────
//  WEEK 4 (Day 22-30) — 整合驗收 + 錯題鞏固 + 模考
// ─────────────────────────────────────────────
const WEEK4: DailyPlanTemplate[] = [
  {
    dayNumber: 22,
    dayType: "D",
    primarySkillCode: null,
    headlineZh: "Day 22 — Past Perfect + 可數名詞雙 TEST",
    activities: [
      { type: "test", skillCode: "grammar_past_perfect", minutes: 20, notes: "10 題" },
      { type: "test", skillCode: "grammar_nouns_count", minutes: 22, notes: "10 題" },
      { type: "reflect", minutes: 3 },
    ],
  },
  {
    dayNumber: 23,
    dayType: "A",
    primarySkillCode: "grammar_preposition",
    headlineZh: "Day 23 — 介詞搭配 + 連接詞",
    activities: [
      { type: "warmup", minutes: 2 },
      { type: "learn", skillCode: "grammar_preposition", minutes: 12, notes: "dependent on/equivalent to/familiar with/consistent with/responsible for/capable of" },
      { type: "learn", skillCode: "grammar_conjunction", minutes: 11, notes: "because/although/despite/given 對比" },
      { type: "practice", skillCode: "grammar_preposition", minutes: 8, notes: "5 題" },
      { type: "practice", skillCode: "grammar_conjunction", minutes: 8, notes: "5 題" },
      { type: "reflect", minutes: 4 },
    ],
  },
  {
    dayNumber: 24,
    dayType: "B",
    primarySkillCode: "grammar_present_perfect",
    headlineZh: "Day 24 — Present Perfect + 錯題回顧",
    activities: [
      { type: "warmup", minutes: 2 },
      { type: "learn", skillCode: "grammar_present_perfect", minutes: 15, notes: "since/for/over the past.../already/yet/recently" },
      { type: "practice", skillCode: "grammar_present_perfect", minutes: 10, notes: "5 題" },
      { type: "review", minutes: 15, notes: "過去 3 週最多錯嘅 10 條重做" },
      { type: "reflect", minutes: 3 },
    ],
  },
  {
    dayNumber: 25,
    dayType: "C",
    primarySkillCode: null,
    headlineZh: "Day 25 — Part 7 雙篇 ⭐",
    activities: [
      { type: "warmup", minutes: 3 },
      { type: "review", minutes: 5 },
      { type: "mixed_reading", minutes: 22, notes: "1 組雙篇（5-6 題），email chain 或 notice + reply，嚴格 18 分鐘內" },
      { type: "reflect", minutes: 15, notes: "速度 vs 準確率平衡" },
    ],
  },
  {
    dayNumber: 26,
    dayType: "D",
    primarySkillCode: null,
    isCheckpoint: true,
    headlineZh: "Day 26 — Mini Mock (Part 5+6 × 40 題) ⭐⭐⭐",
    activities: [
      { type: "mixed_mock", minutes: 25, notes: "Part 5 (30) + Part 6 (10) = 40 題；30 日最關鍵評估" },
      { type: "reflect", minutes: 20, notes: "正確率分流：≥60% 續計劃 / 55-60% Day27-28 錯題重練 / <55% 延長至 60 日" },
    ],
  },
  {
    dayNumber: 27,
    dayType: "A",
    primarySkillCode: null,
    headlineZh: "Day 27 — 依 Day 26 結果分支",
    activities: [
      { type: "learn", skillCode: "grammar_svoc", minutes: 20, notes: "情境 A（mini mock ≥60%）：SVOC 句型 LEARN" },
      { type: "practice", minutes: 20, notes: "情境 B/C：Day 26 錯題全部重做，或返回最弱 topic 重做 LEARN" },
      { type: "reflect", minutes: 5 },
    ],
  },
  {
    dayNumber: 28,
    dayType: "B",
    primarySkillCode: null,
    headlineZh: "Day 28 — Mini mock 錯題深度分析",
    activities: [
      { type: "reflect", minutes: 25, notes: "Day 26 錯題分類：粗心 / 規則忘記 / 概念錯 / 形近詞混淆" },
      { type: "review", minutes: 15, notes: "FSRS 鞏固錯題卡" },
      { type: "reflect", minutes: 5, notes: "Week 5 重點整理（若繼續）" },
    ],
  },
  {
    dayNumber: 29,
    dayType: "special",
    primarySkillCode: null,
    isCheckpoint: true,
    headlineZh: "Day 29 — 終極模考 (Part 5+6+7 × 56 題) ⭐⭐⭐",
    activities: [
      { type: "mixed_mock", minutes: 40, notes: "Part 5 (30) + Part 6 (16) + Part 7 mini (10) = 56 題，40 分鐘" },
      { type: "reflect", minutes: 5, notes: "Baseline 對比、計算 30 日成長" },
    ],
  },
  {
    dayNumber: 30,
    dayType: "special",
    primarySkillCode: null,
    isCheckpoint: true,
    headlineZh: "Day 30 — 30 日總結 ⭐",
    activities: [
      { type: "reflect", minutes: 5, notes: "Day 29 錯題簡評" },
      { type: "reflect", minutes: 15, notes: "對比 Day 1：整體正確率變化 / 強項 / 弱項 / 速度 / 信心" },
      { type: "reflect", minutes: 20, notes: "系統生成 30 日完整報告" },
      { type: "reflect", minutes: 5, notes: "寫下未來 30 日三個目標" },
    ],
  },
];

export const THIRTY_DAY_PLAN_TEMPLATE: DailyPlanTemplate[] = [
  ...WEEK1,
  ...WEEK2,
  ...WEEK3,
  ...WEEK4,
];

if (THIRTY_DAY_PLAN_TEMPLATE.length !== 30) {
  throw new Error(
    `THIRTY_DAY_PLAN_TEMPLATE expected 30 days, got ${THIRTY_DAY_PLAN_TEMPLATE.length}`,
  );
}

/** Skill codes that appear in the 30-day plan (used for StudyPlan.plannedSkillsJson). */
export const PLANNED_SKILL_CODES: readonly string[] = [
  "grammar_svc",
  "grammar_svoo",
  "grammar_gerund",
  "grammar_participle",
  "grammar_noun_clause",
  "grammar_past_perfect",
  "grammar_present_perfect",
  "grammar_nouns_count",
  "grammar_preposition",
  "grammar_conjunction",
  "vocab_medical",
  "vocab_daily_life",
  "vocab_environment",
  "vocab_communication",
  // vocab_false_friends intentionally reserved — woven through across many days
  // grammar_svoc is conditional (Day 27 情境 A) — kept out of the deterministic planned set
];
