import "server-only";

import type { TopicProgressStage } from "../../generated/prisma";

import { PHASE1_TOPIC_LABELS } from "@/content/programs/phase1/skill-map";
import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { validateLessonStructure } from "@/lib/content-qa-rules";
import { getOrCreateDevUser } from "@/lib/dev-user";
import { parseLearnProgressJson } from "@/lib/learn-progress-json";
import { prisma } from "@/lib/prisma";

export type LearnTopicLessonRow = {
  id: string;
  lessonIndex: number;
  titleZh: string;
  titleEn: string;
  bodyMarkdown: string | null;
  moduleKey: string;
};

export type LearnTopicPageData =
  | { kind: "not_found" }
  | {
      kind: "ok";
      topicKey: Phase1TopicKey;
      topicLabel: string;
      lessons: LearnTopicLessonRow[];
      stage: TopicProgressStage | null;
      learnCompletedAt: Date | null;
      learnProgress: ReturnType<typeof parseLearnProgressJson>;
      hasUser: boolean;
      showAdminHint: boolean;
    };

function isPhase1TopicKey(id: string): id is Phase1TopicKey {
  return (PHASE1_TOPIC_KEYS_IN_ORDER as readonly string[]).includes(id);
}

async function ensureLearningTopicRow(topicKey: Phase1TopicKey) {
  const orderIndex = PHASE1_TOPIC_KEYS_IN_ORDER.indexOf(topicKey);
  const raw = PHASE1_TOPIC_LABELS[topicKey];
  const parts = raw.split(" / ").map((s) => s.trim());
  await prisma.learningTopic.upsert({
    where: { topicKey },
    create: {
      topicKey,
      orderIndex: orderIndex === -1 ? 0 : orderIndex,
      labelZh: parts[0] ?? raw,
      labelEn: parts[1] ?? parts[0] ?? raw,
    },
    update: {},
  });
}

export async function getLearnTopicPageData(topicId: string): Promise<LearnTopicPageData> {
  if (!isPhase1TopicKey(topicId)) {
    return { kind: "not_found" };
  }
  const topicKey = topicId;

  const lessonsRaw = await prisma.lesson.findMany({
    where: { topicKey },
    orderBy: { lessonIndex: "asc" },
    select: {
      id: true,
      lessonIndex: true,
      titleZh: true,
      titleEn: true,
      bodyMarkdown: true,
      moduleKey: true,
    },
  });

  const lessons: LearnTopicLessonRow[] = lessonsRaw.map((r) => {
    // Runtime hardening: low-quality lesson body should degrade gracefully instead of crashing rendering.
    // Until DB qaStatus exists, derive from deterministic QA each load.
    const qaPassed = validateLessonStructure(r.bodyMarkdown ?? "").passed;
    return {
      id: r.id,
      lessonIndex: r.lessonIndex,
      titleZh: r.titleZh,
      titleEn: r.titleEn,
      bodyMarkdown: qaPassed ? r.bodyMarkdown : null,
      moduleKey: r.moduleKey,
    };
  });

  const user = await getOrCreateDevUser();
  if (!user) {
    return {
      kind: "ok",
      topicKey,
      topicLabel: PHASE1_TOPIC_LABELS[topicKey],
      lessons,
      stage: null,
      learnCompletedAt: null,
      learnProgress: parseLearnProgressJson(null),
      hasUser: false,
      showAdminHint: process.env.NODE_ENV === "development",
    };
  }

  await ensureLearningTopicRow(topicKey);

  const row = await prisma.userTopicProgress.findUnique({
    where: {
      userId_topicKey: { userId: user.id, topicKey },
    },
  });

  return {
    kind: "ok",
    topicKey,
    topicLabel: PHASE1_TOPIC_LABELS[topicKey],
    lessons,
    stage: row?.stage ?? null,
    learnCompletedAt: row?.learnCompletedAt ?? null,
    learnProgress: parseLearnProgressJson(row?.learnProgressJson ?? null),
    hasUser: true,
    showAdminHint: process.env.NODE_ENV === "development" || process.env.ALLOW_LEARN_DEBUG === "1",
  };
}
