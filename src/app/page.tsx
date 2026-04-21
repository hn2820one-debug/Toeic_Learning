import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Clock, Layers, Map, Sparkles } from "lucide-react";

import AppCard from "@/components/ui/AppCard";
import BilingualHeading from "@/components/ui/BilingualHeading";
import { getDashboardDataV2 } from "@/lib/dashboard/get-dashboard-data-v2";
import { composedTaskBadgeKey } from "@/lib/learning-path";
import { primaryButtonClass } from "@/lib/ui/form-classes";

export const dynamic = "force-dynamic";

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

const MODE_LABEL: Record<string, string> = {
  learn: "LEARN",
  practice: "PRACTICE",
  test: "TEST",
  review: "REVIEW",
  mixed: "MIXED",
};

export default async function HomePage() {
  const d = await getDashboardDataV2();

  return (
    <div>
      <BilingualHeading
        titleZh="今日從邊開始？"
        titleEn="Your learning hub"
        descriptionZh="下面只突出一個主按鈕；順序同「今日學習」：先清到期複習，再跟 30 日排程，再按主題階段推進。"
        descriptionEn="One primary CTA — same order as /learn: review queue, then study plan, then topic stages."
      />

      {!d.hasUser ? (
        <AppCard className="mb-6 border-amber-200 bg-amber-50/90">
          <p className="text-sm font-medium text-amber-950">
            尚未建立學習者帳號時，統計會不完整；登入或啟用 bootstrap 後會個人化。
          </p>
        </AppCard>
      ) : null}

      {/* Primary CTA — single main action */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          主下一步 · Next step
        </h2>
        {d.primaryCta ? (
          <AppCard padding="lg" className="border-primary-200/90 bg-gradient-to-br from-primary-50/95 to-white shadow-md">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-lg px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white ${KIND_LABEL[composedTaskBadgeKey(d.primaryCta)].badgeClass}`}
                  >
                    {KIND_LABEL[composedTaskBadgeKey(d.primaryCta)].zh} ·{" "}
                    {KIND_LABEL[composedTaskBadgeKey(d.primaryCta)].en}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Clock size={14} aria-hidden />~{d.primaryCta.estimatedMins} min
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">{d.primaryCta.title}</h3>
                <p className="text-sm leading-relaxed text-slate-700">{d.primaryCta.reason}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href={d.primaryCta.href}
                  className={`${primaryButtonClass} inline-flex items-center justify-center gap-2 px-8 py-3 text-base`}
                >
                  去做這步 · Go
                  <ArrowRight size={18} aria-hidden />
                </Link>
                <Link
                  href="/learn"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                >
                  打開今日清單 · /learn
                </Link>
              </div>
            </div>
          </AppCard>
        ) : (
          <AppCard padding="lg" className="border-emerald-200 bg-emerald-50/90 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={28} aria-hidden />
            </div>
            <p className="text-lg font-semibold text-emerald-950">暫時冇排隊任務 · Nothing queued</p>
            <p className="mt-2 text-sm text-emerald-900/90">可以自主去今日學習或能力地圖逛逛。</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/learn" className={primaryButtonClass}>
                今日學習 · /learn
              </Link>
              <Link
                href="/review"
                className="inline-flex items-center justify-center rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 shadow-sm hover:bg-emerald-50"
              >
                複習 · /review
              </Link>
            </div>
          </AppCard>
        )}
      </section>

      {/* Snapshot strip */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          狀態一覽 · At a glance
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AppCard padding="md" className="border-rose-100 bg-rose-50/50">
            <p className="text-xs font-medium text-rose-900/85">今日到期複習（約）</p>
            <p className="mt-1 text-2xl font-bold text-rose-950">{d.dueReviewCount}</p>
            <p className="mt-1 text-[11px] text-rose-800/80">FSRS due + learning</p>
          </AppCard>
          <AppCard padding="md" className="border-slate-100 bg-slate-50/80">
            <p className="text-xs font-medium text-slate-700">今日完成場次</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{d.sessionsCompletedToday}</p>
            <p className="mt-1 text-[11px] text-slate-500">LearningSession 已完成</p>
          </AppCard>
          <AppCard padding="md" className="border-slate-100 bg-slate-50/80">
            <p className="text-xs font-medium text-slate-700">本週完成場次</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{d.sessionsCompletedWeek}</p>
            <p className="mt-1 text-[11px] text-slate-500">近 7 天</p>
          </AppCard>
          <AppCard padding="md" className="border-violet-100 bg-violet-50/50">
            <p className="text-xs font-medium text-violet-900/85">進行中模組／技能</p>
            <p className="mt-1 text-sm font-semibold text-violet-950">
              {d.activeModuleLabel ?? "—"}
              {d.activePlanSkillLabelZh ? (
                <span className="mt-1 block text-xs font-normal text-violet-800/90">
                  計劃主技能 · {d.activePlanSkillLabelZh}
                </span>
              ) : (
                <span className="mt-1 block text-xs font-normal text-violet-700/80">見 30 日計劃當日</span>
              )}
            </p>
          </AppCard>
        </div>
        <AppCard padding="md" className="mt-3 border-slate-200/90">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">練習／驗收摘要</p>
          <p className="mt-2 text-sm text-slate-700">{d.checkpointPracticeSummaryZh}</p>
        </AppCard>
      </section>

      {/* Loop + nav */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          閉環進度 · Loop
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AppCard padding="md" className="border-emerald-100 bg-emerald-50/50">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-emerald-600 p-2 text-white">
                <BookOpen size={20} aria-hidden />
              </div>
              <div>
                <p className="text-xs font-medium text-emerald-900/80">LEARN 已完成主題</p>
                <p className="mt-2 text-3xl font-bold text-emerald-950">{d.topicsLearnCompletedCount}</p>
              </div>
            </div>
          </AppCard>
          <AppCard padding="md" className="border-sky-100 bg-sky-50/50">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-sky-600 p-2 text-white">
                <Layers size={20} aria-hidden />
              </div>
              <div>
                <p className="text-xs font-medium text-sky-900/80">待練習（Introduced）</p>
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
                <p className="text-xs font-medium text-amber-900/80">待驗收（Practiced）</p>
                <p className="mt-2 text-3xl font-bold text-amber-950">{d.loopStages.practiced}</p>
              </div>
            </div>
          </AppCard>
          <AppCard padding="md" className="border-slate-100 bg-white">
            <p className="text-xs font-medium text-slate-600">快速前往</p>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                <Link href="/progress" className="font-semibold text-primary-700 underline underline-offset-2">
                  <Map className="mr-1 inline" size={14} />
                  能力地圖 · Progress
                </Link>
              </li>
              <li>
                <Link href="/studyplan" className="font-semibold text-primary-700 underline underline-offset-2">
                  30 日計劃 · Study plan
                </Link>
              </li>
            </ul>
          </AppCard>
        </div>
      </section>

      <section className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AppCard padding="md">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">最近活動 · Recent</h2>
          <p className="mb-3 text-xs text-slate-500">近 7 天完成的 LearningSession</p>
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
              {d.hasUser ? "尚無近七日紀錄。" : "登入後顯示。"}
            </p>
          )}
        </AppCard>

        <AppCard padding="md">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">估分參考 · Momentum</h2>
          {d.momentum.kind === "insufficient" ? (
            <p className="text-sm leading-relaxed text-slate-600">{d.momentum.reasonZh}</p>
          ) : (
            <div>
              <p className="font-medium text-slate-900">{d.momentum.labelZh}</p>
              <p className="text-xs text-slate-500">{d.momentum.labelEn}</p>
              {d.momentum.detailZh ? <p className="mt-2 text-sm text-primary-800">{d.momentum.detailZh}</p> : null}
            </div>
          )}
        </AppCard>
      </section>

      <p className="text-center text-xs text-slate-400">
        舊版訓練引擎仍於{" "}
        <Link href="/training" className="font-medium text-slate-600 underline underline-offset-2">
          /training
        </Link>
        。
      </p>
    </div>
  );
}
