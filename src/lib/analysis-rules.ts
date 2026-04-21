import type { ComposedLearningTask } from "@/lib/learning-path.types";

export type AnalysisWindowDays = 7 | 30;

export type RawAnsweredRow = {
  id: number;
  answeredAt: Date;
  sessionEndedAt: Date | null;
  topic: string;
  topicKey: string | null;
  stemSnapshot: string;
  correctAnswerSnapshot: string;
  selectedAnswer: string;
  isCorrect: boolean;
  explanationSnapshot: string | null;
};

export type RawTimedBehavior = {
  mode: "test" | "review";
  timedOut: boolean;
  timeTakenSec: number | null;
};

export type RecentLearningStats = {
  windowDays: AnalysisWindowDays;
  completedSessions: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number;
  timeoutCount: number;
  slowAnswerCount: number;
  reviewCompletedCount: number;
  dueBacklog: number;
  /** From closed-loop items: 快而準 / 答對但未熟 / 未掌握 — see `analytics/hesitation`. */
  masteryFluent: number;
  masteryHesitant: number;
  masteryStruggling: number;
};

export type WeakTopicRecommendation = "practice" | "test" | "review";

export type RepresentativeWrongAnswer = {
  answerHistoryId: number;
  answeredAt: string;
  topic: string;
  topicKey: string | null;
  questionTextSnapshot: string;
  correctAnswerSnapshot: string;
  userChoice: string;
  explanationSnapshot: string | null;
};

export type WeakTopic = {
  topic: string;
  topicKey: string | null;
  answered: number;
  wrongCount: number;
  accuracy: number;
  weightedScore: number;
  recommendation: WeakTopicRecommendation;
  recommendationReason: string;
  representatives: RepresentativeWrongAnswer[];
};

export type ErrorPatternType =
  | "concept_misunderstanding"
  | "rushing_or_timeout"
  | "repeated_confusion_same_topic"
  | "false_friends_or_distractor_bias";

export type ErrorPattern = {
  type: ErrorPatternType;
  count: number;
  detail: string;
};

export type AnalysisNextAction = {
  primaryTask: ComposedLearningTask | null;
  topRoiTopic: WeakTopic | null;
  suggestedFollowups: ComposedLearningTask[];
  narrativeZh: string;
};

function pct(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }
  return Math.round((numerator / denominator) * 100);
}

function isSlow(mode: "test" | "review", sec: number | null) {
  if (sec == null || !Number.isFinite(sec)) {
    return false;
  }
  return mode === "test" ? sec >= 24 : sec >= 36;
}

export function aggregateRecentLearningStats(input: {
  windowDays: AnalysisWindowDays;
  sessions: Array<{ id: string | number; endedAt: Date | null }>;
  answers: RawAnsweredRow[];
  timedBehaviors: RawTimedBehavior[];
  dueBacklog: number;
}): RecentLearningStats {
  const completedSessions = input.sessions.filter((s) => s.endedAt != null).length;
  const totalQuestions = input.answers.length;
  const correctAnswers = input.answers.filter((a) => a.isCorrect).length;
  const wrongAnswers = Math.max(0, totalQuestions - correctAnswers);

  const timeoutCount = input.timedBehaviors.filter((b) => b.timedOut).length;
  const slowAnswerCount = input.timedBehaviors.filter((b) => isSlow(b.mode, b.timeTakenSec)).length;
  const reviewCompletedCount = input.sessions.filter((s) => s.endedAt != null).length;

  return {
    windowDays: input.windowDays,
    completedSessions,
    totalQuestions,
    correctAnswers,
    wrongAnswers,
    accuracy: pct(correctAnswers, totalQuestions),
    timeoutCount,
    slowAnswerCount,
    reviewCompletedCount,
    dueBacklog: input.dueBacklog,
    masteryFluent: 0,
    masteryHesitant: 0,
    masteryStruggling: 0,
  };
}

export function rankWeakTopics(input: {
  answers: RawAnsweredRow[];
  topicRecommendationByKey?: Record<string, WeakTopicRecommendation>;
  topN?: number;
}): WeakTopic[] {
  const topN = input.topN ?? 5;
  const byTopic = new Map<string, { key: string | null; rows: RawAnsweredRow[] }>();

  for (const row of input.answers) {
    const key = row.topic.trim() || "Unknown";
    const slot = byTopic.get(key) ?? { key: row.topicKey, rows: [] };
    slot.rows.push(row);
    byTopic.set(key, slot);
  }

  const scored: WeakTopic[] = [];
  for (const [topic, slot] of byTopic.entries()) {
    const answered = slot.rows.length;
    if (answered < 2) {
      continue;
    }
    const wrongCount = slot.rows.filter((r) => !r.isCorrect).length;
    const correctCount = answered - wrongCount;
    const accuracy = pct(correctCount, answered);
    const weightedScore = wrongCount * 100 + Math.max(0, 80 - accuracy) * 3 + Math.min(answered, 12);
    const recommendation =
      (slot.key && input.topicRecommendationByKey?.[slot.key]) || (accuracy <= 65 ? "practice" : "test");
    const recommendationReason =
      recommendation === "practice"
        ? `近期在 ${topic} 錯題較集中，先補 PRACTICE。`
        : recommendation === "test"
          ? `${topic} 正確率回升，可用 TEST 驗收是否穩定。`
          : `${topic} 建議先清理 REVIEW 佇列。`;

    const representatives = slot.rows
      .filter((r) => !r.isCorrect)
      .sort((a, b) => b.answeredAt.getTime() - a.answeredAt.getTime())
      .slice(0, 3)
      .map<RepresentativeWrongAnswer>((r) => ({
        answerHistoryId: r.id,
        answeredAt: r.answeredAt.toISOString(),
        topic,
        topicKey: r.topicKey,
        questionTextSnapshot: r.stemSnapshot,
        correctAnswerSnapshot: r.correctAnswerSnapshot,
        userChoice: r.selectedAnswer,
        explanationSnapshot: r.explanationSnapshot,
      }));

    scored.push({
      topic,
      topicKey: slot.key,
      answered,
      wrongCount,
      accuracy,
      weightedScore,
      recommendation,
      recommendationReason,
      representatives,
    });
  }

  return scored.sort((a, b) => b.weightedScore - a.weightedScore).slice(0, topN);
}

export function classifyErrorPatterns(input: {
  answers: RawAnsweredRow[];
  timedBehaviors: RawTimedBehavior[];
}): ErrorPattern[] {
  const patterns: ErrorPattern[] = [];
  const wrongRows = input.answers.filter((a) => !a.isCorrect);
  const timeoutCount = input.timedBehaviors.filter((b) => b.timedOut).length;
  const slowCount = input.timedBehaviors.filter((b) => isSlow(b.mode, b.timeTakenSec)).length;

  const topicMap = new Map<string, { total: number; wrong: number; sessions: Set<string> }>();
  for (const row of input.answers) {
    const topic = row.topic || "Unknown";
    const slot = topicMap.get(topic) ?? { total: 0, wrong: 0, sessions: new Set<string>() };
    slot.total += 1;
    if (!row.isCorrect) {
      slot.wrong += 1;
    }
    slot.sessions.add(row.sessionEndedAt ? row.sessionEndedAt.toISOString() : `ah-${row.id}`);
    topicMap.set(topic, slot);
  }

  const conceptTopics = [...topicMap.entries()].filter(([, v]) => v.total >= 4 && pct(v.total - v.wrong, v.total) <= 50);
  if (conceptTopics.length > 0) {
    patterns.push({
      type: "concept_misunderstanding",
      count: conceptTopics.length,
      detail: `有 ${conceptTopics.length} 個主題近況正確率 <= 50%，屬於概念未穩定。`,
    });
  }

  if (timeoutCount >= 2 || slowCount >= 5) {
    patterns.push({
      type: "rushing_or_timeout",
      count: timeoutCount + slowCount,
      detail: `超時 ${timeoutCount} 次、慢答 ${slowCount} 次，建議先調整節奏。`,
    });
  }

  const repeatedTopics = [...topicMap.entries()].filter(([, v]) => v.wrong >= 4 && v.sessions.size >= 2);
  if (repeatedTopics.length > 0) {
    patterns.push({
      type: "repeated_confusion_same_topic",
      count: repeatedTopics.length,
      detail: `有 ${repeatedTopics.length} 個主題在多場次反覆出錯。`,
    });
  }

  const wrongByChoice = new Map<string, Set<string>>();
  for (const row of wrongRows) {
    const choice = row.selectedAnswer;
    const slot = wrongByChoice.get(choice) ?? new Set<string>();
    slot.add(row.correctAnswerSnapshot);
    wrongByChoice.set(choice, slot);
  }
  const distractorBias = [...wrongByChoice.entries()].find(([, corrects]) => corrects.size >= 3);
  if (distractorBias) {
    patterns.push({
      type: "false_friends_or_distractor_bias",
      count: distractorBias[1].size,
      detail: `錯誤選項偏向同一種誘答（例如常選 ${distractorBias[0]}）。`,
    });
  }

  return patterns;
}

export function recommendNextActionsFromAnalysis(input: {
  learningPathTasks: ComposedLearningTask[];
  weakTopics: WeakTopic[];
  stats7d: RecentLearningStats;
}): AnalysisNextAction {
  const primaryTask = input.learningPathTasks[0] ?? null;
  const topRoiTopic = input.weakTopics[0] ?? null;

  const suggestedFollowups: ComposedLearningTask[] = [];
  if (input.learningPathTasks.length > 1) {
    suggestedFollowups.push(input.learningPathTasks[1]!);
  }
  if (input.learningPathTasks.length > 2) {
    suggestedFollowups.push(input.learningPathTasks[2]!);
  }

  let narrativeZh = "目前沒有足夠資料，先完成一次學習任務再回來看分析。";
  if (primaryTask) {
    narrativeZh = `下一步建議先做 ${primaryTask.type.toUpperCase()}：${primaryTask.reason}`;
  }
  if (input.stats7d.dueBacklog >= 15) {
    narrativeZh = `目前 review backlog 約 ${input.stats7d.dueBacklog}，今天優先清 REVIEW，避免到期卡繼續堆積。`;
  } else if (topRoiTopic) {
    narrativeZh = `你最近在 ${topRoiTopic.topic} 連續錯 ${topRoiTopic.wrongCount} 題，建議先做 ${topRoiTopic.recommendation.toUpperCase()}。`;
  }

  return {
    primaryTask,
    topRoiTopic,
    suggestedFollowups,
    narrativeZh,
  };
}

export type WeeklyReportDeterministicData = {
  generatedAt: string;
  overview7d: RecentLearningStats;
  overview30d: RecentLearningStats;
  topWeaknesses: WeakTopic[];
  topRoiTopic: WeakTopic | null;
  nextActions: AnalysisNextAction;
  weeklyTodos: string[];
};

export function buildWeeklyReportData(input: {
  stats7d: RecentLearningStats;
  stats30d: RecentLearningStats;
  weakTopics: WeakTopic[];
  nextActions: AnalysisNextAction;
}): WeeklyReportDeterministicData {
  const topWeaknesses = input.weakTopics.slice(0, 3);
  const topRoiTopic = topWeaknesses[0] ?? null;
  const weeklyTodos: string[] = [];

  if (topRoiTopic) {
    weeklyTodos.push(`優先補強 ${topRoiTopic.topic}，先做 ${topRoiTopic.recommendation.toUpperCase()}。`);
  }
  if (input.stats7d.dueBacklog > 0) {
    weeklyTodos.push(`每天先清 FSRS 到期卡（目前 backlog: ${input.stats7d.dueBacklog}）。`);
  }
  if (input.stats7d.timeoutCount > 0) {
    weeklyTodos.push("把答題節奏放慢，避免 timeout；先求穩定再求速度。");
  }
  while (weeklyTodos.length < 3) {
    weeklyTodos.push("維持固定短時段練習，並回看本週代表性錯題。");
  }

  return {
    generatedAt: new Date().toISOString(),
    overview7d: input.stats7d,
    overview30d: input.stats30d,
    topWeaknesses,
    topRoiTopic,
    nextActions: input.nextActions,
    weeklyTodos: weeklyTodos.slice(0, 3),
  };
}
