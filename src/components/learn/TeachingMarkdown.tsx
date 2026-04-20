"use client";

import CollapsibleNote from "@/components/ui/collapsible-note";

import SafeMarkdown from "./SafeMarkdown";

const MD_COMPACT =
  "prose-slate max-w-prose text-[15px] leading-relaxed text-slate-800 [&_p]:my-2 [&_li]:my-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:text-slate-900";

type TeachingMarkdownProps = {
  markdown: string;
  /** Above this length, overflow goes into collapsible “full text”. */
  collapseThreshold?: number;
};

function splitHeadParagraphs(text: string, maxChars: number): { lead: string; rest: string } {
  const t = text.trim();
  if (t.length <= maxChars) {
    return { lead: t, rest: "" };
  }
  const cut = t.slice(0, maxChars);
  const lastBreak = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf("\n"), cut.lastIndexOf(". "));
  const at = lastBreak > 40 ? lastBreak + 1 : maxChars;
  return { lead: t.slice(0, at).trim(), rest: t.slice(at).trim() };
}

/**
 * Markdown with optional collapse so paragraphs do not read as an endless wall.
 */
export default function TeachingMarkdown({ markdown, collapseThreshold = 220 }: TeachingMarkdownProps) {
  const raw = markdown.trim();
  if (!raw) {
    return <p className="text-sm text-slate-500">（尚無內容）</p>;
  }
  if (raw.length <= collapseThreshold) {
    return <SafeMarkdown markdown={raw} className={MD_COMPACT} />;
  }
  const { lead, rest } = splitHeadParagraphs(raw, collapseThreshold);
  return (
    <div className="space-y-3">
      <SafeMarkdown markdown={lead} className={MD_COMPACT} />
      {rest ? (
        <CollapsibleNote summaryZh="進一步說明" summaryEn="More detail">
          <SafeMarkdown markdown={rest} className={MD_COMPACT} />
        </CollapsibleNote>
      ) : null}
    </div>
  );
}
