import { getCompletedStudySessions } from "@/lib/history";

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

export default async function HistoryPage() {
  const sessions = await getCompletedStudySessions();

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">History</h2>
      <p className="text-gray-500 mb-8">Review completed training sessions and the answer trail saved to SQLite.</p>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
          <p className="text-lg font-medium text-gray-700 mb-2">No completed training sessions yet.</p>
          <p className="text-sm">Finish one training run to see it appear in history.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
            {sessions.length} completed session{sessions.length === 1 ? "" : "s"} shown, newest first
          </div>

          {sessions.map((session) => (
            <article key={session.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 mb-2">Completed Session</p>
                  <h3 className="text-xl font-semibold text-gray-900">Session #{session.id}</h3>
                </div>

                <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  {session.answers.length} answer{session.answers.length === 1 ? "" : "s"} recorded
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 mb-6">
                <div className="rounded-xl bg-gray-50 px-4 py-4">
                  <p className="text-sm text-gray-500 mb-1">Total Questions</p>
                  <p className="text-2xl font-semibold text-gray-900">{session.totalQuestions}</p>
                </div>
                <div className="rounded-xl bg-gray-50 px-4 py-4">
                  <p className="text-sm text-gray-500 mb-1">Correct Count</p>
                  <p className="text-2xl font-semibold text-gray-900">{session.correctCount}</p>
                </div>
                <div className="rounded-xl bg-gray-50 px-4 py-4">
                  <p className="text-sm text-gray-500 mb-1">Accuracy</p>
                  <p className="text-2xl font-semibold text-gray-900">{session.accuracy}%</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-6">
                <div className="rounded-xl border border-gray-200 px-4 py-3">
                  <p className="font-medium text-gray-900 mb-1">Started</p>
                  <p>{formatTimestamp(session.startedAt)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 px-4 py-3">
                  <p className="font-medium text-gray-900 mb-1">Ended</p>
                  <p>{formatTimestamp(session.endedAt)}</p>
                </div>
              </div>

              <details className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-900">View Answer Details</summary>

                <div className="mt-4 space-y-4">
                  {session.answers.map((answer, index) => (
                    <div key={answer.id} className="rounded-xl border border-gray-200 bg-white px-4 py-4">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                          Question {index + 1}
                        </span>
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                          {answer.topic}
                        </span>
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                          Difficulty {answer.difficulty}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            answer.isCorrect ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                          }`}
                        >
                          {answer.isCorrect ? "Correct" : "Incorrect"}
                        </span>
                      </div>

                      <p className="text-sm font-medium text-gray-900 leading-6">{answer.questionText}</p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-sm text-gray-600">
                        <div className="rounded-lg bg-gray-50 px-3 py-2">
                          <p className="font-medium text-gray-900 mb-1">Selected Answer</p>
                          <p>{answer.selectedAnswer}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 px-3 py-2">
                          <p className="font-medium text-gray-900 mb-1">Correct Answer</p>
                          <p>{answer.correctAnswer}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 px-3 py-2">
                          <p className="font-medium text-gray-900 mb-1">Recorded At</p>
                          <p>{formatTimestamp(answer.answeredAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
