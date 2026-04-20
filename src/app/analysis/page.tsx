import Link from "next/link";

import AppCard from "@/components/ui/AppCard";
import BilingualHeading from "@/components/ui/BilingualHeading";
import { getAnalysisPageData } from "@/lib/analysis";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  const data = await getAnalysisPageData();

  return (
    <div>
      <BilingualHeading
        titleZh="錯題分析與下步建議"
        titleEn="Analysis and actionable next steps"
        descriptionZh="同一條 deterministic pipeline 統一產出弱點、每週摘要、與下一步任務建議。"
        descriptionEn="One deterministic pipeline for weakness diagnosis, weekly summary, and concrete next actions."
      />

      {!data.hasUser ? (
        <AppCard className="mb-6 border-amber-200 bg-amber-50/90">
          <p className="text-sm text-amber-900">尚未偵測到 learner 使用者，分析資料可能為空。請先進行一場練習或登入。</p>
        </AppCard>
      ) : null}

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AppCard padding="md">
          <h2 className="text-lg font-semibold text-slate-900">最近 7 日概況</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
            <li>完成 sessions：{data.stats7d.completedSessions}</li>
            <li>total questions：{data.stats7d.totalQuestions}</li>
            <li>accuracy：{data.stats7d.accuracy}%</li>
            <li>timeout / slow：{data.stats7d.timeoutCount} / {data.stats7d.slowAnswerCount}</li>
            <li>
              掌握訊號（閉環題）：已掌握 {data.stats7d.masteryFluent} · 半掌握 {data.stats7d.masteryHesitant} · 未掌握{" "}
              {data.stats7d.masteryStruggling}
            </li>
            <li>review 完成數：{data.stats7d.reviewCompletedCount}</li>
            <li>due backlog：{data.stats7d.dueBacklog}</li>
          </ul>
        </AppCard>
        <AppCard padding="md">
          <h2 className="text-lg font-semibold text-slate-900">最近 30 日概況</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
            <li>完成 sessions：{data.stats30d.completedSessions}</li>
            <li>total questions：{data.stats30d.totalQuestions}</li>
            <li>accuracy：{data.stats30d.accuracy}%</li>
            <li>timeout / slow：{data.stats30d.timeoutCount} / {data.stats30d.slowAnswerCount}</li>
            <li>
              掌握訊號（閉環題）：已掌握 {data.stats30d.masteryFluent} · 半掌握 {data.stats30d.masteryHesitant} · 未掌握{" "}
              {data.stats30d.masteryStruggling}
            </li>
            <li>review 完成數：{data.stats30d.reviewCompletedCount}</li>
            <li>due backlog：{data.stats30d.dueBacklog}</li>
          </ul>
        </AppCard>
      </section>

      <section className="mb-6">
        <AppCard>
          <h2 className="text-lg font-semibold text-slate-900">Top weakness topics</h2>
          {data.weakTopics.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">資料不足，暫時無法排名弱點主題。</p>
          ) : (
            <div className="mt-4 space-y-4">
              {data.weakTopics.map((topic, idx) => (
                <div key={`${topic.topic}-${idx}`} className="rounded-xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-900">{idx + 1}. {topic.topic}</p>
                  <p className="mt-1 text-sm text-slate-700">
                    錯題數 {topic.wrongCount} / {topic.answered}，最近 accuracy {topic.accuracy}%，建議下一步{" "}
                    <span className="font-semibold">{topic.recommendation.toUpperCase()}</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{topic.recommendationReason}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {topic.topicKey ? (
                      <>
                        <Link className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white" href={`/practice?topicKey=${encodeURIComponent(topic.topicKey)}`}>
                          PRACTICE
                        </Link>
                        <Link className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700" href={`/test?topicKey=${encodeURIComponent(topic.topicKey)}`}>
                          TEST
                        </Link>
                        <Link className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700" href={`/learn/${encodeURIComponent(topic.topicKey)}`}>
                          LEARN
                        </Link>
                      </>
                    ) : (
                      <Link className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white" href="/learn">
                        Open /learn
                      </Link>
                    )}
                  </div>

                  {topic.representatives.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">代表性錯題（最多 3 題）</p>
                      <ul className="mt-2 space-y-2 text-sm text-slate-700">
                        {topic.representatives.map((r) => (
                          <li key={r.answerHistoryId} className="rounded-lg bg-slate-50 px-3 py-2">
                            <p className="line-clamp-2">{r.questionTextSnapshot}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              正解 {r.correctAnswerSnapshot} · 你的作答 {r.userChoice} · {new Date(r.answeredAt).toLocaleString("zh-TW", { hour12: false })}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </AppCard>
      </section>

      <section className="mb-6">
        <AppCard padding="md">
          <h2 className="text-lg font-semibold text-slate-900">錯誤模式分類（Deterministic）</h2>
          {data.errorPatterns.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">目前沒有明確模式，請先累積更多作答資料。</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {data.errorPatterns.map((p) => (
                <li key={p.type} className="rounded-lg border border-slate-200 px-3 py-2">
                  <p className="font-semibold text-slate-900">{p.type}</p>
                  <p className="text-slate-700">{p.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </AppCard>
      </section>

      <section className="mb-6">
        <AppCard padding="md">
          <h2 className="text-lg font-semibold text-slate-900">Next-step recommendation</h2>
          <p className="mt-2 text-sm text-slate-700">{data.nextSteps.narrativeZh}</p>
          {data.nextSteps.primaryTask ? (
            <div className="mt-3 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2">
              <p className="text-xs font-semibold text-primary-700">Primary action</p>
              <p className="text-sm font-semibold text-primary-900">{data.nextSteps.primaryTask.type.toUpperCase()}</p>
              <p className="text-sm text-primary-900">{data.nextSteps.primaryTask.reasonZh}</p>
              <Link href={data.nextSteps.primaryTask.href} className="mt-2 inline-block rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white">
                {data.nextSteps.primaryTask.ctaLabelZh}
              </Link>
            </div>
          ) : null}
        </AppCard>
      </section>

      <section>
        <AppCard padding="md">
          <h2 className="text-lg font-semibold text-slate-900">匯出代表性錯題</h2>
          <p className="mt-2 text-sm text-slate-700">可下載 30 日內錯題清單，後續做人工複習、標註或外部分析。</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white" href="/api/analysis/wrong-answers?format=csv&days=30">
              Export CSV (30d)
            </Link>
            <Link className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700" href="/api/analysis/wrong-answers?format=json&days=30">
              Export JSON (30d)
            </Link>
            <Link className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700" href="/api/analysis/wrong-answers?format=csv&days=7">
              Export CSV (7d)
            </Link>
          </div>
        </AppCard>
      </section>
    </div>
  );
}

