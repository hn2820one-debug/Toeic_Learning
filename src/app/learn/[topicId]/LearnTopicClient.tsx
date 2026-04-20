"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useTransition } from "react";

import DisplayLessonBlockView from "@/components/learn/DisplayLessonBlockView";
import LessonProgressHeader from "@/components/learn/LessonProgressHeader";
import AppCard from "@/components/ui/AppCard";
import { LearningPageCanvas, LearningSurface } from "@/components/ui/learning-surface";
import type { DisplayLessonBlock } from "@/lib/learn/lesson-display";
import type { LearnTopicLessonRow } from "@/lib/learn-topic-page";
import type { LearnProgressPayload } from "@/lib/learn-progress-json";
import { isAllLessonsUnderstood } from "@/lib/learn-progress-json";
import type { TopicProgressStage } from "../../../../generated/prisma";

import {
  markLessonSeenAction,
  markLessonUnderstoodAction,
  requestReExplanationAction,
} from "./actions";

type LearnTopicClientProps = {
  topicKey: string;
  topicLabel: string;
  lessons: LearnTopicLessonRow[];
  lessonPos: number;
  /** Pedagogical display blocks for the active lesson (server-parsed). */
  displayBlocks: DisplayLessonBlock[];
  cardPos: number;
  learnProgress: LearnProgressPayload;
  stage: TopicProgressStage | null;
  learnCompletedAtIso: string | null;
  hasUser: boolean;
  showAdminHint: boolean;
};

export default function LearnTopicClient({
  topicKey,
  topicLabel,
  lessons,
  lessonPos,
  displayBlocks,
  cardPos,
  learnProgress,
  stage,
  learnCompletedAtIso,
  hasUser,
  showAdminHint,
}: LearnTopicClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const seenSent = useRef<Set<number>>(new Set());

  const n = lessons.length;
  const safeLessonPos = n === 0 ? 0 : Math.min(Math.max(0, lessonPos), n - 1);
  const current = lessons[safeLessonPos] ?? null;

  const m = displayBlocks.length;
  const safeCardPos = m === 0 ? 0 : Math.min(Math.max(0, cardPos), m - 1);
  const isLastCard = m > 0 && safeCardPos >= m - 1;

  const showLearnCompleteBanner = useMemo(() => {
    if (n === 0) {
      return false;
    }
    if (learnCompletedAtIso) {
      return true;
    }
    return isAllLessonsUnderstood(n, learnProgress.understood) && stage === "Introduced";
  }, [n, learnCompletedAtIso, stage, learnProgress.understood]);

  useEffect(() => {
    if (!hasUser || n === 0) {
      return;
    }
    if (seenSent.current.has(safeLessonPos)) {
      return;
    }
    seenSent.current.add(safeLessonPos);
    startTransition(() => {
      void markLessonSeenAction(topicKey, safeLessonPos);
    });
  }, [hasUser, n, safeLessonPos, topicKey]);

  const pushLessonQuery = useCallback(
    (nextLesson: number, nextCard: number) => {
      const lp = n === 0 ? 0 : Math.min(Math.max(0, nextLesson), n - 1);
      const q = new URLSearchParams();
      q.set("lesson", String(lp));
      q.set("card", String(nextCard));
      router.push(`/learn/${topicKey}?${q.toString()}`);
    },
    [n, router, topicKey],
  );

  const goLesson = useCallback(
    (next: number) => {
      const lp = n === 0 ? 0 : Math.min(Math.max(0, next), n - 1);
      pushLessonQuery(lp, 0);
    },
    [n, pushLessonQuery],
  );

  const goCard = useCallback(
    (next: number) => {
      if (m <= 0) {
        return;
      }
      const cp = Math.min(Math.max(0, next), m - 1);
      pushLessonQuery(safeLessonPos, cp);
    },
    [m, pushLessonQuery, safeLessonPos],
  );

  const onUnderstood = () => {
    if (!hasUser || !current) {
      return;
    }
    startTransition(() => {
      void markLessonUnderstoodAction(topicKey, safeLessonPos).then(() => router.refresh());
    });
  };

  const onReexplain = () => {
    if (!hasUser || !current) {
      return;
    }
    startTransition(() => {
      void requestReExplanationAction(topicKey, current.id).then(() => {
        router.refresh();
        alert("已記錄「再解釋一次」次數（後台統計）。進階 AI 重述將另接，不在此步驟。");
      });
    });
  };

  if (n === 0) {
    return (
      <AppCard padding="md" className="border-amber-200/80 bg-amber-50/90">
        <p className="text-base font-semibold text-amber-950">此主題尚無課節內容 · No lessons yet</p>
        <p className="mt-2 text-sm text-amber-900/90">
          教材尚未生成或尚未匯入資料庫。請由管理流程執行內容工廠腳本預先生成課節；此頁不會在載入時同步呼叫 AI。
        </p>
        {showAdminHint ? (
          <p className="mt-3 rounded-xl border border-amber-300/80 bg-white/80 px-3 py-2 font-mono text-xs text-slate-700">
            Dev: npm run generate:lessons -- --topic={topicKey}
            <span className="mt-1 block text-slate-500">See docs/lesson-generation-runbook.md</span>
          </p>
        ) : null}
        <div className="mt-4">
          <Link
            href="/learn"
            className="text-sm font-semibold text-primary-700 underline underline-offset-4 hover:text-primary-900"
          >
            ← 回今日學習
          </Link>
        </div>
      </AppCard>
    );
  }

  const activeBlock = m > 0 ? displayBlocks[safeCardPos] : null;

  return (
    <div className="space-y-6">
      {showLearnCompleteBanner ? (
        <AppCard padding="md" className="border-emerald-200 bg-emerald-50/90">
          <p className="font-semibold text-emerald-950">你已讀完此主題的 LEARN 階段 · LEARN stage complete</p>
          <p className="mt-1 text-sm text-emerald-900/90">
            可隨時回來瀏覽課節；進度不會重置。接下來進入練習鞏固。
          </p>
          <Link
            href={`/practice?topicKey=${encodeURIComponent(topicKey)}`}
            className="mt-4 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
          >
            前往練習 · Go to practice
          </Link>
        </AppCard>
      ) : null}

      <LearningPageCanvas>
        <LearningSurface className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">LEARN · 例句優先 · 一屏一步</p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{topicLabel}</h1>
            {hasUser ? (
              <p className="mt-2 text-sm text-slate-600">
                <Link
                  href={`/warmup?topicKey=${encodeURIComponent(topicKey)}&flow=learn`}
                  className="font-semibold text-primary-700 underline underline-offset-4 hover:text-primary-900"
                >
                  先做 2 分鐘熱身（建議）
                </Link>
                <span className="text-slate-500"> · 不計分，只啟動大腦</span>
              </p>
            ) : null}
          </div>
          {!hasUser ? (
            <p className="max-w-sm text-right text-xs text-amber-800">
              未登入／未建立學習者：可閱讀內容，進度無法寫入資料庫。
            </p>
          ) : null}
        </div>

        <LessonProgressHeader
          topicLabel={topicLabel}
          lessonIndex={safeLessonPos}
          lessonCount={n}
          cardIndex={m > 0 ? safeCardPos : 0}
          cardCount={m > 0 ? m : 1}
          lessonTitleZh={current?.titleZh}
          lessonTitleEn={current?.titleEn}
        />

        <div className="min-h-[12rem]">
          {!current?.bodyMarkdown?.trim() ? (
            <AppCard padding="md" className="border-slate-200 bg-white/90">
              <p className="text-sm text-slate-700">
                此節正文未通過品質檢查或為空，暫不顯示。This segment failed QA or is empty.
              </p>
            </AppCard>
          ) : m === 0 || !activeBlock ? (
            <AppCard padding="md" className="border-slate-200 bg-white/90">
              <p className="text-sm text-slate-700">無法顯示此節教學步驟。Unable to render lesson steps.</p>
            </AppCard>
          ) : (
            <DisplayLessonBlockView block={activeBlock} />
          )}
        </div>

        <div className="space-y-6 border-t border-slate-200/80 pt-8">
          {current?.bodyMarkdown?.trim() && m > 0 ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={safeCardPos <= 0 || pending}
                onClick={() => goCard(safeCardPos - 1)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← 上一個概念 · Previous card
              </button>
              <button
                type="button"
                disabled={isLastCard || pending}
                onClick={() => goCard(safeCardPos + 1)}
                className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                下一步 · Next card
              </button>
            </div>
          ) : null}

          {current?.bodyMarkdown?.trim() && m > 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!hasUser || pending}
                onClick={onReexplain}
                className="text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ❓ 再解釋一次 · Re-explain
              </button>
            </div>
          ) : null}

          {current?.bodyMarkdown?.trim() && m > 0 && isLastCard ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!hasUser || pending}
                onClick={onUnderstood}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ✅ 我理解了 · Got it
              </button>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3 border-t border-dashed border-slate-200/90 pt-6">
            <button
              type="button"
              disabled={safeLessonPos <= 0 || pending}
              onClick={() => goLesson(safeLessonPos - 1)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              上一節 · Previous lesson
            </button>
            <button
              type="button"
              disabled={safeLessonPos >= n - 1 || pending}
              onClick={() => goLesson(safeLessonPos + 1)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一節 · Next lesson
            </button>
          </div>

          {hasUser ? (
            <p className="text-xs text-slate-500">
              已標為理解：{learnProgress.understood.length} / {n} 節 · Understood lessons
            </p>
          ) : null}

          <Link
            href="/learn"
            className="inline-block text-sm font-semibold text-primary-700 underline underline-offset-4 hover:text-primary-900"
          >
            ← 回今日學習 · Back to /learn
          </Link>
        </div>
        </LearningSurface>
      </LearningPageCanvas>
    </div>
  );
}
