import type { ReactNode } from "react";
import clsx from "clsx";

type LessonCardTone = "neutral" | "muted";

type LessonCardProps = {
  /** Bilingual or single-line label above the title. */
  eyebrow?: ReactNode;
  title?: ReactNode;
  children: ReactNode;
  tone?: LessonCardTone;
  className?: string;
};

/**
 * Base shell for one micro-lesson screen: constrained width, generous spacing, soft surface.
 */
export default function LessonCard({ eyebrow, title, children, tone = "neutral", className }: LessonCardProps) {
  return (
    <section
      className={clsx(
        "mx-auto w-full max-w-2xl rounded-2xl border px-5 py-6 shadow-sm md:px-7 md:py-8",
        tone === "neutral" && "border-slate-200/90 bg-white",
        tone === "muted" && "border-slate-200/80 bg-slate-50/90",
        className,
      )}
    >
      {(eyebrow != null || title != null) && (
        <header className="mb-5 space-y-1.5">
          {eyebrow != null ? <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{eyebrow}</p> : null}
          {title != null ? <h2 className="text-lg font-bold leading-snug text-slate-900 md:text-xl">{title}</h2> : null}
        </header>
      )}
      <div className="space-y-4 text-[15px] leading-relaxed text-slate-800">{children}</div>
    </section>
  );
}
