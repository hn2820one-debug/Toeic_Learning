import type { ReactNode } from "react";

import LessonCard from "./LessonCard";

type TrapCardProps = {
  title?: ReactNode;
  children: ReactNode;
};

/**
 * Common mistakes / traps — warm rose tint without alarm styling.
 */
export default function TrapCard({ title, children }: TrapCardProps) {
  return (
    <LessonCard
      eyebrow={
        <span>
          常見錯誤 · Pitfalls
        </span>
      }
      title={title}
      tone="neutral"
      className="border-amber-200/90 bg-amber-50/40"
    >
      {children}
    </LessonCard>
  );
}
