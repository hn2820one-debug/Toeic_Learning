import type { ReactNode } from "react";

import LessonCard from "./LessonCard";

type ExampleCardProps = {
  title?: ReactNode;
  children: ReactNode;
};

/**
 * Example / sample sentences — calmer green-tinted band for contrast with rules.
 */
export default function ExampleCard({ title, children }: ExampleCardProps) {
  return (
    <LessonCard
      eyebrow={
        <span>
          例句 · Examples
        </span>
      }
      title={title}
      tone="neutral"
      className="border-emerald-200/80 bg-emerald-50/45"
    >
      {children}
    </LessonCard>
  );
}
