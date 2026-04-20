/**
 * Deterministic fallbacks when LLM is unavailable, invalid, or schema validation fails.
 * Progression (pass/fail, stages, FSRS, learning-path order) must never depend on these strings alone — only on code elsewhere.
 */
import type { WrongAnswerExplanationInput } from "./haiku-explain";
import type { CheckpointFeedbackOutput, GuidedHintOutput, WeeklyStudyPlanOutput } from "./types";

export type WeeklyReportContextLike = {
  windowStart: string;
  windowEnd: string;
  summary: {
    completedSessionCount: number;
    totalQuestionsAnswered: number;
    totalCorrectAnswers: number;
    accuracy: number;
  };
  answerHistorySummary: {
    totalRows: number;
    wrongAnswers: number;
    correctAnswers: number;
  };
  topicBreakdown: Array<{
    topic: string;
    totalAnswered: number;
    correctCount: number;
    accuracy: number;
  }>;
};

/** Fixed-structure weekly report (Traditional Chinese) — safe when Gemini fails or markdown drifts. */
export function buildDeterministicWeeklyCoachingReport(ctx: WeeklyReportContextLike): string {
  const topTopics = ctx.topicBreakdown.slice(0, 3);
  const weaknessLines = topTopics.map(
    (t, i) => `${i + 1}. ${t.topic}：答 ${t.totalAnswered} 題，正確率約 ${t.accuracy}%`,
  );

  return [
    "## 📈 本週進展",
    `- 近 7 日完成場次：${ctx.summary.completedSessionCount}`,
    `- 作答筆數：${ctx.summary.totalQuestionsAnswered}，整體正確率約 ${ctx.summary.accuracy}%`,
    "",
    "## 🎯 3 個弱點",
    weaknessLines.length > 0 ? weaknessLines.join("\n") : "（資料不足，請持續練習以累積主題分布。）",
    "",
    "## 🧮 TOEIC 估分",
    "此段為依練習正確率做的**粗略估計，非官方預測**；正式成績仍以實際考試為準。",
    `- 參考區間：請搭配主題與難度分布解讀，勿單看單一數字。`,
    "",
    "## 🗓️ 下週 3 個行動項",
    "1. 延續弱點主題的短時段練習。",
    "2. 檢視錯題解析並記錄誤因類型。",
    "3. 維持固定頻率，避免長時間中斷。",
    "",
    "## 🔥 Productive-failure 鼓勵",
    "錯題是調整策略的訊號；把每次錯誤當成下一次答對的步驟。此段為系統預設教練語（LLM 週報暫不可用時顯示）。",
  ].join("\n");
}

export function buildWrongAnswerExplanationFallback(input: WrongAnswerExplanationInput): string {
  const snap = input.explanationSnapshot?.trim();
  if (snap) {
    return [
      "【題庫解析】",
      snap,
      "",
      "——",
      "（即時 AI 說明暫時無法產生；以上為題庫附帶解析。）",
    ].join("\n");
  }

  return [
    `正確答案為選項 ${input.correctAnswer}。`,
    `請比對題幹與各選項，檢查詞性、時態與搭配是否合理。`,
    "",
    "（即時 AI 說明暫時無法產生；請優先參考題庫解析或課程內容。）",
  ].join("\n");
}

export function buildGuidedHintFallback(explanationZh: string | undefined): GuidedHintOutput {
  const parts = (explanationZh ?? "")
    .split(/[。．\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    hintLevel1: parts[0]?.slice(0, 200) || "先看題幹與空格位置，確認缺的是名詞、動詞還是修飾語。",
    hintLevel2: parts[1]?.slice(0, 240) || "刪去明顯不合語意或文法不符的選項。",
    hintLevel3: parts[2]?.slice(0, 280) || "在剩下選項中比較搭配與語氣，選最符合上下文者。",
    doNotRevealAnswerYet: true,
  };
}

/** Coach copy only — `advanceAllowed` must mirror deterministic checkpoint pass, not LLM opinion. */
export function buildCheckpointFeedbackFallback(params: {
  passed: boolean;
  topicAccuracy: number;
  overallAccuracy: number;
}): CheckpointFeedbackOutput {
  const { passed, topicAccuracy, overallAccuracy } = params;
  return {
    resultLabel: passed ? "pass" : topicAccuracy >= 0.65 ? "borderline" : "retry",
    skillsToReview: [],
    retryPlan: passed ? [] : ["複習錯題所屬主題", "完成一輪練習後再測"],
    advanceAllowed: passed,
    coachMessageZh: passed
      ? `本次測驗通過（主題正確率約 ${Math.round(topicAccuracy * 100)}%，整體約 ${Math.round(overallAccuracy * 100)}%）。此為系統固定摘要（LLM 教練暫不可用）。`
      : `尚未達通過門檻（主題約 ${Math.round(topicAccuracy * 100)}%，整體約 ${Math.round(overallAccuracy * 100)}%）。請依錯題複習後再試。此為系統固定摘要（LLM 教練暫不可用）。`,
  };
}

export function buildWeeklyStudyPlanFallback(): WeeklyStudyPlanOutput {
  return {
    recommendedModuleKey: "phase1",
    reviewBlockZh: "（系統預設）先清 FSRS 到期卡，維持每日固定複習量。",
    drillBlockZh: "（系統預設）依弱點主題完成一輪練習。",
    checkpointReadinessZh: "（系統預設）完成練習並達標後再預約測驗。",
    weeklyTargetZh: "（系統預設）維持每週至少數次短時段學習。",
  };
}
