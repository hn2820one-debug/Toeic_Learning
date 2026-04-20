import type { ReactNode } from "react";
import clsx from "clsx";

/** Max readable width for teaching content (not full-bleed admin). */
export const LEARNING_CONTENT_MAX = "max-w-2xl";

/**
 * Centers teaching column; pair with {@link LearningPageCanvas} for soft page background.
 */
export function LearningSurface({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("mx-auto w-full min-w-0", LEARNING_CONTENT_MAX, className)}>{children}</div>;
}

/**
 * Soft, low-contrast page panel — reduces “white document” fatigue vs raw `bg-white` full bleed.
 */
export function LearningPageCanvas({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-slate-200/60 bg-gradient-to-b from-slate-50/90 via-slate-50/50 to-slate-100/30 p-4 shadow-inner md:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Vertical rhythm between major teaching blocks. */
export const learningSectionGap = "space-y-6 md:space-y-8";
