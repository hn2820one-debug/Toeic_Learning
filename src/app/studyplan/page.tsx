import Link from "next/link";
import { CheckCircle2, Circle, Clock, Target, TrendingUp } from "lucide-react";

import BilingualHeading from "@/components/ui/BilingualHeading";
import { LearningSurface, learningSectionGap } from "@/components/ui/learning-surface";
import { buildStudyPlanDayStartLink } from "@/lib/studyplan/build-study-plan-day-links";
import { getStudyPlanRuntimeView } from "@/lib/studyplan/get-studyplan-runtime-view";
import { resolvePhase1TopicForPlanSkill } from "@/lib/studyplan/resolve-phase1-topic-for-plan-skill";
import {
  activityLabel,
  dayTypeLabel,
  taskKindLabel,
  weekNumber,
} from "@/lib/studyplan/studyplan-display-meta";

import StudyPlanDayActions from "./StudyPlanDayActions";

export const dynamic = "force-dynamic";

export default async function StudyPlanPage() {
  const plan = await getStudyPlanRuntimeView();

  if (!plan) {
    return (
      <div className={learningSectionGap}>
        <BilingualHeading
          titleZh="30 日學習計劃"
          titleEn="30-Day Study Plan"
          descriptionZh="尚未建立計劃。請先運行 `npm run db:seed` 初始化預設 30 日計劃。"
          descriptionEn="No plan found. Run `npm run db:seed` to initialize the default 30-day plan."
        />
      </div>
    );
  }

  const progressPct = Math.round((plan.completedDays / plan.durationDays) * 100);
  const currentDay = plan.days.find((d) => d.dayNumber === plan.currentDayNumber);

  return (
    <div className={learningSectionGap}>
      <BilingualHeading
        titleZh="30 日學習計劃"
        titleEn="30-Day Study Plan"
        descriptionZh="每日可開詳情頁預覽活動與技能；勾選仍寫入資料庫。主技能若已在「已完成技能」清單會顯示提示（唔會自動改勾選）。"
        descriptionEn="Open a day for a preview before you start; checkboxes still persist to the DB. Non-destructive hints when skill lists disagree."
      />

      <p className="mb-4 max-w-prose text-sm text-slate-600">
        當日任務類型（新學／練習／驗收）與首頁 CTA 使用同一套規則；「開始」連結依主技能解析到對應 Phase1 主題（詳情頁會列出警告）。
      </p>

      <LearningSurface>
        {/* Plan header summary */}
        <div className="mb-6 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Baseline</p>
            <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold text-slate-900">
              <Target size={18} className="text-slate-500" />
              {plan.baselineScore ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Target (30d)</p>
            <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold text-emerald-700">
              <TrendingUp size={18} className="text-emerald-600" />
              {plan.targetScore ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Days done</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {plan.completedDays} <span className="text-sm font-normal text-slate-500">/ {plan.durationDays}</span>
            </p>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Planned skills</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {plan.plannedSkillCodes.length}
              <span className="text-sm font-normal text-slate-500"> / 58</span>
            </p>
          </div>
        </div>

        {/* Current day spotlight */}
        {currentDay && !currentDay.completed ? (
          <div className="mb-6 rounded-xl border-2 border-primary-400 bg-primary-50 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary-700">
                  Next up · Week {weekNumber(currentDay.dayNumber)}
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Day {currentDay.dayNumber} — {currentDay.notes ?? "（無標題）"}
                </h2>
                {currentDay.primarySkillLabelZh ? (
                  <p className="mt-1 text-sm text-slate-600">
                    Primary skill: <span className="font-semibold">{currentDay.primarySkillLabelZh}</span>
                    <code className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-700">
                      {currentDay.primarySkillCode}
                    </code>
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className={`inline-flex rounded-lg px-3 py-1 text-xs font-semibold ${
                    dayTypeLabel[currentDay.dayType]?.badgeClass ?? "bg-slate-500 text-white"
                  }`}
                >
                  {dayTypeLabel[currentDay.dayType]?.zh ?? currentDay.dayType}
                </span>
                <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-800">
                  {taskKindLabel[currentDay.taskKind]}
                </span>
              </div>
            </div>

            <ol className="mt-4 space-y-2">
              {currentDay.activities.map((activity, idx) => (
                <li
                  key={`${currentDay.id}-${idx}`}
                  className="flex items-start gap-3 rounded-lg border border-white/80 bg-white/80 px-3 py-2 text-sm"
                >
                  <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    {activityLabel[activity.type] ?? activity.type}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock size={12} />
                    {activity.minutes} min
                  </span>
                  {activity.skillCode ? (
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">
                      {activity.skillCode}
                    </code>
                  ) : null}
                  {activity.notes ? (
                    <span className="min-w-0 flex-1 text-slate-700">{activity.notes}</span>
                  ) : null}
                </li>
              ))}
            </ol>

            {currentDay.runtimeHintZh ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
                {currentDay.runtimeHintZh}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-primary-300/60 pt-4">
              <span className="text-sm text-slate-600">
                Total: <strong>{currentDay.totalMinutes} 分鐘</strong>
              </span>
              <Link
                href={`/studyplan/day/${currentDay.dayNumber}`}
                className="rounded-lg border border-primary-400 bg-white px-3 py-1.5 text-xs font-semibold text-primary-800 hover:bg-primary-100/60"
              >
                查看詳情
              </Link>
              <Link
                href={`/studyplan/day/${currentDay.dayNumber}#preview`}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                預覽內容
              </Link>
              <Link
                href={buildStudyPlanDayStartLink(currentDay, resolvePhase1TopicForPlanSkill(currentDay.primarySkillCode).topicKey).href}
                className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
              >
                開始
              </Link>
              <StudyPlanDayActions
                dailyPlanItemId={currentDay.id}
                completed={currentDay.completed}
              />
            </div>
          </div>
        ) : null}

        {/* Full 30-day grid */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-700">30 日路徑總覽 · Full 30-day path</h3>
          </div>
          <ol className="divide-y divide-slate-100">
            {plan.days.map((day) => {
              const startHref = buildStudyPlanDayStartLink(
                day,
                resolvePhase1TopicForPlanSkill(day.primarySkillCode).topicKey,
              ).href;
              return (
              <li
                key={day.id}
                className={`flex flex-col gap-3 px-4 py-3 text-sm transition-colors sm:flex-row sm:items-start sm:gap-4 ${
                  day.completed
                    ? "bg-emerald-50/40"
                    : day.dayNumber === plan.currentDayNumber
                      ? "bg-primary-50/30"
                      : ""
                }`}
              >
                <div className="flex shrink-0 items-center gap-2 pt-0.5">
                  {day.completed ? (
                    <CheckCircle2 size={18} className="text-emerald-600" aria-hidden />
                  ) : (
                    <Circle size={18} className="text-slate-300" aria-hidden />
                  )}
                  <span className="w-10 text-right font-mono text-xs font-bold text-slate-500">
                    Day {day.dayNumber}
                  </span>
                </div>
                <span
                  className={`w-fit shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    dayTypeLabel[day.dayType]?.badgeClass ?? "bg-slate-500 text-white"
                  }`}
                >
                  {day.dayType}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 sm:truncate">{day.notes ?? "—"}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                    <span>W{weekNumber(day.dayNumber)}</span>
                    <span className="font-mono text-[10px] text-slate-600">{taskKindLabel[day.taskKind]}</span>
                    {day.primarySkillCode ? (
                      <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px] text-slate-600">
                        {day.primarySkillCode}
                      </code>
                    ) : null}
                    <span>{day.totalMinutes} min</span>
                    <span>{day.activities.length} activities</span>
                  </p>
                  {day.runtimeHintZh ? (
                    <p className="mt-1 text-[11px] text-amber-800/95">{day.runtimeHintZh}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                  <Link
                    href={`/studyplan/day/${day.dayNumber}`}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    查看詳情
                  </Link>
                  <Link
                    href={`/studyplan/day/${day.dayNumber}#preview`}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    預覽內容
                  </Link>
                  <Link
                    href={startHref}
                    className="rounded-md bg-primary-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-primary-700"
                  >
                    開始
                  </Link>
                  <StudyPlanDayActions
                    dailyPlanItemId={day.id}
                    completed={day.completed}
                    compact
                  />
                </div>
              </li>
            );
            })}
          </ol>
        </div>
      </LearningSurface>
    </div>
  );
}
