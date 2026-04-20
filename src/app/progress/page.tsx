import Link from "next/link";

import ProgressRow from "@/components/progress/ProgressRow";
import StageBadge from "@/components/progress/StageBadge";
import AppCard from "@/components/ui/AppCard";
import BilingualHeading from "@/components/ui/BilingualHeading";
import { LearningSurface, learningSectionGap } from "@/components/ui/learning-surface";
import { buildProgressPageModel } from "@/lib/progress-view-model";
import { stageLabelBilingual } from "@/lib/stage-progress-actions";
import type { TopicProgressStage } from "../../../generated/prisma";

export const dynamic = "force-dynamic";

const LEGEND_STAGES: TopicProgressStage[] = ["New", "Introduced", "Practiced", "Tested", "Mastered", "Maintained"];

export default async function ProgressPage() {
  const model = await buildProgressPageModel();

  const allNew =
    model.kind === "ready" &&
    model.overview.newCount === model.overview.totalTopics &&
    model.overview.introducedCount === 0 &&
    model.overview.practicedCount === 0;

  return (
    <div className={learningSectionGap}>
      <BilingualHeading
        titleZh="能力地圖"
        titleEn="Mastery map"
        descriptionZh="依 Phase 1 模組檢視每個主題的閉環階段與下一步；資料來自 UserTopicProgress / ModuleProgress，而非舊 DailySession。"
        descriptionEn="Phase 1 modules and stages; per-topic CTAs use the same learning-path engine as /learn and the home next action."
      />

      {model.kind === "no_user" ? (
        <AppCard className="mb-6 border-amber-200 bg-amber-50/90">
          <p className="text-sm font-medium text-amber-950">
            尚未建立學習者帳號：下方主題列為預設「未開始」，登入後會顯示你的實際階段。
          </p>
        </AppCard>
      ) : null}

      <LearningSurface>
      {/* Overview */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">整體總覽 · Overview</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <AppCard padding="md" className="px-3 py-3 text-center">
            <p className="text-[11px] text-slate-500">精通 / 總主題</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {model.overview.masteredCount} / {model.overview.totalTopics}
            </p>
            <p className="text-[10px] text-slate-400">Mastered+Maintained</p>
          </AppCard>
          <AppCard padding="md" className="px-3 py-3 text-center">
            <p className="text-[11px] text-slate-500">已驗收+ / 總</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {model.overview.testedPipelineCount} / {model.overview.totalTopics}
            </p>
            <p className="text-[10px] text-slate-400">Tested pipeline</p>
          </AppCard>
          <AppCard padding="md" className="px-3 py-3 text-center">
            <p className="text-[11px] text-slate-500">Introduced</p>
            <p className="mt-1 text-2xl font-bold text-sky-800">{model.overview.introducedCount}</p>
          </AppCard>
          <AppCard padding="md" className="px-3 py-3 text-center">
            <p className="text-[11px] text-slate-500">Practiced</p>
            <p className="mt-1 text-2xl font-bold text-amber-800">{model.overview.practicedCount}</p>
          </AppCard>
          <AppCard padding="md" className="px-3 py-3 text-center">
            <p className="text-[11px] text-slate-500">仍新主題</p>
            <p className="mt-1 text-2xl font-bold text-slate-700">{model.overview.newCount}</p>
          </AppCard>
          <AppCard padding="md" className="px-3 py-3 text-center">
            <p className="text-[11px] text-slate-500">FSRS 到期（約）</p>
            <p className="mt-1 text-2xl font-bold text-rose-800">{model.overview.reviewDueApprox}</p>
            <p className="text-[10px] text-slate-400">due + learning</p>
          </AppCard>
        </div>
      </section>

      {model.kind === "ready" && model.moduleProgressRows.length > 0 ? (
        <AppCard padding="md" className="mb-6">
          <p className="text-sm font-medium text-slate-800">模組狀態（ModuleProgress）</p>
          <ul className="mt-2 flex flex-wrap gap-2 text-xs">
            {model.moduleProgressRows.map((m) => (
              <li key={m.moduleKey} className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-slate-700">
                {m.moduleKey}: {m.status}
              </li>
            ))}
          </ul>
        </AppCard>
      ) : null}

      {allNew ? (
        <AppCard className="mb-6 border-sky-200 bg-sky-50/90">
          <p className="text-sm text-sky-950">
            所有主題仍為「未開始」：請從今日學習挑一個主題進入 LEARN，或依下方 CTA 開始。
          </p>
          <Link href="/learn" className="mt-3 inline-block text-sm font-semibold text-primary-700 underline">
            前往今日學習 · /learn
          </Link>
        </AppCard>
      ) : null}

      {/* Legend */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">階段圖例 · Stage legend</h2>
        <div className="flex flex-wrap gap-2">
          {LEGEND_STAGES.map((s) => (
            <StageBadge key={s} stage={s} />
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          色碼與「能力地圖」列一致 · Same tones as rows. {stageLabelBilingual("New").zh} →{" "}
          {stageLabelBilingual("Maintained").zh} 為閉環前進方向。
        </p>
      </section>

      {/* By module */}
      <section className="space-y-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">依模組分組 · By module</h2>
        <p className="-mt-4 text-xs text-slate-500">
          分組規則與 `primaryModuleForTopic()` 相同（每主題歸入第一個涵蓋它的 Phase 1 模組）。
        </p>
        {model.sections.map((sec) => (
          <div key={sec.moduleKey}>
            <h3 className="mb-2 text-base font-semibold text-slate-900">{sec.titleZh}</h3>
            <p className="mb-3 text-sm text-slate-500">{sec.titleEn}</p>
            {sec.topics.length === 0 ? (
              <p className="text-sm text-slate-500">此模組目前沒有對應主題列。</p>
            ) : (
              <ul className="space-y-3">
                {sec.topics.map((row) => (
                  <li key={row.topicKey}>
                    <ProgressRow row={row} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>

      <p className="mt-10 max-w-prose text-center text-xs leading-relaxed text-slate-400">
        全站「下一步」排序與本頁主題 CTA 皆來自同一套 learning path engine（<code className="rounded bg-slate-100 px-1">getRankedLearningTasks</code> /{" "}
        <code className="rounded bg-slate-100 px-1">getTopicProgressActions</code>）。
        儀表板與今日學習：
        <Link href="/" className="underline">
          首頁
        </Link>
        、
        <Link href="/learn" className="underline">
          /learn
        </Link>
        。
      </p>
      </LearningSurface>
    </div>
  );
}
