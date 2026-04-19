import DueHeatmap from "@/components/dashboard/DueHeatmap";
import GrammarMasteryGrid from "@/components/dashboard/GrammarMasteryGrid";
import TopicMasteryGrid from "@/components/dashboard/TopicMasteryGrid";
import AppCard from "@/components/ui/AppCard";
import BilingualHeading from "@/components/ui/BilingualHeading";
import { getDashboardData } from "@/lib/dashboard";
import {
  BookOpen,
  Target,
  TrendingUp,
  Calendar,
  Clock,
  Layers,
  Gauge,
  BookMarked,
  Activity,
} from "lucide-react";

export const dynamic = "force-dynamic";

type StatCard = {
  labelZh: string;
  labelEn: string;
  value: string | number;
  icon: typeof BookOpen;
  color: string;
  hintZh?: string;
  hintEn?: string;
  hintSecondary?: string;
};

export default async function DashboardPage() {
  const {
    questionBankCount,
    completedSessionCount,
    activeSessionCount,
    totalAnswerCount,
    recentAnswerCount,
    recentAccuracy,
    recentSessions,
    dueReviewCount,
    newCardsRemainingToday,
    newCardsDailyCap,
    userGlobalElo,
    userGlobalEloDeltaLabel,
    estimatedReadingDisplay,
    estimatedReadingSubtext,
    llmCallsThisMonth,
  } = await getDashboardData();

  const cards: StatCard[] = [
    {
      labelZh: "題庫",
      labelEn: "Question Bank",
      value: questionBankCount,
      icon: BookOpen,
      color: "bg-blue-500",
    },
    {
      labelZh: "已完成場次",
      labelEn: "Completed sessions",
      value: completedSessionCount,
      icon: Calendar,
      color: "bg-orange-500",
    },
    {
      labelZh: "七日正確率",
      labelEn: "7-day accuracy",
      value: recentAnswerCount > 0 && recentAccuracy !== null ? `${recentAccuracy}%` : "—",
      icon: TrendingUp,
      color: "bg-green-500",
    },
    {
      labelZh: "答題紀錄",
      labelEn: "Answers logged",
      value: totalAnswerCount,
      icon: Target,
      color: "bg-purple-500",
    },
  ];

  const learningCards: StatCard[] = [
    {
      labelZh: "今日待複習",
      labelEn: "Due cards today",
      value: dueReviewCount,
      icon: Clock,
      color: "bg-rose-500",
      hintZh: "依 FSRS 到期",
      hintEn: "Due for review",
    },
    {
      labelZh: "今日新卡剩餘",
      labelEn: "New cards left today",
      value: `${newCardsRemainingToday} / ${newCardsDailyCap}`,
      icon: Layers,
      color: "bg-cyan-600",
      hintZh: "每日上限內",
      hintEn: "Within daily cap",
    },
    {
      labelZh: "全域 ELO",
      labelEn: "User global ELO",
      value: userGlobalElo !== null ? Math.round(userGlobalElo * 10) / 10 : "—",
      icon: Gauge,
      color: "bg-indigo-600",
      hintZh: "能力參考值",
      hintEn: "TOEIC skill proxy",
      hintSecondary: userGlobalEloDeltaLabel,
    },
    {
      labelZh: "閱讀估分",
      labelEn: "Est. TOEIC Reading",
      value: estimatedReadingDisplay,
      icon: BookMarked,
      color: "bg-teal-600",
      hintZh: estimatedReadingSubtext ?? "",
      hintEn: "",
    },
    {
      labelZh: "本月 LLM 次數",
      labelEn: "LLM calls this month",
      value: llmCallsThisMonth,
      icon: Activity,
      color: "bg-slate-600",
      hintZh: "費用試算中 · 非帳單",
      hintEn: "Cost estimate — not billing",
    },
  ];

  return (
    <div>
      <BilingualHeading
        titleZh="儀表板"
        titleEn="Dashboard"
        descriptionZh="檢視題庫、訓練與複習摘要，以及最近完成的場次。"
        descriptionEn="Overview of your TOEIC training data, review signals, and recent sessions."
      />

      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ labelZh, labelEn, value, icon: Icon, color }) => (
          <AppCard key={labelZh} padding="md" className="flex items-center gap-4">
            <div className={`${color} rounded-xl p-3 text-white shadow-sm`}>
              <Icon size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-600">{labelZh}</p>
              <p className="text-[11px] text-slate-400">{labelEn}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
            </div>
          </AppCard>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold text-slate-800">學習訊號 · Learning signals</h2>
      <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {learningCards.map(({ labelZh, labelEn, value, icon: Icon, color, hintZh, hintEn, hintSecondary }) => (
          <AppCard key={labelZh} padding="md" className="flex items-start gap-4">
            <div className={`${color} shrink-0 rounded-xl p-3 text-white shadow-sm`}>
              <Icon size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-600">{labelZh}</p>
              <p className="text-[11px] text-slate-400">{labelEn}</p>
              <p className="mt-1 break-words text-2xl font-bold tracking-tight text-slate-900">{value}</p>
              {hintZh || hintEn ? (
                <p className="mt-1 text-xs leading-snug text-slate-500">
                  {hintZh ? <span className="block">{hintZh}</span> : null}
                  {hintEn ? <span className="mt-0.5 block text-[11px] text-slate-400">{hintEn}</span> : null}
                </p>
              ) : null}
              {hintSecondary ? <p className="mt-0.5 text-xs text-slate-400">{hintSecondary}</p> : null}
            </div>
          </AppCard>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AppCard padding="md">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">最近訓練 · Recent sessions</h2>
          {recentSessions.length > 0 ? (
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div key={session.id} className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-900">場次 #{session.id} · Session</p>
                    <p className="text-sm font-semibold text-primary-600">{session.accuracy}%</p>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span>
                      {session.correctCount} / {session.totalQuestions} 正確 · correct
                    </span>
                    <span>{session.endedAt.toLocaleString("en-US", { hour12: false })}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">尚無完成場次 · No completed sessions yet.</p>
          )}
        </AppCard>

        <AppCard padding="md">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">快速開始 · Quick start</h2>
          <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            進行中場次 {activeSessionCount}。七日正確率依最近 {recentAnswerCount} 筆答題計算。
            <span className="mt-1 block text-xs text-slate-500">
              {activeSessionCount} active session(s). Recent accuracy uses answers from the last 7 days.
            </span>
          </div>
          <div className="space-y-3">
            <a
              href="/training"
              className="block w-full rounded-xl bg-primary-600 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
            >
              開始訓練 · Open training
            </a>
            <a
              href="/history"
              className="block w-full rounded-xl border border-slate-200 bg-white py-2.5 text-center text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
            >
              查看紀錄 · History
            </a>
          </div>
        </AppCard>
      </div>

      <div className="mt-10 space-y-6">
        <TopicMasteryGrid />
        <GrammarMasteryGrid />
        <DueHeatmap />
      </div>
    </div>
  );
}
