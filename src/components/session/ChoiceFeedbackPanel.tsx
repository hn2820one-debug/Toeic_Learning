import type { ChoiceFeedback } from "@/lib/choice-feedback";
import SectionLabel from "@/components/ui/section-label";
import clsx from "clsx";

export type ChoiceFeedbackTone = "wrong" | "correct" | "timeout";

const TONE_WRAP: Record<ChoiceFeedbackTone, string> = {
  wrong: "border-orange-200/80 bg-orange-50/35",
  correct: "border-emerald-200/70 bg-emerald-50/40",
  timeout: "border-amber-200/80 bg-amber-50/45",
};

const TITLE: Record<ChoiceFeedbackTone, { zh: string; en: string }> = {
  wrong: { zh: "干擾項分析", en: "Distractor analysis" },
  correct: { zh: "作答回饋", en: "Feedback" },
  timeout: { zh: "逾時回饋", en: "Timeout note" },
};

export default function ChoiceFeedbackPanel({
  feedback,
  tone,
  className,
}: {
  feedback: ChoiceFeedback;
  tone: ChoiceFeedbackTone;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl border p-4 shadow-sm",
        TONE_WRAP[tone],
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <SectionLabel kind={tone === "wrong" ? "trap" : tone === "timeout" ? "timer" : "answer"} />
        <span className="text-sm font-semibold text-slate-900">
          {TITLE[tone].zh} · {TITLE[tone].en}
        </span>
      </div>

      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-white/70 bg-white/60 px-3 py-2">
          <dt className="text-xs text-slate-500">你選了 · Yours</dt>
          <dd className="font-mono text-sm font-semibold text-slate-900">{feedback.selectedChoice}</dd>
        </div>
        <div className="rounded-lg border border-white/70 bg-white/60 px-3 py-2">
          <dt className="text-xs text-slate-500">正解 · Correct</dt>
          <dd className="font-mono text-sm font-semibold text-emerald-800">{feedback.correctChoice}</dd>
        </div>
      </dl>

      <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-800">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            點解會似啱 · Why it looked plausible
          </p>
          <p className="mt-1">{feedback.whySelectedLooksPlausible}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            決定性差異 · Decisive difference
          </p>
          <p className="mt-1">{feedback.decisiveDifference}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            一句規則 · Rule
          </p>
          <p className="mt-1 font-medium text-slate-900">{feedback.ruleInOneSentence}</p>
        </div>
        {feedback.retryTip ? (
          <div className="rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2">
            <p className="text-xs font-semibold text-slate-500">再試提示 · Retry</p>
            <p className="mt-0.5">{feedback.retryTip}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
