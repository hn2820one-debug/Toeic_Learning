import type { ReactNode } from "react";
import clsx from "clsx";

type AppCardProps = {
  children: ReactNode;
  id?: string;
  className?: string;
  padding?: "md" | "lg";
  /** Add a colored top accent stripe for visual hierarchy. */
  accent?: "primary" | "emerald" | "amber" | "rose" | null;
};

const paddingClass = {
  md: "p-5 md:p-6",
  lg: "p-6 md:p-8",
};

const accentClass: Record<NonNullable<AppCardProps["accent"]>, string> = {
  primary: "before:bg-primary-500",
  emerald: "before:bg-emerald-500",
  amber: "before:bg-amber-500",
  rose: "before:bg-rose-500",
};

/**
 * Shared surface for main content: white card, soft border, layered shadow,
 * and an optional colored top accent for strong visual hierarchy.
 */
export default function AppCard({ children, id, className, padding = "lg", accent = null }: AppCardProps) {
  return (
    <div
      id={id}
      className={clsx(
        "relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card ring-1 ring-slate-900/[0.02]",
        accent
          ? `before:absolute before:inset-x-0 before:top-0 before:h-1 ${accentClass[accent]} before:content-['']`
          : null,
        paddingClass[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}
