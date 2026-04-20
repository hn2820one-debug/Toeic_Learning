import clsx from "clsx";

export type TeachingSectionKind =
  | "rule"
  | "example"
  | "signal"
  | "hint"
  | "trap"
  | "answer"
  | "stem"
  | "options"
  | "feedback"
  | "timer"
  | "micro"
  | "next";

const KIND: Record<
  TeachingSectionKind,
  { zh: string; en: string; className: string }
> = {
  rule: {
    zh: "核心規則",
    en: "Core rule",
    className: "bg-primary-50/90 text-primary-950 ring-1 ring-primary-200/70",
  },
  example: {
    zh: "例句／對照",
    en: "Example",
    className: "bg-emerald-50/90 text-emerald-950 ring-1 ring-emerald-200/70",
  },
  signal: {
    zh: "識別訊號",
    en: "Signals",
    className: "bg-sky-50/90 text-sky-950 ring-1 ring-sky-200/70",
  },
  hint: {
    zh: "提示",
    en: "Hint",
    className: "bg-amber-50/80 text-amber-950 ring-1 ring-amber-200/60",
  },
  trap: {
    zh: "常見陷阱",
    en: "Pitfall",
    className: "bg-orange-50/85 text-orange-950 ring-1 ring-orange-200/65",
  },
  answer: {
    zh: "正解解釋",
    en: "Answer & why",
    className: "bg-violet-50/85 text-violet-950 ring-1 ring-violet-200/65",
  },
  stem: {
    zh: "題目",
    en: "Stem",
    className: "bg-slate-100/95 text-slate-900 ring-1 ring-slate-200/80",
  },
  options: {
    zh: "選項",
    en: "Choices",
    className: "bg-white text-slate-800 ring-1 ring-slate-200/80",
  },
  feedback: {
    zh: "回饋",
    en: "Feedback",
    className: "bg-sky-50/85 text-sky-950 ring-1 ring-sky-200/65",
  },
  timer: {
    zh: "時間壓力",
    en: "Time",
    className: "bg-amber-50/70 text-amber-950 ring-1 ring-amber-200/50",
  },
  micro: {
    zh: "微測／練習",
    en: "Check",
    className: "bg-violet-50/80 text-violet-950 ring-1 ring-violet-200/60",
  },
  next: {
    zh: "下一步",
    en: "Next",
    className: "bg-slate-100/90 text-slate-900 ring-1 ring-slate-200/70",
  },
};

type SectionLabelProps = {
  kind: TeachingSectionKind;
  className?: string;
};

/**
 * Small pill label so learners always know which layer of the page they are reading.
 */
export default function SectionLabel({ kind, className }: SectionLabelProps) {
  const k = KIND[kind];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        k.className,
        className,
      )}
    >
      <span>{k.zh}</span>
      <span className="font-normal opacity-80">·</span>
      <span className="font-normal normal-case tracking-normal">{k.en}</span>
    </span>
  );
}
