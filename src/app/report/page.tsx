import { getWeeklyReportData } from "@/lib/report";

export const dynamic = "force-dynamic";

function formatTimestamp(value: Date) {
  return value.toLocaleString("en-US", {
    hour12: false,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ReportPage() {
  const report = await getWeeklyReportData();

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Weekly Report</h2>
      <p className="text-gray-500 mb-8">A rolling 7-day summary built from completed training sessions only.</p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 mb-2">Report Window</p>
        <p className="text-sm text-gray-700 mb-2">
          Completed sessions with endedAt between {formatTimestamp(report.windowStart)} and {formatTimestamp(report.windowEnd)} are included.
        </p>
        <p className="text-sm text-gray-500">
          Summary totals come from StudySession fields. Topic breakdown comes from AnswerHistory rows for the same completed sessions.
        </p>
      </div>

      {!report.hasData ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
          <p className="text-lg font-medium text-gray-700 mb-2">No completed training sessions in the last 7 days.</p>
          <p className="text-sm">Finish a training run and it will appear in the next weekly report automatically.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 mb-1">Weekly Summary</p>
                <h3 className="text-xl font-semibold text-gray-900">Most recent 7 days</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-xl bg-gray-50 px-4 py-4">
                <p className="text-sm text-gray-500 mb-1">Completed Sessions</p>
                <p className="text-2xl font-semibold text-gray-900">{report.summary.completedSessionCount}</p>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-4">
                <p className="text-sm text-gray-500 mb-1">Questions Answered</p>
                <p className="text-2xl font-semibold text-gray-900">{report.summary.totalQuestionsAnswered}</p>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-4">
                <p className="text-sm text-gray-500 mb-1">Correct Answers</p>
                <p className="text-2xl font-semibold text-gray-900">{report.summary.totalCorrectAnswers}</p>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-4">
                <p className="text-sm text-gray-500 mb-1">Overall Accuracy</p>
                <p className="text-2xl font-semibold text-gray-900">{report.summary.accuracy}%</p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 mb-1">Topic Breakdown</p>
              <h3 className="text-xl font-semibold text-gray-900">Answer accuracy by topic</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="px-0 py-3 font-medium">Topic</th>
                    <th className="px-4 py-3 font-medium text-right">Answered</th>
                    <th className="px-4 py-3 font-medium text-right">Correct</th>
                    <th className="px-0 py-3 font-medium text-right">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topicBreakdown.map((topic) => (
                    <tr key={topic.topic} className="border-b border-gray-100 last:border-b-0 text-gray-700">
                      <td className="px-0 py-4 font-medium text-gray-900">{topic.topic}</td>
                      <td className="px-4 py-4 text-right">{topic.totalAnswered}</td>
                      <td className="px-4 py-4 text-right">{topic.correctCount}</td>
                      <td className="px-0 py-4 text-right font-semibold text-gray-900">{topic.accuracy}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
