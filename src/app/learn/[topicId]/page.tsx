import { notFound } from "next/navigation";

import BilingualHeading from "@/components/ui/BilingualHeading";
import { getLearnTopicPageData } from "@/lib/learn-topic-page";
import { clampCardIndex, markdownToDisplayBlocks } from "@/lib/learn/lesson-display";

import LearnTopicClient from "./LearnTopicClient";

export const dynamic = "force-dynamic";

type LearnTopicPageProps = {
  params: { topicId: string };
  searchParams?: { lesson?: string; card?: string };
};

function parseLessonIndex(raw: string | undefined, max: number): number {
  if (max <= 0) {
    return 0;
  }
  const n = Number.parseInt(raw ?? "0", 10);
  if (Number.isNaN(n)) {
    return 0;
  }
  return Math.min(Math.max(0, n), max - 1);
}

function parseCardIndex(raw: string | undefined, max: number): number {
  const n = Number.parseInt(raw ?? "0", 10);
  const idx = Number.isNaN(n) ? 0 : n;
  return clampCardIndex(idx, max);
}

export default async function LearnTopicPage({ params, searchParams }: LearnTopicPageProps) {
  const data = await getLearnTopicPageData(params.topicId);
  if (data.kind === "not_found") {
    notFound();
  }

  const lessonPos = parseLessonIndex(
    typeof searchParams?.lesson === "string" ? searchParams.lesson : undefined,
    data.lessons.length,
  );

  const currentLesson = data.lessons[lessonPos];
  const displayBlocks = markdownToDisplayBlocks(currentLesson?.bodyMarkdown ?? "");
  const cardPos = parseCardIndex(
    typeof searchParams?.card === "string" ? searchParams.card : undefined,
    displayBlocks.length,
  );

  return (
    <div>
      <BilingualHeading
        titleZh="主題學習"
        titleEn="Topic learn"
        descriptionZh="理解取向：不計分、不計時。每屏一個概念；完成所有課節後才進入練習。"
        descriptionEn="Understanding-first: one concept per screen. Finish all lessons before practice."
      />

      <LearnTopicClient
        topicKey={data.topicKey}
        topicLabel={data.topicLabel}
        lessons={data.lessons}
        lessonPos={lessonPos}
        displayBlocks={displayBlocks}
        cardPos={cardPos}
        learnProgress={data.learnProgress}
        stage={data.stage}
        learnCompletedAtIso={data.learnCompletedAt?.toISOString() ?? null}
        hasUser={data.hasUser}
        showAdminHint={data.showAdminHint}
      />
    </div>
  );
}
