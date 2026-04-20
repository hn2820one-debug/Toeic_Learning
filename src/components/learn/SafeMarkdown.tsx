"use client";

import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

type SafeMarkdownProps = {
  markdown: string;
  className?: string;
};

/**
 * Renders Markdown with HTML stripped via rehype-sanitize (no raw HTML injection).
 */
export default function SafeMarkdown({ markdown, className }: SafeMarkdownProps) {
  return (
    <div
      className={
        className ??
        "learn-markdown max-w-none text-[15px] leading-relaxed text-slate-800 [&_h2]:mt-6 [&_h2]:border-b [&_h2]:border-slate-200 [&_h2]:pb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h2]:first:mt-0 [&_li]:my-1 [&_p]:my-2 [&_strong]:text-slate-900 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
      }
    >
      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{markdown}</ReactMarkdown>
    </div>
  );
}
