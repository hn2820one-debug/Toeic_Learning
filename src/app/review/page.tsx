import Link from "next/link";

import BilingualHeading from "@/components/ui/BilingualHeading";
import AppCard from "@/components/ui/AppCard";
import { getReviewPageView } from "@/lib/review-page-loader";
import { primaryButtonClass } from "@/lib/ui/form-classes";

import ReviewSessionClient, { ReviewStartClient } from "./ReviewSessionClient";

export const dynamic = "force-dynamic";

type ReviewPageProps = {
  searchParams?: { session?: string; pos?: string };
};

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const sessionId = typeof searchParams?.session === "string" ? searchParams.session : undefined;
  const pos = Number.parseInt(typeof searchParams?.pos === "string" ? searchParams.pos : "0", 10) || 0;

  const view = await getReviewPageView({ sessionId, pos });

  if (view.kind === "no_user") {
    return (
      <div>
        <BilingualHeading titleZh="複習" titleEn="Review" descriptionZh="" descriptionEn="" />
        <AppCard className="border-amber-200 bg-amber-50/90">
          <p className="text-sm text-amber-950">需要學習者帳號才能寫入複習紀錄。</p>
        </AppCard>
      </div>
    );
  }

  if (view.kind === "empty") {
    return (
      <div>
        <BilingualHeading
          titleZh="複習"
          titleEn="Review"
          descriptionZh="目前沒有 FSRS 到期或可取用的新卡；維持複習節奏請先從學習／練習累積題卡。"
          descriptionEn="No due or new FSRS cards in the queue right now."
        />
        <AppCard padding="md" className="border-slate-200">
          <p className="text-sm text-slate-700">
            佇列概況 · Queue: due {view.queueStats.dueCount} · new {view.queueStats.newCount} · learning{" "}
            {view.queueStats.learningCount}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/learn" className={primaryButtonClass}>
              今日學習 · /learn
            </Link>
            <Link
              href="/training"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              訓練 · Training
            </Link>
            <Link
              href="/test"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              驗收 · Test
            </Link>
          </div>
        </AppCard>
      </div>
    );
  }

  if (view.kind === "ready") {
    return (
      <div>
        <BilingualHeading
          titleZh="FSRS 複習"
          titleEn="FSRS review"
          descriptionZh="題目來自到期卡優先，其次依 `getTodayQueue` 混入新卡；作答後立即顯示解析，並以 Again/Hard/Good/Easy 寫回 FSRS。"
          descriptionEn="Due-first queue from FSRS; immediate explanations; ratings persist via applyRating."
        />
        <div className="mb-6 rounded-2xl border border-violet-200/80 bg-violet-50/90 px-4 py-3 text-sm text-violet-950">
          <p className="font-semibold">佇列 · Queue</p>
          <p className="mt-1">
            due（含 learning 步進）來源列 · Due rows: {view.sourceMeta.dueInQueue} · 新卡列 · New rows:{" "}
            {view.sourceMeta.newInQueue} · 合計（helper）· Total: {view.sourceMeta.totalFromHelper} · 本場預排 · Session:{" "}
            {view.sourceMeta.sessionQuestionCount}
          </p>
          <p className="mt-2 text-xs text-violet-900/90">
            儀表板 `getQueueStats()` 的 dueCount 僅計 Review+Relearning；此處取題與 `getTodayQueue` 一致（含 Learning due）。
          </p>
        </div>
        <AppCard padding="md">
          {view.resumeCandidate ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              <p className="font-semibold">偵測到未完成複習場次</p>
              <div className="mt-1">
                <Link
                  href={`/review?session=${encodeURIComponent(view.resumeCandidate.sessionId)}&pos=0`}
                  className="font-semibold underline"
                >
                  接續舊場次
                </Link>
              </div>
            </div>
          ) : null}
          <ReviewStartClient />
        </AppCard>
      </div>
    );
  }

  if (view.kind === "session") {
    if (view.status === "abandoned") {
      return (
        <div>
          <BilingualHeading titleZh="複習" titleEn="Review" descriptionZh="" descriptionEn="" />
          <ReviewSessionClient
            sessionId={view.sessionId}
            status="abandoned"
            questions={[]}
            initialPos={0}
            itemStatesJson={[]}
          />
        </div>
      );
    }

    return (
      <div>
        <BilingualHeading
          titleZh="FSRS 複習"
          titleEn="FSRS review"
          descriptionZh={
            view.status === "completed"
              ? "本場次已完成；下方為統計與後續建議。"
              : "維持記憶，非總測驗；每題作答後可立即看解析並評分。"
          }
          descriptionEn={
            view.status === "completed" ? "Session summary below." : "Maintenance review — not a final exam."
          }
        />
        <ReviewSessionClient
          sessionId={view.sessionId}
          status={view.status}
          questions={view.questions}
          initialPos={view.currentPosition}
          itemStatesJson={view.itemStatesJson}
          ratingPreviews={view.ratingPreviews}
          summary={view.summary}
          queueStatsAfter={view.queueStatsAfter}
          nextStep={view.nextStep}
        />
      </div>
    );
  }

  return null;
}
