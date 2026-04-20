import type { LessonMicroCard } from "@/lib/parse-lesson-micro-cards";

import SafeMarkdown from "./SafeMarkdown";
import ExampleCard from "./ExampleCard";
import LessonCard from "./LessonCard";
import MicroCheckCard from "./MicroCheckCard";
import RuleCard from "./RuleCard";
import TrapCard from "./TrapCard";

type LessonMicroCardBodyProps = {
  card: LessonMicroCard;
};

const MD_WRAP =
  "learn-markdown-card [&_p]:my-2.5 [&_p]:leading-relaxed [&_li]:my-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:text-slate-900 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-slate-800";

/** When the ## title only repeats the card type, skip the big H2 to avoid duplication with the eyebrow. */
function displayHeading(title: string): string | undefined {
  const t = title.trim();
  const skip = new Set([
    "核心規則",
    "識別信號",
    "例句",
    "常見錯誤",
    "常見陷阱",
    "快速自測",
    "應試提示",
    "導讀",
    "內容",
  ]);
  if (skip.has(t)) {
    return undefined;
  }
  return t;
}

/**
 * Renders one micro-card with the right visual level; 應試提示 body stays inside a collapsed &lt;details&gt;.
 */
export default function LessonMicroCardBody({ card }: LessonMicroCardBodyProps) {
  const title = card.title.trim();
  const body = card.bodyMarkdown.trim();
  const h2 = displayHeading(title);

  const markdown = <SafeMarkdown markdown={body || "（此段落尚無內容）"} className={MD_WRAP} />;

  switch (card.kind) {
    case "rule":
      return (
        <RuleCard variant="rule" title={h2}>
          {markdown}
        </RuleCard>
      );
    case "signals":
      return (
        <RuleCard variant="signals" title={h2}>
          {markdown}
        </RuleCard>
      );
    case "example":
      return <ExampleCard title={h2}>{markdown}</ExampleCard>;
    case "trap":
      return <TrapCard title={h2}>{markdown}</TrapCard>;
    case "check":
      return <MicroCheckCard title={h2}>{markdown}</MicroCheckCard>;
    case "tip":
      return (
        <LessonCard
          eyebrow={
            <span>
              應試提示 · Exam tip
            </span>
          }
          title={h2}
          tone="muted"
          className="border-slate-200/70 bg-slate-100/50"
        >
          <details className="group rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 open:shadow-sm">
            <summary className="cursor-pointer select-none text-sm font-semibold text-slate-700 marker:text-slate-400">
              展開詳細說明 · Expand
            </summary>
            <div className="mt-3 border-t border-slate-100 pt-3">{markdown}</div>
          </details>
        </LessonCard>
      );
    case "intro":
      return (
        <LessonCard
          eyebrow={
            <span>
              導讀 · Overview
            </span>
          }
          title={h2}
          tone="neutral"
          className="bg-slate-50/60"
        >
          {markdown}
        </LessonCard>
      );
    case "generic":
    default:
      return (
        <LessonCard
          eyebrow={
            <span>
              學習 · Learn
            </span>
          }
          title={h2 ?? title}
          tone="neutral"
          className="bg-slate-50/60"
        >
          {markdown}
        </LessonCard>
      );
  }
}
