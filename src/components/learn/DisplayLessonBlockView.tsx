"use client";

import type { DisplayLessonBlock } from "@/lib/learn/lesson-display";
import SectionLabel from "@/components/ui/section-label";
import { LearningSurface } from "@/components/ui/learning-surface";
import CollapsibleNote from "@/components/ui/collapsible-note";

import LessonCard from "./LessonCard";
import SafeMarkdown from "./SafeMarkdown";
import TeachingMarkdown from "./TeachingMarkdown";

const MD_SHORT =
  "prose-slate max-w-prose text-[15px] leading-relaxed text-slate-800 [&_p]:my-2 [&_li]:my-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:text-slate-900";

type DisplayLessonBlockViewProps = {
  block: DisplayLessonBlock;
};

/**
 * Renders one pedagogical display block — layered labels, soft surfaces, no raw doc wall.
 */
export default function DisplayLessonBlockView({ block }: DisplayLessonBlockViewProps) {
  switch (block.type) {
    case "example_pair":
      return (
        <LearningSurface>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <SectionLabel kind="example" />
            </div>
            <LessonCard
              eyebrow={
                <span>
                  例句對照 · Example first
                </span>
              }
              title="先看句子，再抽規則"
              className="border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/60 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">正句 / 推薦</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-relaxed text-emerald-950">{block.correct}</p>
                </div>
                <div className="rounded-xl border border-rose-200/90 bg-rose-50/55 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-800">易誤 / 對照</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-rose-950">
                    {block.wrong?.trim() ? block.wrong : "（本節未標示誤句時，請專注正句訊號。）"}
                  </p>
                </div>
              </div>
              <div className="mt-5 rounded-xl border border-slate-100 bg-white/90 px-4 py-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <SectionLabel kind="signal" />
                  <span className="text-xs text-slate-500">差異觀察 · What to notice</span>
                </div>
                <TeachingMarkdown markdown={block.explanation} collapseThreshold={180} />
              </div>
            </LessonCard>
          </div>
        </LearningSurface>
      );

    case "pattern_signal":
      return (
        <LearningSurface>
          <div className="space-y-3">
            <SectionLabel kind="signal" />
            <LessonCard
              eyebrow={
                <span>
                  識別信號 · Pattern signals
                </span>
              }
              title="圈出「像答案」的線索"
              className="border-sky-200/80 bg-sky-50/45"
            >
              <TeachingMarkdown markdown={block.text} />
            </LessonCard>
          </div>
        </LearningSurface>
      );

    case "rule":
      return (
        <LearningSurface>
          <div className="space-y-3">
            <SectionLabel kind="rule" />
            <LessonCard
              eyebrow={
                <span>
                  核心規則 · Core rule
                </span>
              }
              title="收成可執行的步驟"
              className="border-l-[3px] border-l-primary-500/80 bg-primary-50/30"
            >
              <TeachingMarkdown markdown={block.text} />
            </LessonCard>
          </div>
        </LearningSurface>
      );

    case "trap":
      return (
        <LearningSurface>
          <div className="space-y-3">
            <SectionLabel kind="trap" />
            <LessonCard
              eyebrow={
                <span>
                  常見陷阱 · Pitfall
                </span>
              }
              title="為什麼會誤判？"
              className="border-amber-200/90 bg-amber-50/40"
            >
              <dl className="space-y-4">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-amber-900/90">誤選長什麼樣</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-900">{block.wrongChoice || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-amber-900/90">為何看起來合理</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{block.whyItLooksRight || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-amber-900/90">實際為何錯</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{block.whyItsWrong || "—"}</dd>
                </div>
              </dl>
            </LessonCard>
          </div>
        </LearningSurface>
      );

    case "exam_tip":
      return (
        <LearningSurface>
          <div className="space-y-3">
            <SectionLabel kind="hint" />
            <LessonCard eyebrow={<span>應試提示 · Exam tip</span>} tone="muted" className="border-slate-200/70 bg-slate-100/50">
              <CollapsibleNote summaryZh="展開應試細節" summaryEn="Expand tips" defaultOpen={false}>
                <SafeMarkdown markdown={block.text} className={MD_SHORT} />
              </CollapsibleNote>
            </LessonCard>
          </div>
        </LearningSurface>
      );

    case "micro_check":
      return (
        <LearningSurface>
          <div className="space-y-3">
            <SectionLabel kind="micro" />
            <LessonCard
              eyebrow={
                <span>
                  10 秒自測 · Micro check
                </span>
              }
              title="先自己想，再揭曉"
              className="border-violet-200/90 bg-violet-50/35"
            >
              <p className="text-base font-semibold leading-snug text-slate-900">{block.question}</p>
              {block.options != null && block.options.length > 0 ? (
                <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-800">
                  {block.options.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ol>
              ) : null}
              <CollapsibleNote summaryZh="查看答案（建議先想 10 秒）" summaryEn="Reveal answer" defaultOpen={false}>
                <p className="text-sm font-semibold text-violet-950">參考答案：{block.answer}</p>
                {block.explanation.trim() ? <SafeMarkdown markdown={block.explanation} className={`mt-2 ${MD_SHORT}`} /> : null}
              </CollapsibleNote>
            </LessonCard>
          </div>
        </LearningSurface>
      );

    default:
      return null;
  }
}
