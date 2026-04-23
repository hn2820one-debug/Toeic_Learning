import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";

import ContentClassificationStrip from "@/components/learning/ContentClassificationStrip";
import BilingualHeading from "@/components/ui/BilingualHeading";
import AppCard from "@/components/ui/AppCard";
import { LearningPageCanvas, LearningSurface, learningSectionGap } from "@/components/ui/learning-surface";
import { PHASE1_TOPIC_LABELS } from "@/content/programs/phase1/skill-map";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { getLearnDashboardData } from "@/lib/learn-dashboard";
import { classificationStripFromComposedTask } from "@/lib/learning-content-classification";
import { composedTaskBadgeKey } from "@/lib/learning-path";
import { primaryButtonClass } from "@/lib/ui/form-classes";

export const dynamic = "force-dynamic";

type LearnPageProps = {
  searchParams?: { topicKey?: string };
};

type TaskBadge = ReturnType<typeof composedTaskBadgeKey>;

const KIND_LABEL: Record<
  TaskBadge,
  { zh: string; en: string; badgeClass: string }
> = {
  REVIEW: { zh: "複習", en: "REVIEW", badgeClass: "bg-rose-600" },
  CHECKPOINT: { zh: "驗收", en: "CHECKPOINT", badgeClass: "bg-amber-600" },
  PRACTICE: { zh: "練習", en: "PRACTICE", badgeClass: "bg-sky-600" },
  LEARN: { zh: "新學", en: "LEARN", badgeClass: "bg-emerald-600" },
};

function focusLabel(topicKey: Phase1TopicKey) {
  return PHASE1_TOPIC_LABELS[topicKey];
}

export default async function LearnPage({ searchParams }: LearnPageProps) {
  const data = await getLearnDashboardData(searchParams);

  return (
    <div className={learningSectionGap}>
      <BilingualHeading
        titleZh="今日學習"
        titleEn="Today's learning"
        descriptionZh="閉環入口：優先 FSRS 到期 → 30 日計劃今日排程 → 主題階段（練習／驗收）→ 下一個新主題與 ROI 技能。與 /studyplan、mode-aware composer 對齊。"
        descriptionEn="Closed-loop entry: due FSRS → today's 30-day plan block → topic stages (practice/checkpoint) → next new topic + ROI skill. Aligns with /studyplan and the mode-aware composer."
      />

      <LearningSurface>
        {data.focusTopicKey ? (
          <LearningPageCanvas className="mb-6 border-primary-200/40 bg-primary-50/50">
            <span className="inline-flex rounded-lg bg-primary-100/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-900">
              聚焦 · Focus
            </span>
            <p className="mt-3 text-sm font-semibold text-primary-950">目前進行主題</p>
            <p className="mt-1 text-sm leading-relaxed text-primary-900/90">{focusLabel(data.focusTopicKey)}</p>
          </LearningPageCanvas>
        ) : null}

        {!data.hasUser ? (
          <AppCard className="mb-6 border-amber-200 bg-amber-50/90">
            <p className="text-sm font-medium text-amber-950">
              尚未建立學習者帳號（或正式環境未開啟 bootstrap）。進度與主題列將以內容預設顯示。
            </p>
            <p className="mt-1 text-xs text-amber-900/85">
              No learner user yet — topic order uses curriculum defaults until auth/bootstrap is enabled.
            </p>
          </AppCard>
        ) : null}

        <LearningPageCanvas className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-800/90 p-2.5 text-white shadow-sm">
                <Clock size={20} aria-hidden />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">預估總時間 · Est. total</p>
                <p className="text-lg font-bold text-slate-900">
                  {data.totalEstimatedMinutes > 0 ? (
                    <>
                      約 {data.totalEstimatedMinutes} 分鐘 · ~{data.totalEstimatedMinutes} min
                    </>
                  ) : (
                    <>— · No estimate</>
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link
                href="/studyplan"
                className="font-semibold text-primary-700 underline decoration-primary-300 underline-offset-4 hover:text-primary-900"
              >
                30 日計劃 · Study plan
              </Link>
              <Link
                href="/training"
                className="font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
              >
                舊版訓練 · Legacy training
              </Link>
            </div>
          </div>
        </LearningPageCanvas>

        {data.tasks.length === 0 ? (
          <AppCard className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={28} aria-hidden />
            </div>
            <p className="text-lg font-semibold text-slate-900">今日沒有待辦 · All clear</p>
            <p className="mt-2 text-sm text-slate-600">
              FSRS 無到期題卡、30 日計劃今日無未完成日，且 Phase 1 主題皆已離開「新學／練習／驗收」隊列。可開啟儀表板或稍後再回來。
            </p>
            <p className="mt-1 text-xs text-slate-500">
              No due cards, no pending study-plan day, and no pending loop stages on Phase 1 topics.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/" className={primaryButtonClass}>
                儀表板 · Dashboard
              </Link>
              <Link
                href="/studyplan"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
              >
                30 日計劃 · Study plan
              </Link>
            </div>
          </AppCard>
        ) : (
          <ul className="space-y-4">
            {data.tasks.map((task, i) => {
              const badge = composedTaskBadgeKey(task);
              const kind = KIND_LABEL[badge];
              return (
                <li key={`${task.type}-${task.priority}-${i}`}>
                  <AppCard padding="md" className="border-slate-200/80 bg-white/85 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-lg px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white ${kind.badgeClass}`}
                          >
                            {kind.zh} · {kind.en}
                          </span>
                          <span className="text-xs text-slate-400">priority {task.priority}</span>
                          <span className="text-xs text-slate-400">~{task.estimatedMins} min</span>
                        </div>
                        <h2 className="text-base font-semibold text-slate-900">{task.title}</h2>
                        <p className="text-sm leading-relaxed text-slate-600">{task.reason}</p>
                        <ContentClassificationStrip strip={classificationStripFromComposedTask(task)} className="mt-3" />
                      </div>
                      <div className="shrink-0 md:pt-1">
                        <Link
                          href={task.href}
                          className="inline-flex min-w-[140px] justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
                        >
                          開始 · Start
                        </Link>
                      </div>
                    </div>
                  </AppCard>
                </li>
              );
            })}
          </ul>
        )}
      </LearningSurface>
    </div>
  );
}
