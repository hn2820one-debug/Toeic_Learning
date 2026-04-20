"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useTransition } from "react";

import SafeMarkdown from "@/components/learn/SafeMarkdown";
import AppCard from "@/components/ui/AppCard";
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
  const safePos = n === 0 ? 0 : Math.min(Math.max(0, lessonPos), n - 1);
  const current = lessons[safePos] ?? null;

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
    if (seenSent.current.has(safePos)) {
      return;
    }
    seenSent.current.add(safePos);
    startTransition(() => {
      void markLessonSeenAction(topicKey, safePos);
    });
  }, [hasUser, n, safePos, topicKey]);

  const goLesson = useCallback(
    (next: number) => {
      const p = n === 0 ? 0 : Math.min(Math.max(0, next), n - 1);
      router.push(`/learn/${topicKey}?lesson=${p}`);
    },
    [n, router, topicKey],
  );

  const onUnderstood = () => {
    if (!hasUser || !current) {
      return;
    }
    startTransition(() => {
      void markLessonUnderstoodAction(topicKey, safePos).then(() => router.refresh());
    });
  };

  const onReexplain = () => {
    if (!hasUser || !current) {
      return;
    }
    startTransition(() => {
      void requestReExplanationAction(topicKey, current.id).then(() => {
        router.refresh();
        // Placeholder UX — no LLM in this slice
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">LEARN · 理解取向（不計分）</p>
          <h1 className="text-xl font-bold text-slate-900">{topicLabel}</h1>
          <p className="text-sm text-slate-500">
            第 {safePos + 1} / {n} 節 · Lesson {safePos + 1} of {n}
          </p>
        </div>
        {!hasUser ? (
          <p className="max-w-sm text-right text-xs text-amber-800">
            未登入／未建立學習者：可閱讀內容，進度無法寫入資料庫。
          </p>
        ) : null}
      </div>

      <AppCard padding="md">
        {current?.bodyMarkdown?.trim() ? (
          <SafeMarkdown markdown={current.bodyMarkdown} />
        ) : (
          <p className="text-sm text-slate-600">此節尚無正文（bodyMarkdown 為空）。</p>
        )}

        <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-200 pt-6">
          <button
            type="button"
            disabled={safePos <= 0 || pending}
            onClick={() => goLesson(safePos - 1)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            上一節 · Previous
          </button>
          <button
            type="button"
            disabled={!hasUser || pending}
            onClick={onUnderstood}
            className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            我理解了 · Got it
          </button>
          <button
            type="button"
            disabled={!hasUser || pending}
            onClick={onReexplain}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            再解釋一次 · Re-explain (stub)
          </button>
          <button
            type="button"
            disabled={safePos >= n - 1 || pending}
            onClick={() => goLesson(safePos + 1)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            下一節 · Next
          </button>
        </div>

        {hasUser ? (
          <p className="mt-4 text-xs text-slate-500">
            已標為理解：{learnProgress.understood.length} / {n} 節 · Understood segments
          </p>
        ) : null}
      </AppCard>
    </div>
  );
}
