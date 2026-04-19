import { prisma } from "@/lib/prisma";
import { BookOpen, Target, TrendingUp, Calendar } from "lucide-react";

async function getStats() {
  const [totalItems, dueReview, totalSessions, latestScore] = await Promise.all([
    prisma.learningItem.count({ where: { isValid: true } }),
    prisma.learningItem.count({
      where: {
        isValid: true,
        nextReview: { lte: new Date() },
      },
    }),
    prisma.dailySession.count(),
    prisma.scoreHistory.findFirst({ orderBy: { date: "desc" } }),
  ]);
  return { totalItems, dueReview, totalSessions, latestScore };
}

export default async function DashboardPage() {
  const { totalItems, dueReview, totalSessions, latestScore } = await getStats();

  const cards = [
    {
      label: "Total Learning Items",
      value: totalItems,
      icon: BookOpen,
      color: "bg-blue-500",
    },
    {
      label: "Due for Review",
      value: dueReview,
      icon: Calendar,
      color: "bg-orange-500",
    },
    {
      label: "Sessions Completed",
      value: totalSessions,
      icon: TrendingUp,
      color: "bg-green-500",
    },
    {
      label: "Latest Score",
      value: latestScore ? latestScore.total : "—",
      icon: Target,
      color: "bg-purple-500",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-1">Welcome back, Keith. Keep pushing to 750+.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Score History</h3>
          {latestScore ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Listening</span>
                <span className="font-medium">{latestScore.listening}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Reading</span>
                <span className="font-medium">{latestScore.reading}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2 mt-2">
                <span className="text-gray-700 font-semibold">Total</span>
                <span className="font-bold text-blue-600">{latestScore.total}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No scores recorded yet.</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Start</h3>
          <div className="space-y-3">
            <a
              href="/training"
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              Start Today&apos;s Session
            </a>
            <a
              href="/import"
              className="block w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-lg transition-colors"
            >
              Import Questions
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
