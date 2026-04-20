import type { ReactNode } from "react";
import clsx from "clsx";

import LessonCard from "./LessonCard";

type RuleVariant = "rule" | "signals";

type RuleCardProps = {
  title?: ReactNode;
  children: ReactNode;
  variant?: RuleVariant;
};

const VARIANT_STYLES: Record<RuleVariant, string> = {
  rule: "border-l-[3px] border-l-primary-500 bg-primary-50/40",
  signals: "border-l-[3px] border-l-sky-500 bg-sky-50/50",
};

const VARIANT_EYEBROW: Record<RuleVariant, { zh: string; en: string }> = {
  rule: { zh: "核心規則", en: "Core rule" },
  signals: { zh: "識別信號", en: "Signals" },
};

/**
 * Primary conceptual card — core rule or recognition signals.
 */
export default function RuleCard({ title, children, variant = "rule" }: RuleCardProps) {
  const e = VARIANT_EYEBROW[variant];
  return (
    <LessonCard
      eyebrow={
        <span>
          {e.zh} · {e.en}
        </span>
      }
      title={title}
      tone="neutral"
      className={clsx(VARIANT_STYLES[variant])}
    >
      {children}
    </LessonCard>
  );
}
