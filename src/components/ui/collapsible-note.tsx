"use client";

import type { ReactNode } from "react";
import clsx from "clsx";

type CollapsibleNoteProps = {
  summaryZh: string;
  summaryEn: string;
  children: ReactNode;
  /** When true, starts expanded (use sparingly). */
  defaultOpen?: boolean;
  className?: string;
  /** Muted strip — for secondary detail; does not compete with stem/options. */
  tone?: "default" | "subtle";
};

/**
 * Long explanations / secondary detail — default collapsed to reduce wall-of-text fatigue.
 */
export default function CollapsibleNote({
  summaryZh,
  summaryEn,
  children,
  defaultOpen = false,
  className,
  tone = "subtle",
}: CollapsibleNoteProps) {
  return (
    <details
      className={clsx(
        "rounded-xl border px-4 py-3",
        tone === "subtle" && "border-slate-200/70 bg-slate-50/70",
        tone === "default" && "border-slate-200 bg-white/90",
        className,
      )}
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-600 marker:content-none [&::-webkit-details-marker]:hidden">
        {summaryZh}
        <span className="mx-1.5 font-normal text-slate-400">·</span>
        <span className="font-normal text-slate-500">{summaryEn}</span>
      </summary>
      <div className="mt-3 border-t border-slate-200/60 pt-3 text-[15px] leading-relaxed text-slate-800">{children}</div>
    </details>
  );
}
