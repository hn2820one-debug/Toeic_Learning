type LessonProgressHeaderProps = {
  topicLabel: string;
  lessonIndex: number;
  lessonCount: number;
  cardIndex: number;
  cardCount: number;
  lessonTitleZh?: string;
  lessonTitleEn?: string;
};

/**
 * Compact progress for topic → lesson → micro-card (one concept per screen).
 */
export default function LessonProgressHeader({
  topicLabel,
  lessonIndex,
  lessonCount,
  cardIndex,
  cardCount,
  lessonTitleZh,
  lessonTitleEn,
}: LessonProgressHeaderProps) {
  const lessonPct = lessonCount > 0 ? ((lessonIndex + 1) / lessonCount) * 100 : 0;
  const cardPct = cardCount > 0 ? ((cardIndex + 1) / cardCount) * 100 : 0;

  return (
    <div className="mx-auto w-full max-w-xl space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-slate-500">
        <span className="font-medium text-slate-600">{topicLabel}</span>
        <span>
          課節 {lessonIndex + 1}/{lessonCount} · 概念卡 {cardIndex + 1}/{Math.max(cardCount, 1)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/90">
        <div
          className="h-full rounded-full bg-primary-500/85 transition-[width] duration-300 ease-out"
          style={{ width: `${lessonPct}%` }}
          title="Topic lesson progress"
        />
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-slate-200/70">
        <div
          className="h-full rounded-full bg-sky-500/75 transition-[width] duration-300 ease-out"
          style={{ width: `${cardPct}%` }}
          title="Cards in this lesson"
        />
      </div>
      {lessonTitleZh != null || lessonTitleEn != null ? (
        <p className="text-sm font-semibold text-slate-800">
          {lessonTitleZh}
          {lessonTitleZh != null && lessonTitleEn != null ? <span className="mx-1.5 font-normal text-slate-400">·</span> : null}
          {lessonTitleEn != null ? <span className="font-normal text-slate-600">{lessonTitleEn}</span> : null}
        </p>
      ) : null}
    </div>
  );
}
