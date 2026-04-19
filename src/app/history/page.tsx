import BilingualHeading from "@/components/ui/BilingualHeading";
import AppCard from "@/components/ui/AppCard";
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
      <BilingualHeading
        titleZh="訓練紀錄"
        titleEn="History"
        descriptionZh="檢視已完成的場次與每題答題明細（依時間新到舊）。"
        descriptionEn="Completed sessions and per-answer detail, newest first."
      />

      {sessions.length === 0 ? (
        <AppCard className="text-center">
          <p className="text-lg font-semibold text-slate-800">尚無紀錄 · No sessions yet</p>
          <p className="mt-2 text-sm text-slate-500">完成一場訓練後會出現在此。Finish a training run to see it here.</p>
        </AppCard>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-sm">
            共 {sessions.length} 場，新到舊 · {sessions.length} session(s), newest first
          </div>

          {sessions.map((session) => (
            <article
              key={session.id}
              className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm shadow-slate-900/5 md:p-8"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-600">已完成 · Completed</p>
                  <h2 className="text-xl font-semibold text-slate-900">場次 #{session.id} · Session</h2>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {session.answers.length} 筆作答 · answer(s) recorded
                </div>
              </div>

              <div className="mb-6 mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    總題數 · Total questions
                  </p>
                  <p className="text-2xl font-bold text-slate-900">{session.totalQuestions}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    正確題數 · Correct count
                  </p>
                  <p className="text-2xl font-bold text-emerald-900">{session.correctCount}</p>
                </div>
                <div className="rounded-xl border border-primary-200 bg-primary-50 px-4 py-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary-700">
                    正確率 · Accuracy
                  </p>
                  <p className="text-2xl font-bold text-primary-900">{session.accuracy}%</p>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 text-sm text-slate-700 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 px-4 py-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    開始時間 · Started
                  </p>
                  <p className="font-medium text-slate-900">{formatTimestamp(session.startedAt)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 px-4 py-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    結束時間 · Ended
                  </p>
                  <p className="font-medium text-slate-900">{formatTimestamp(session.endedAt)}</p>
                </div>
              </div>

              <details className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                  查看每題明細 · Answer details
                </summary>

                <div className="mt-4 space-y-4">
                  {session.answers.map((answer, index) => (
                    <div key={answer.id} className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                      <div className="mb-3 flex flex-wrap gap-2">
                        <span className="inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 ring-1 ring-primary-200">
                          第 {index + 1} 題 · Q{index + 1}
                        </span>
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          主題 · {answer.topic}
                        </span>
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          難度 · Lv {answer.difficulty}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            answer.isCorrect
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                              : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                          }`}
                        >
                          {answer.isCorrect ? "✓ 正確 · Correct" : "✗ 錯誤 · Incorrect"}
                        </span>
                      </div>

                      <p className="text-sm font-medium leading-6 text-slate-900">{answer.questionText}</p>

                      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            你的答案 · Your answer
                          </p>
                          <p className="font-semibold text-slate-900">{answer.selectedAnswer}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            正確答案 · Correct
                          </p>
                          <p className="font-semibold text-emerald-700">{answer.correctAnswer}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            記錄時間 · Recorded
                          </p>
                          <p className="text-slate-700">{formatTimestamp(answer.answeredAt)}</p>
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
