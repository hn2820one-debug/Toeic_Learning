import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";

import BilingualHeading from "@/components/ui/BilingualHeading";
import AppCard from "@/components/ui/AppCard";
import { PHASE1_TOPIC_LABELS } from "@/content/programs/phase1/skill-map";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { getLearnDashboardData } from "@/lib/learn-dashboard";
import { learningTaskBadgeKey } from "@/lib/learning-path";
import { primaryButtonClass } from "@/lib/ui/form-classes";

export const dynamic = "force-dynamic";

type LearnPageProps = {
  searchParams?: { topicKey?: string };
};

type TaskBadge = ReturnType<typeof learningTaskBadgeKey>;

const KIND_LABEL: Record<
  TaskBadge,
  { zh: string; en: string; badgeClass: string }
> = {
  REVIEW: { zh: "複習", en: "REVIEW", badgeClass: "bg-rose-600" },
  TEST: { zh: "驗收", en: "TEST", badgeClass: "bg-amber-600" },
  PRACTICE: { zh: "練習", en: "PRACTICE", badgeClass: "bg-sky-600" },
  LEARN: { zh: "新學", en: "LEARN", badgeClass: "bg-emerald-600" },
};

function focusLabel(topicKey: Phase1TopicKey) {
  return PHASE1_TOPIC_LABELS[topicKey];
}

export default async function LearnPage({ searchParams }: LearnPageProps) {
  const data = await getLearnDashboardData(searchParams);

  return (
    <div>
      <BilingualHeading
        titleZh="今日學習"
        titleEn="Today's learning"
        descriptionZh="依閉環優先順序排列：複習 → 驗收 → 練習 → 新主題。這裡是正式入口，不必從舊儀表板猜下一步。"
        descriptionEn="Prioritized loop: review → test → practice → learn. Your closed-loop entry — no guessing from the legacy dashboard."
      />

      {data.focusTopicKey ? (
        <div className="mb-6 rounded-2xl border border-primary-200/80 bg-primary-50/90 px-4 py-3 text-sm text-primary-950 shadow-sm">
          <p className="font-semibold">目前聚焦 · Focus</p>
          <p className="mt-1 text-primary-900/90">{focusLabel(data.focusTopicKey)}</p>
        </div>
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

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/90 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-slate-900 p-2.5 text-white shadow-sm">
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
        <Link
          href="/training"
          className="text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
        >
          仍可使用舊版每日訓練 · Legacy training
        </Link>
      </div>

      {data.tasks.length === 0 ? (
        <AppCard className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 size={28} aria-hidden />
          </div>
          <p className="text-lg font-semibold text-slate-900">今日沒有待辦 · All clear</p>
          <p className="mt-2 text-sm text-slate-600">
            FSRS 無到期題卡，且 Phase 1 主題皆已離開「新學／練習／驗收」隊列。可從儀表板查看整體訊號，或稍後再回來。
          </p>
          <p className="mt-1 text-xs text-slate-500">
            No due cards and no pending loop stages on Phase 1 topics. Check the dashboard for signals, or come back later.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/" className={primaryButtonClass}>
              儀表板 · Dashboard
            </Link>
            <Link
              href="/training"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              開啟訓練 · Training
            </Link>
          </div>
        </AppCard>
      ) : (
        <ul className="space-y-4">
          {data.tasks.map((task, i) => {
            const badge = learningTaskBadgeKey(task);
            const kind = KIND_LABEL[badge];
            return (
              <li key={`${task.type}-${task.topicKey ?? "fsrs"}-${i}`}>
                <AppCard padding="md" className="border-slate-200/90 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-lg px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white ${kind.badgeClass}`}
                        >
                          {kind.zh} · {kind.en}
                        </span>
                        <span className="text-xs text-slate-400">~{task.estimatedMins} min</span>
                      </div>
                      <h2 className="text-base font-semibold text-slate-900">{task.titleZh}</h2>
                      <p className="text-sm text-slate-500">{task.titleEn}</p>
                      <p className="text-xs font-medium text-slate-600">
                        {task.moduleTitleZh}
                        <span className="mx-1.5 text-slate-300">·</span>
                        <span className="text-slate-500">{task.moduleTitleEn}</span>
                      </p>
                      <p className="text-sm leading-relaxed text-slate-700">{task.reasonZh}</p>
                      <p className="text-xs leading-relaxed text-slate-500">{task.reasonEn}</p>
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
    </div>
  );
}
