import type { ReactNode } from "react";

import LessonCard from "./LessonCard";

type MicroCheckCardProps = {
  title?: ReactNode;
  children: ReactNode;
};

/**
 * Quick self-check — distinct violet-tinted surface.
 */
export default function MicroCheckCard({ title, children }: MicroCheckCardProps) {
  return (
    <LessonCard
      eyebrow={
        <span>
          快速自測 · Quick check
        </span>
      }
      title={title}
      tone="neutral"
      className="border-violet-200/90 bg-violet-50/35"
    >
      {children}
    </LessonCard>
  );
}
