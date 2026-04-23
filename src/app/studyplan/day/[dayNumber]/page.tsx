import Link from "next/link";
import { notFound } from "next/navigation";

import ContentClassificationStrip from "@/components/learning/ContentClassificationStrip";
import BilingualHeading from "@/components/ui/BilingualHeading";
import { LearningSurface, learningSectionGap } from "@/components/ui/learning-surface";
import {
  activityLabel,
  activitySkillCodes,
  dayTypeLabel,
  planUiModeLabel,
  taskKindLabel,
} from "@/lib/studyplan/studyplan-display-meta";
import {
  CONTENT_DOMAIN_LABEL_ZH,
  canonicalSkillKeyFromLearningCode,
  domainFromSkillCode,
} from "@/lib/learning-content-classification";
import { loadSessionClassificationStrip } from "@/lib/learning-session-classification-strip";
import { getStudyPlanDayDetail, planRelatedTopicLabels } from "@/lib/studyplan/get-study-plan-day-detail";

import StudyPlanDayActions from "../../StudyPlanDayActions";

export const dynamic = "force-dynamic";

function extractQuestionCounts(notes: string | null): number | null {
  if (!notes) return null;
  const m = notes.match(/(\d+)\s*題/);
  if (!m) return null;
  const n = Number.parseInt(m[1]!, 10);
  return Number.isNaN(n) ? null : n;
}

type PageProps = { params: { dayNumber: string } };

export default async function StudyPlanDayPage({ params }: PageProps) {
  const n = Number.parseInt(params.dayNumber, 10);
  if (Number.isNaN(n) || n < 1) notFound();

  const detail = await getStudyPlanDayDetail(n);
  if (detail.kind === "no_plan") {
    return (
      <div className={learningSectionGap}>
        <BilingualHeading
          titleZh="找不到計劃"
          titleEn="No plan"
          descriptionZh="請先建立 30 日計劃（例如執行 seed）。"
          descriptionEn="Initialize a study plan first (e.g. run db seed)."
        />
        <Link href="/studyplan" className="text-sm font-semibold text-primary-700 underline">
          返回總覽 · Back to plan
        </Link>
      </div>
    );
  }
  if (detail.kind === "not_found") notFound();

  const { day } = detail;
  const practiceMins = day.activities.filter((a) => a.type === "practice").reduce((s, a) => s + a.minutes, 0);
  const testMins = day.activities.filter((a) => a.type === "test" || a.type === "mixed_mock").reduce((s, a) => s + a.minutes, 0);
  const learnMins = day.activities.filter((a) => a.type === "learn").reduce((s, a) => s + a.minutes, 0);
  const estPracticeItems = day.activities
    .filter((a) => a.type === "practice")
    .map((a) => extractQuestionCounts(a.notes))
    .filter((x): x is number => x !== null);
  const estTestItems = day.activities
    .filter((a) => a.type === "test" || a.type === "mixed_mock")
    .map((a) => extractQuestionCounts(a.notes))
    .filter((x): x is number => x !== null);
  const skillCodesInActivities = activitySkillCodes(day.activities);
  const related = planRelatedTopicLabels(detail.resolvedTopicKey);
  const cov = detail.primarySkillCoverage;
  const wantsPractice = day.activities.some((a) => a.type === "practice");
  const wantsTest = day.activities.some((a) => a.type === "test" || a.type === "mixed_mock");
  const strictCoverageShort =
    (wantsPractice && !detail.strictPracticeFeasible) || (wantsTest && !detail.strictTestFeasible);

  const planStrip =
    detail.resolvedTopicKey != null
      ? await loadSessionClassificationStrip({
          topicKey: detail.resolvedTopicKey,
          skillCode: day.primarySkillCode,
          moduleKey: null,
          mode:
            detail.uiMode === "test"
              ? "test"
              : detail.uiMode === "learn"
                ? "learn"
                : detail.uiMode === "review"
                  ? "review"
                  : "practice",
        })
      : null;

  const statusLabel =
    detail.progressStatus === "done"
      ? "已完成 · Done"
      : detail.progressStatus === "in_progress"
        ? "進行中 · In progress"
        : "未開始 · Not started";

  return (
    <div className={learningSectionGap}>
      <nav className="mb-3 text-sm text-slate-600">
        <Link href="/studyplan" className="font-medium text-primary-700 hover:underline">
          30 日計劃
        </Link>
        <span className="mx-2 text-slate-400">/</span>
        <span className="text-slate-800">Day {detail.dayNumber}</span>
      </nav>

      <BilingualHeading
        titleZh={day.notes ?? `第 ${detail.dayNumber} 日`}
        titleEn={`Day ${detail.dayNumber} — ${day.notes ?? "Scheduled block"}`}
        descriptionZh="開始前可檢視模式、主技能、活動與題型方向；完成後再勾選。"
        descriptionEn="Review mode, skills, and item direction before you start; mark the day done when finished."
      />

      {planStrip ? <ContentClassificationStrip strip={planStrip} className="mb-4 max-w-4xl" /> : null}

      {strictCoverageShort ? (
        <div className="mb-4 max-w-4xl rounded-xl border-2 border-amber-400 bg-amber-50/95 px-4 py-3 text-sm text-amber-950 shadow-sm">
          <p className="font-semibold">Strict 題量可能不足 · Coverage warning</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900/95">
            This lesson may not have enough questions for strict practice/test. 若堅持{" "}
            <span className="font-mono">lesson_drill</span> / <span className="font-mono">checkpoint</span>{" "}
            ，系統不會用錯 skill 的題目補滿；可改 <span className="font-mono">mixed_practice</span>（仍須帶同一{" "}
            <span className="font-mono">skill=</span>）或補齊題庫。
          </p>
        </div>
      ) : null}

      {cov ? (
        <section className="mb-4 max-w-4xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">今日 primary skill 題庫 · Skill coverage</h2>
          <p className="mt-1 text-xs text-slate-500">
            依 <code className="rounded bg-slate-100 px-1">{cov.skill_key}</code> 的{" "}
            <code className="rounded bg-slate-100 px-1">primaryLearningSkillCode</code> 聚合；用於 strict 場次可否組滿。
          </p>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Total questions</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{cov.total_questions}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Difficulty（easy / med / hard / ?）</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {cov.difficulty_distribution.easy} / {cov.difficulty_distribution.medium} /{" "}
                {cov.difficulty_distribution.hard} / {cov.difficulty_distribution.unknown}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Strict practice（≥10）</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{detail.strictPracticeFeasible ? "可行 · OK" : "不足 · Short"}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Strict test（≥15）</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{detail.strictTestFeasible ? "可行 · OK" : "不足 · Short"}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[11px] text-slate-500">
            topic_key 有值：{cov.with_topic_key} 題 · module_key 有值：{cov.with_module_key} 題
            {cov.missing_fields.length ? (
              <>
                {" "}
                · missing:{" "}
                <code className="rounded bg-amber-100 px-1 text-amber-950">{cov.missing_fields.join(", ")}</code>
              </>
            ) : null}
          </p>
        </section>
      ) : null}

      <LearningSurface>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span
            className={`rounded-lg px-3 py-1 text-xs font-semibold ${
              dayTypeLabel[day.dayType]?.badgeClass ?? "bg-slate-600 text-white"
            }`}
          >
            {dayTypeLabel[day.dayType]?.zh ?? day.dayType}
          </span>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">
            {planUiModeLabel(detail.uiMode)}
          </span>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
            Week {detail.week}
          </span>
          <span className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600">
            {statusLabel}
          </span>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <section className="md:col-span-2 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800">今日摘要 · Day overview</h2>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Routing mode</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{taskKindLabel[day.taskKind]}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Estimated minutes</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{day.totalMinutes} min</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Primary skill</dt>
                <dd className="mt-0.5 text-slate-900">
                  {day.primarySkillLabelZh ? (
                    <span className="font-medium">{day.primarySkillLabelZh}</span>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                  {day.primarySkillCode ? (
                    <code className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px]">{day.primarySkillCode}</code>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Learn topic (resolved)</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {detail.resolvedTopicKey ? (
                    <>
                      {detail.topicLabel}{" "}
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px]">{detail.resolvedTopicKey}</code>
                    </>
                  ) : (
                    <span className="text-amber-800">未解析（見下方警告）</span>
                  )}
                </dd>
              </div>
            </dl>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Learning goal</h3>
              <p className="mt-1 text-sm text-slate-700">{detail.acceptance.zh}</p>
              <p className="mt-1 text-xs text-slate-500">{detail.acceptance.en}</p>
            </div>

            {day.runtimeHintZh ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">{day.runtimeHintZh}</p>
            ) : null}

            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <Link
                href={detail.startLink.href}
                className="inline-flex items-center rounded-lg bg-gradient-to-r from-primary-600 to-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-primary-700 hover:to-primary-600"
              >
                {detail.startLink.labelZh}
              </Link>
              <StudyPlanDayActions dailyPlanItemId={day.id} completed={day.completed} />
              <Link
                href={`/learn/${detail.resolvedTopicKey ?? "onboarding"}${
                  day.primarySkillCode ? `?primaryLearningSkillCode=${encodeURIComponent(day.primarySkillCode)}` : ""
                }`}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                主題教材 · Lessons
              </Link>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800">先修／解鎖 · Prereq</h2>
            {detail.primarySkillPrereqCodes.length ? (
              <ul className="list-inside list-disc text-xs text-slate-700">
                {detail.primarySkillPrereqCodes.map((c) => (
                  <li key={c}>
                    <code>{c}</code>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">無先修技能標記。</p>
            )}
            <h3 className="text-xs font-semibold text-slate-600">Unlocks</h3>
            {detail.primarySkillUnlockCodes.length ? (
              <ul className="list-inside list-disc text-xs text-slate-700">
                {detail.primarySkillUnlockCodes.map((c) => (
                  <li key={c}>
                    <code>{c}</code>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">—</p>
            )}
            <h3 className="text-xs font-semibold text-slate-600">鄰近主題 · Related</h3>
            {related.length ? (
              <ul className="space-y-1 text-xs">
                {related.map((r) => (
                  <li key={r.key}>
                    <Link className="text-primary-700 underline" href={`/learn/${r.key}`}>
                      {r.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">—</p>
            )}
          </section>
        </div>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Lesson 摘要 · Lesson summary</h2>
          <p className="mt-1 text-xs text-slate-500">
            對應主題 <code className="rounded bg-slate-100 px-1">{detail.resolvedTopicKey ?? "—"}</code> 共 {detail.lessonCount}{" "}
            節教材；下列為前幾節標題（實際內容以教材頁為準）。
          </p>
          {detail.lessonTitlesSample.length ? (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-800">
              {detail.lessonTitlesSample.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-amber-800">此主題尚無教材標題可顯示。</p>
          )}
        </section>

        <section id="preview" className="mt-6 scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">題目與技能預覽 · Preview</h2>
          <p className="mt-1 text-xs text-slate-500">
            非完整題目；依種子計劃活動整理「會練什麼／考什麼」與技能覆蓋，方便開始前自我對齊。
          </p>
          <p className="mt-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
            引導預覽（dual-axis）：目標約 <span className="font-semibold text-slate-800">70%</span> 核心 primary skill、
            <span className="font-semibold text-slate-800"> 30%</span> 鄰近技能／混合鞏固（實際比例依題庫與模式；strict 模式下不足即中止，不暗補）。
          </p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Learn block</dt>
              <dd className="font-semibold text-slate-900">{learnMins} min</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Practice block</dt>
              <dd className="font-semibold text-slate-900">{practiceMins} min</dd>
              {estPracticeItems.length ? (
                <p className="mt-1 text-[11px] text-slate-600">備註中題量提示：{estPracticeItems.join(" + ")} 題（估）</p>
              ) : null}
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Test / mock</dt>
              <dd className="font-semibold text-slate-900">{testMins} min</dd>
              {estTestItems.length ? (
                <p className="mt-1 text-[11px] text-slate-600">備註中題量提示：{estTestItems.join(" + ")} 題（估）</p>
              ) : null}
            </div>
          </dl>
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Skill coverage（活動列技能）</h3>
            {skillCodesInActivities.length ? (
              <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                {skillCodesInActivities.map((code) => {
                  const row = detail.skillRowsForActivities.find((r) => r.skillCode === code);
                  return (
                    <li key={code} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                      <code>{code}</code>
                      {row ? <span className="ml-1 text-slate-600">· {row.labelZh}</span> : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-slate-500">本日活動未標記細項 skillCode（可能為診斷／模考／反思為主）。</p>
            )}
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-2">Activity</th>
                  <th className="py-2 pr-2">Domain</th>
                  <th className="py-2 pr-2">Min</th>
                  <th className="py-2 pr-2">Skill</th>
                  <th className="py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {day.activities.map((a, idx) => {
                  const dom = domainFromSkillCode(a.skillCode);
                  return (
                  <tr key={`${day.id}-${idx}`} className="border-b border-slate-100 align-top text-slate-800">
                    <td className="py-2 pr-2 font-medium">{activityLabel[a.type] ?? a.type}</td>
                    <td className="py-2 pr-2 text-[11px]">
                      {CONTENT_DOMAIN_LABEL_ZH[dom]}
                      {a.skillCode ? (
                        <code className="mt-0.5 block font-mono text-[10px] text-slate-500">
                          {canonicalSkillKeyFromLearningCode(a.skillCode)}
                        </code>
                      ) : null}
                    </td>
                    <td className="py-2 pr-2">{a.minutes}</td>
                    <td className="py-2 pr-2 font-mono text-[11px]">{a.skillCode ?? "—"}</td>
                    <td className="py-2 text-slate-600">{a.notes ?? "—"}</td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {detail.routingWarnings.length || detail.lessonStructureIssues.length ? (
          <section className="mt-6 rounded-xl border-2 border-amber-300 bg-amber-50/90 p-5">
            <h2 className="text-sm font-semibold text-amber-950">內容對齊警告 · Mapping / QA</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-950">
              {detail.routingWarnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
              {detail.lessonStructureIssues.map((iss) => (
                <li key={`${iss.lessonIndex}-${iss.titleZh}`}>
                  Lesson #{iss.lessonIndex}「{iss.titleZh}」：{iss.message}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </LearningSurface>
    </div>
  );
}
