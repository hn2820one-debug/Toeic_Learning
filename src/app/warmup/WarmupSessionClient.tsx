"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import ChoiceFeedbackPanel from "@/components/session/ChoiceFeedbackPanel";
import SessionHeader from "@/components/session/SessionHeader";
import AppCard from "@/components/ui/AppCard";
import CollapsibleNote from "@/components/ui/collapsible-note";
import { LearningSurface } from "@/components/ui/learning-surface";
import SectionLabel from "@/components/ui/section-label";
import { buildChoiceFeedback } from "@/lib/choice-feedback";
import { splitExplanationForFeedback } from "@/lib/explanation-split";
import { parsePracticeItemState } from "@/lib/practice/practice-state";
import type { WarmupQuestionPayload } from "@/lib/session/warmup-page-loader";
import { WARMUP_TIME_BUDGET_SEC, warmupContinuationPath, type WarmupTargetFlow } from "@/lib/session/warmup";
import { primaryButtonClass } from "@/lib/ui/form-classes";

import {
  abandonWarmupSession,
  completeWarmupSession,
  resolveWarmupTimeExpired,
  skipWarmupItem,
  submitWarmupAnswer,
} from "./actions";

type WarmupSessionClientProps = {
  topicKey: string;
  label: string;
  flow: WarmupTargetFlow;
  sessionId: string;
  status: "active" | "completed" | "abandoned";
  questions: WarmupQuestionPayload[];
  initialPos: number;
  itemStatesJson: unknown[];
  startedAtIso: string;
};

export default function WarmupSessionClient({
  topicKey,
  label,
  flow,
  sessionId,
  status,
  questions,
  initialPos,
  itemStatesJson,
  startedAtIso,
}: WarmupSessionClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [localReveal, setLocalReveal] = useState<string | null>(null);
  const expiredSent = useRef(false);

  const n = questions.length;
  const safePos = n === 0 ? 0 : Math.min(Math.max(0, initialPos), n - 1);
  const q = questions[safePos];
  const states = useMemo(
    () => itemStatesJson.map((raw) => parsePracticeItemState(raw)),
    [itemStatesJson],
  );
  const st = states[safePos] ?? parsePracticeItemState(null);
  const isLast = n > 0 && safePos === n - 1;

  const allResolved =
    n > 0 && states.every((s) => s.status === "solved" || s.status === "revealed");

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remainingSec = useMemo(() => {
    const startedMs = Date.parse(startedAtIso);
    const elapsed = Math.max(0, (Date.now() - startedMs) / 1000);
    return Math.max(0, Math.ceil(WARMUP_TIME_BUDGET_SEC - elapsed));
  }, [startedAtIso, tick]);

  useEffect(() => {
    if (status !== "active" || remainingSec > 0 || expiredSent.current) {
      return;
    }
    expiredSent.current = true;
    startTransition(() => {
      void resolveWarmupTimeExpired(sessionId).then(() => router.refresh());
    });
  }, [remainingSec, sessionId, status, router]);

  const go = (pos: number) => {
    router.push(
      `/warmup?topicKey=${encodeURIComponent(topicKey)}&flow=${encodeURIComponent(flow)}&session=${encodeURIComponent(sessionId)}&pos=${pos}`,
    );
  };

  const onSubmit = (choice: string) => {
    setLocalReveal(null);
    const submitKey = `${sessionId}-${safePos}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    startTransition(() => {
      void submitWarmupAnswer(sessionId, safePos, choice, submitKey).then((r) => {
        if (r.ok && "revealAnswer" in r && r.revealAnswer) {
          setLocalReveal(r.revealAnswer);
        }
        router.refresh();
      });
    });
  };

  const onSkipItem = () => {
    setLocalReveal(null);
    startTransition(() => {
      void skipWarmupItem(sessionId, safePos).then(() => router.refresh());
    });
  };

  const onFinishWarmup = () => {
    startTransition(() => {
      void completeWarmupSession(sessionId).then(() => router.refresh());
    });
  };

  const onAbandon = () => {
    startTransition(() => {
      void abandonWarmupSession(sessionId).then(() => {
        router.push(warmupContinuationPath(topicKey, flow));
      });
    });
  };

  const lastAttempt = st.attempts.length > 0 ? st.attempts[st.attempts.length - 1]! : null;
  const expl = useMemo(() => splitExplanationForFeedback(q?.explanation ?? null), [q?.explanation]);
  const choiceFeedback = useMemo(() => {
    if (!q || !lastAttempt || lastAttempt.choice === "SKIP") return null;
    return buildChoiceFeedback({
      questionText: q.questionText,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      selectedChoice: lastAttempt.choice,
      correctChoice: q.correctAnswer,
      isCorrect: lastAttempt.correct === true,
      explanation: q.explanation,
    });
  }, [lastAttempt, q]);

  if (status === "abandoned") {
    return (
      <AppCard>
        <p className="text-slate-700">熱身已略過或結束。</p>
        <Link href={warmupContinuationPath(topicKey, flow)} className="mt-3 inline-block font-semibold text-primary-700">
          進入主線 · Continue
        </Link>
      </AppCard>
    );
  }

  if (status === "completed") {
    return (
      <LearningSurface>
        <AppCard padding="md" className="border-emerald-200/70 bg-emerald-50/50">
          <h2 className="text-lg font-semibold text-emerald-950">熱身完成</h2>
          <p className="mt-2 text-sm text-emerald-900">可以開始今天的主線學習了。</p>
          <div className="mt-4">
            <Link href={warmupContinuationPath(topicKey, flow)} className={primaryButtonClass}>
              進入主線 · Continue
            </Link>
          </div>
        </AppCard>
      </LearningSurface>
    );
  }

  if (!q) {
    return (
      <AppCard>
        <p>無題目資料。</p>
      </AppCard>
    );
  }

  return (
    <div className="space-y-6">
      <LearningSurface>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SessionHeader
            mode="practice"
            current={safePos + 1}
            total={n}
            titleZh={`熱身 · ${label}`}
            subtitleZh={`非正式成績 · 約 ${remainingSec} 秒剩餘`}
            topicOrModuleLabel="2 分鐘熱身"
          />
          <button
            type="button"
            disabled={pending}
            onClick={onAbandon}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            略過熱身 · Skip
          </button>
        </div>
      </LearningSurface>

      <LearningSurface>
        <AppCard padding="md" className="border-slate-200/80 bg-white/90">
          <p className="text-sm font-medium text-slate-800">
            熱身 {safePos + 1}/{n} · 剩餘約 {remainingSec} 秒
          </p>

          <div className="mt-4 space-y-3">
            <SectionLabel kind="stem" />
            <p className="max-w-prose whitespace-pre-wrap text-[15px] leading-relaxed text-slate-900">{q.questionText}</p>
          </div>

          <div className="mt-6 space-y-3">
            <SectionLabel kind="options" />
            <div className="grid gap-2 sm:grid-cols-2">
              {(["A", "B", "C", "D"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  disabled={st.status !== "open" || pending}
                  onClick={() => onSubmit(k)}
                  className="rounded-xl border border-slate-200/90 bg-slate-50/50 px-3 py-3 text-left text-sm leading-relaxed text-slate-800 shadow-sm hover:bg-white disabled:opacity-40"
                >
                  <span className="font-semibold text-primary-700">{k}.</span>{" "}
                  {k === "A" ? q.optionA : k === "B" ? q.optionB : k === "C" ? q.optionC : q.optionD}
                </button>
              ))}
            </div>
          </div>

          {st.status === "open" ? (
            <div className="mt-4">
              <button
                type="button"
                disabled={pending}
                onClick={onSkipItem}
                className="text-sm font-semibold text-slate-600 underline underline-offset-4 hover:text-slate-900"
              >
                略過此題 · Skip item
              </button>
            </div>
          ) : null}

          {choiceFeedback && st.status === "open" && lastAttempt && !lastAttempt.correct ? (
            <div className="mt-6">
              <ChoiceFeedbackPanel feedback={choiceFeedback} tone="wrong" />
            </div>
          ) : null}

          {st.status !== "open" ? (
            <div className="mt-6 space-y-4 rounded-2xl border border-sky-100/90 bg-sky-50/35 p-4">
              <SectionLabel kind="feedback" />
              {lastAttempt?.choice === "SKIP" ? (
                <p className="text-sm leading-relaxed text-slate-800">此題已略過（熱身不計正式成績）。</p>
              ) : choiceFeedback ? (
                <ChoiceFeedbackPanel
                  feedback={choiceFeedback}
                  tone={lastAttempt?.correct === true ? "correct" : "wrong"}
                />
              ) : null}
              {expl.detail.trim().length > 0 ? (
                <CollapsibleNote summaryZh="簡短解析" summaryEn="Brief">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{expl.detail}</p>
                </CollapsibleNote>
              ) : expl.summary ? (
                <p className="text-sm leading-relaxed text-slate-800">{expl.summary}</p>
              ) : null}
              {localReveal ? (
                <CollapsibleNote summaryZh="補充" summaryEn="Extra" tone="default">
                  <p className="whitespace-pre-wrap text-sm text-slate-800">{localReveal}</p>
                </CollapsibleNote>
              ) : null}
            </div>
          ) : null}

          {st.status !== "open" ? (
            <div className="mt-6 flex flex-wrap gap-3">
              {!isLast ? (
                <button type="button" disabled={pending} onClick={() => go(safePos + 1)} className={primaryButtonClass}>
                  下一題 · Next
                </button>
              ) : allResolved ? (
                <button type="button" disabled={pending} onClick={onFinishWarmup} className={primaryButtonClass}>
                  完成熱身 · Finish warm-up
                </button>
              ) : null}
            </div>
          ) : null}
        </AppCard>
      </LearningSurface>
    </div>
  );
}
