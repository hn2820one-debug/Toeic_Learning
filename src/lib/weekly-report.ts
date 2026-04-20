import "server-only";

import { getAnalysisPageData } from "@/lib/analysis";

export type DeterministicWeeklyReport = {
  generatedAt: string;
  sectionOverview: string;
  sectionWeaknesses: string[];
  topRoiTopic: string;
  sectionNextWeekActions: string[];
  nextAction: string;
};

export async function getDeterministicWeeklyReport(): Promise<DeterministicWeeklyReport> {
  const analysis = await getAnalysisPageData();
  const weekly = analysis.weekly;

  const sectionOverview = `近 7 日完成 ${weekly.overview7d.completedSessions} 場，作答 ${weekly.overview7d.totalQuestions} 題，正確率 ${weekly.overview7d.accuracy}%。`;
  const sectionWeaknesses =
    weekly.topWeaknesses.length > 0
      ? weekly.topWeaknesses.map(
          (w, idx) => `${idx + 1}. ${w.topic}：錯 ${w.wrongCount} / ${w.answered}，正確率 ${w.accuracy}%，建議 ${w.recommendation.toUpperCase()}`,
        )
      : ["目前資料不足，先完成更多作答再重新排名弱點。"];

  const topRoiTopic = weekly.topRoiTopic
    ? `${weekly.topRoiTopic.topic}（錯題 ${weekly.topRoiTopic.wrongCount}，建議 ${weekly.topRoiTopic.recommendation.toUpperCase()}）`
    : "尚無明確 ROI topic（資料不足）";

  const nextAction = weekly.nextActions.primaryTask
    ? `${weekly.nextActions.primaryTask.type.toUpperCase()} · ${weekly.nextActions.primaryTask.reasonZh}`
    : "先完成一個學習任務以累積可分析資料。";

  return {
    generatedAt: weekly.generatedAt,
    sectionOverview,
    sectionWeaknesses,
    topRoiTopic,
    sectionNextWeekActions: weekly.weeklyTodos,
    nextAction,
  };
}

