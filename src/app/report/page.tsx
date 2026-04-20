import AiWeeklyCoachingReport from "@/components/report/AiWeeklyCoachingReport";
import AppCard from "@/components/ui/AppCard";
import BilingualHeading from "@/components/ui/BilingualHeading";
import { getWeeklyReportData } from "@/lib/report";
import { getDeterministicWeeklyReport } from "@/lib/weekly-report";

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
  const [report, det] = await Promise.all([getWeeklyReportData(), getDeterministicWeeklyReport()]);

  return (
    <div>
      <BilingualHeading
        titleZh="週報表"
        titleEn="Weekly report"
        descriptionZh="以「最近 7 天」內完成的訓練場次為範圍的摘要。"
        descriptionEn="Rolling 7-day summary from completed training sessions only."
      />

      <AppCard padding="md" className="mb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-600">統計區間 · Report window</p>
        <p className="text-sm text-slate-700">
          包含 endedAt 介於 {formatTimestamp(report.windowStart)} 與 {formatTimestamp(report.windowEnd)} 的場次。
          <span className="mt-1 block text-xs text-slate-500">
            Sessions with endedAt in this range are included (English same as data labels below).
          </span>
        </p>
        <p className="mt-3 text-sm text-slate-600">統計與 next action 來自 deterministic analysis pipeline；LLM 只負責教練語氣重寫。</p>
      </AppCard>

      <div className="space-y-6">
        {!report.hasData ? (
          <AppCard className="text-center">
            <p className="text-lg font-semibold text-slate-800">近七日無完成場次 · No data in 7 days</p>
            <p className="mt-2 text-sm text-slate-500">完成訓練後會自動納入下一份週報。Finish a session to appear in the next report.</p>
          </AppCard>
        ) : (
          <>
            <AppCard>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary-600">週摘要 · Weekly summary</p>
                  <h2 className="text-xl font-semibold text-slate-900">最近 7 天 · Last 7 days</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    完成場次 · Completed sessions
                  </p>
                  <p className="text-2xl font-bold text-slate-900">{report.summary.completedSessionCount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    答題數 · Questions answered
                  </p>
                  <p className="text-2xl font-bold text-slate-900">{report.summary.totalQuestionsAnswered}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    答對數 · Correct answers
                  </p>
                  <p className="text-2xl font-bold text-emerald-900">{report.summary.totalCorrectAnswers}</p>
                </div>
                <div className="rounded-xl border border-primary-200 bg-primary-50 px-4 py-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary-700">
                    整體正確率 · Overall accuracy
                  </p>
                  <p className="text-2xl font-bold text-primary-900">{report.summary.accuracy}%</p>
                </div>
              </div>
            </AppCard>

            <AppCard>
              <div className="mb-6">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary-600">主題分布 · By topic</p>
                <h2 className="text-xl font-semibold text-slate-900">依主題的正確率 · Accuracy by topic</h2>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-600">
                      <th className="px-4 py-3 font-semibold">主題 · Topic</th>
                      <th className="px-4 py-3 text-right font-semibold">答題 · Answered</th>
                      <th className="px-4 py-3 text-right font-semibold">答對 · Correct</th>
                      <th className="px-4 py-3 text-right font-semibold">正確率 · Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topicBreakdown.map((topic) => (
                      <tr
                        key={topic.topic}
                        className="border-t border-slate-100 text-slate-700 odd:bg-white even:bg-slate-50/40"
                      >
                        <td className="px-4 py-3 font-semibold text-slate-900">{topic.topic}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{topic.totalAnswered}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-emerald-700">{topic.correctCount}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-primary-700">
                          {topic.accuracy}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AppCard>

            <AppCard>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary-600">Deterministic weekly report</p>
              <h2 className="text-xl font-semibold text-slate-900">可執行週報（非純數字）</h2>
              <div className="mt-4 space-y-4 text-sm text-slate-700">
                <section>
                  <p className="font-semibold text-slate-900">1. 本週學習概況</p>
                  <p>{det.sectionOverview}</p>
                </section>
                <section>
                  <p className="font-semibold text-slate-900">2. 三個主要弱點</p>
                  <ul className="list-disc pl-5">
                    {det.sectionWeaknesses.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </section>
                <section>
                  <p className="font-semibold text-slate-900">3. 最高 ROI topic</p>
                  <p>{det.topRoiTopic}</p>
                </section>
                <section>
                  <p className="font-semibold text-slate-900">4. 下週建議三件事</p>
                  <ul className="list-disc pl-5">
                    {det.sectionNextWeekActions.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </section>
                <section>
                  <p className="font-semibold text-slate-900">5. 明確 next action</p>
                  <p>{det.nextAction}</p>
                  <p className="mt-2 text-xs text-slate-500">Generated at {new Date(det.generatedAt).toLocaleString("zh-TW", { hour12: false })}</p>
                </section>
              </div>
            </AppCard>
          </>
        )}

        <AiWeeklyCoachingReport />
      </div>
    </div>
  );
}
