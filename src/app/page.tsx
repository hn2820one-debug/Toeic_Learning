import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Clock, Layers, Sparkles } from "lucide-react";

import AppCard from "@/components/ui/AppCard";
import BilingualHeading from "@/components/ui/BilingualHeading";
import { getHomeDashboardData } from "@/lib/dashboard-next-action";
import { learningTaskBadgeKey } from "@/lib/learning-path";
import { primaryButtonClass } from "@/lib/ui/form-classes";

export const dynamic = "force-dynamic";

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

const MODE_LABEL: Record<string, string> = {
  learn: "LEARN",
  practice: "PRACTICE",
  test: "TEST",
  review: "REVIEW",
  mixed: "MIXED",
};

export default async function HomePage() {
  const d = await getHomeDashboardData();

  return (
    <div>
      <BilingualHeading
        titleZh="學習儀表板"
        titleEn="Your learning hub"
        descriptionZh="與「今日學習」同一套優先順序：先看下一步，再看閉環狀態與最近活動。"
        descriptionEn="Same prioritization as Today’s learning — next action first, then loop status and recent activity."
      />

      {!d.hasUser ? (
        <AppCard className="mb-6 border-amber-200 bg-amber-50/90">
          <p className="text-sm font-medium text-amber-950">
            尚未建立學習者帳號時，下方數字僅能顯示 FSRS 佇列概況；登入或啟用 bootstrap 後會個人化。
          </p>
          <p className="mt-1 text-xs text-amber-900/85">No learner user — FSRS queue is global until auth/bootstrap.</p>
        </AppCard>
      ) : null}

      {/* 1. Today's next action */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">今日下一步 · Today&apos;s next action</h2>
        {d.nextTask ? (
          <AppCard padding="lg" className="border-primary-200/90 bg-gradient-to-br from-primary-50/95 to-white shadow-md">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-lg px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white ${KIND_LABEL[learningTaskBadgeKey(d.nextTask)].badgeClass}`}
                  >
                    {KIND_LABEL[learningTaskBadgeKey(d.nextTask)].zh} · {KIND_LABEL[learningTaskBadgeKey(d.nextTask)].en}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Clock size={14} aria-hidden />
                    ~{d.nextTask.estimatedMins} min
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">{d.nextTask.titleZh}</h3>
                <p className="text-sm text-slate-600">{d.nextTask.titleEn}</p>
                <p className="text-sm leading-relaxed text-slate-700">{d.nextTask.reasonZh}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
                <Link href={d.nextTask.href} className={`${primaryButtonClass} inline-flex items-center justify-center gap-2 px-8 py-3 text-base`}>
                  前往 · Go
                  <ArrowRight size={18} aria-hidden />
                </Link>
                <Link
                  href="/learn"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                >
                  看完整清單 · Full list
                </Link>
              </div>
            </div>
          </AppCard>
        ) : (
          <AppCard padding="lg" className="border-emerald-200 bg-emerald-50/90 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={28} aria-hidden />
            </div>
            <p className="text-lg font-semibold text-emerald-950">今日隊列已清空 · All clear for now</p>
            <p className="mt-2 text-sm text-emerald-900/90">
              沒有 FSRS 到期／學習步進，且 Phase 1 主題目前沒有待處理的驗收／練習／新學項目。
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/learn" className={primaryButtonClass}>
                開啟今日學習 · Open /learn
              </Link>
              <Link
                href="/review"
                className="inline-flex items-center justify-center rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 shadow-sm hover:bg-emerald-50"
              >
                複習 · Review
              </Link>
            </div>
          </AppCard>
        )}
      </section>

      {/* 2. Learning loop status */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">閉環狀態 · Learning loop</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AppCard padding="md" className="border-emerald-100 bg-emerald-50/50">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-emerald-600 p-2 text-white">
                <BookOpen size={20} aria-hidden />
              </div>
              <div>
                <p className="text-xs font-medium text-emerald-900/80">LEARN 已完成主題</p>
                <p className="text-[11px] text-emerald-800/70">Topics with learn capsule done</p>
                <p className="mt-2 text-3xl font-bold text-emerald-950">{d.topicsLearnCompletedCount}</p>
                <p className="mt-1 text-xs text-emerald-800/80">以 learnCompletedAt 計 · by completion timestamp</p>
              </div>
            </div>
          </AppCard>
          <AppCard padding="md" className="border-sky-100 bg-sky-50/50">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-sky-600 p-2 text-white">
                <Layers size={20} aria-hidden />
              </div>
              <div>
                <p className="text-xs font-medium text-sky-900/80">PRACTICE 待練習（Introduced）</p>
                <p className="text-[11px] text-sky-800/70">Need scaffolded practice</p>
                <p className="mt-2 text-3xl font-bold text-sky-950">{d.loopStages.introduced}</p>
              </div>
            </div>
          </AppCard>
          <AppCard padding="md" className="border-amber-100 bg-amber-50/50">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-600 p-2 text-white">
                <Sparkles size={20} aria-hidden />
              </div>
              <div>
                <p className="text-xs font-medium text-amber-900/80">TEST 待驗收（Practiced）</p>
                <p className="text-[11px] text-amber-800/70">Ready for checkpoint</p>
                <p className="mt-2 text-3xl font-bold text-amber-950">{d.loopStages.practiced}</p>
              </div>
            </div>
          </AppCard>
          <AppCard padding="md" className="border-rose-100 bg-rose-50/50">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-rose-600 p-2 text-white">
                <Clock size={20} aria-hidden />
              </div>
              <div>
                <p className="text-xs font-medium text-rose-900/80">REVIEW 到期（約）</p>
                <p className="text-[11px] text-rose-800/70">Due + learning due (FSRS)</p>
                <p className="mt-2 text-3xl font-bold text-rose-950">{d.reviewDueApprox}</p>
                <p className="mt-1 text-xs text-rose-800/80">新卡池 · New pool: {d.fsrsNewCardCount}</p>
              </div>
            </div>
          </AppCard>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
          <span>
            主題階段 · Stages — Introduced: <strong>{d.loopStages.introduced}</strong> · Practiced:{" "}
            <strong>{d.loopStages.practiced}</strong> · Tested: <strong>{d.loopStages.tested}</strong>
            {d.loopStages.advanced > 0 ? (
              <>
                {" "}
                · 進階 Tested+: <strong>{d.loopStages.advanced}</strong>
              </>
            ) : null}
          </span>
          {d.activeModuleKey ? (
            <span className="text-slate-500">
              目前模組指標 · Module pointer: <strong>{d.activeModuleKey}</strong>
            </span>
          ) : null}
        </div>
      </section>

      {/* 3. Recent trend + momentum */}
      <section className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AppCard padding="md">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">最近閉環活動 · Recent loop activity</h2>
          <p className="mb-3 text-xs text-slate-500">近 7 天完成的 LearningSession（非舊 StudySession）</p>
          {d.recentLoopSessions.length > 0 ? (
            <ul className="space-y-2">
              {d.recentLoopSessions.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm"
                >
                  <span className="font-mono text-xs text-slate-500">{MODE_LABEL[s.mode] ?? s.mode}</span>
                  <span className="text-slate-700">{s.topicKey ?? "—"}</span>
                  <span className="text-xs text-slate-400">
                    {s.endedAt.toLocaleString("zh-TW", { hour12: false })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              {d.hasUser
                ? "尚無近七日完成的閉環場次。完成練習／驗收／複習後會出現在此。"
                : "登入後會顯示你的閉環場次紀錄。"}
            </p>
          )}
        </AppCard>

        <AppCard padding="md">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">估分動能 · Momentum</h2>
          {d.momentum.kind === "insufficient" ? (
            <p className="text-sm leading-relaxed text-slate-600">{d.momentum.reasonZh}</p>
          ) : (
            <div>
              <p className="font-medium text-slate-900">{d.momentum.labelZh}</p>
              <p className="text-xs text-slate-500">{d.momentum.labelEn}</p>
              {d.momentum.detailZh ? <p className="mt-2 text-sm text-primary-800">{d.momentum.detailZh}</p> : null}
              {d.momentum.detailEn ? <p className="text-xs text-slate-500">{d.momentum.detailEn}</p> : null}
            </div>
          )}
        </AppCard>
      </section>

      <p className="text-center text-xs text-slate-400">
        舊版「題庫總數／StudySession 場次」等指標已從首頁移除；需要舊訓練引擎請使用{" "}
        <Link href="/training" className="font-medium text-slate-600 underline underline-offset-2">
          /training
        </Link>
        。
      </p>
    </div>
  );
}
