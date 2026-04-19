import DueHeatmap from "@/components/dashboard/DueHeatmap";
import GrammarMasteryGrid from "@/components/dashboard/GrammarMasteryGrid";
import TopicMasteryGrid from "@/components/dashboard/TopicMasteryGrid";
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
  label: string;
  value: string | number;
  icon: typeof BookOpen;
  color: string;
  hint?: string;
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
      label: "Question Bank",
      value: questionBankCount,
      icon: BookOpen,
      color: "bg-blue-500",
    },
    {
      label: "Completed Sessions",
      value: completedSessionCount,
      icon: Calendar,
      color: "bg-orange-500",
    },
    {
      label: "7-Day Accuracy",
      value: recentAnswerCount > 0 && recentAccuracy !== null ? `${recentAccuracy}%` : "—",
      icon: TrendingUp,
      color: "bg-green-500",
    },
    {
      label: "Answers Logged",
      value: totalAnswerCount,
      icon: Target,
      color: "bg-purple-500",
    },
  ];

  const learningCards: StatCard[] = [
    {
      label: "Due cards today",
      value: dueReviewCount,
      icon: Clock,
      color: "bg-rose-500",
      hint: "Due for review",
    },
    {
      label: "New cards remaining today",
      value: `${newCardsRemainingToday} / ${newCardsDailyCap}`,
      icon: Layers,
      color: "bg-cyan-600",
      hint: "New cards remaining",
    },
    {
      label: "User global ELO",
      value: userGlobalElo !== null ? Math.round(userGlobalElo * 10) / 10 : "—",
      icon: Gauge,
      color: "bg-indigo-600",
      hint: "TOEIC skill proxy",
      hintSecondary: userGlobalEloDeltaLabel,
    },
    {
      label: "Estimated TOEIC Reading",
      value: estimatedReadingDisplay,
      icon: BookMarked,
      color: "bg-teal-600",
      hint: estimatedReadingSubtext,
    },
    {
      label: "LLM calls this month",
      value: llmCallsThisMonth,
      icon: Activity,
      color: "bg-slate-600",
      hint: "Cost estimation pending — not provider billing",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-1">Overview of your active TOEIC training data and recent study activity.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className={`${color} text-white rounded-lg p-3`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <h3 className="text-sm font-semibold text-gray-700 mb-3">Learning signals</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-10">
        {learningCards.map(({ label, value, icon: Icon, color, hint, hintSecondary }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
            <div className={`${color} text-white rounded-lg p-3 shrink-0`}>
              <Icon size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className="text-2xl font-bold text-gray-900 break-words">{value}</p>
              {hint ? <p className="text-xs text-gray-400 mt-1 leading-snug">{hint}</p> : null}
              {hintSecondary ? <p className="text-xs text-gray-400 mt-0.5">{hintSecondary}</p> : null}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Training Sessions</h3>
          {recentSessions.length > 0 ? (
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div key={session.id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900">Session #{session.id}</p>
                    <p className="text-sm font-semibold text-blue-600">{session.accuracy}%</p>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-xs text-gray-500">
                    <span>
                      {session.correctCount} / {session.totalQuestions} correct
                    </span>
                    <span>{session.endedAt.toLocaleString("en-US", { hour12: false })}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No completed study sessions yet.</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Start</h3>
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600 mb-4">
            {activeSessionCount} active session{activeSessionCount === 1 ? "" : "s"} in progress. Recent accuracy is based
            on {recentAnswerCount} answer{recentAnswerCount === 1 ? "" : "s"} from the last 7 days.
          </div>
          <div className="space-y-3">
            <a
              href="/training"
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              Open Training
            </a>
            <a
              href="/history"
              className="block w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-lg transition-colors"
            >
              Review History
            </a>
          </div>
        </div>
      </div>

      <div className="mt-10 space-y-6">
        <TopicMasteryGrid />
        <GrammarMasteryGrid />
        <DueHeatmap />
      </div>
    </div>
  );
}
