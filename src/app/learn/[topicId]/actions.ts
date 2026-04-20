"use server";

import { revalidatePath } from "next/cache";

import type { Prisma } from "../../../../generated/prisma";

import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { getOrCreateDevUser } from "@/lib/dev-user";
import {
  addSeen,
  addUnderstood,
  incrementReexplain,
  isAllLessonsUnderstood,
  parseLearnProgressJson,
} from "@/lib/learn-progress-json";
import { prisma } from "@/lib/prisma";

function isPhase1TopicKey(id: string): id is Phase1TopicKey {
  return (PHASE1_TOPIC_KEYS_IN_ORDER as readonly string[]).includes(id);
}

async function ensureLearningTopicRow(topicKey: Phase1TopicKey) {
  const orderIndex = PHASE1_TOPIC_KEYS_IN_ORDER.indexOf(topicKey);
  const { PHASE1_TOPIC_LABELS } = await import("@/content/programs/phase1/skill-map");
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

type ActionResult = { ok: boolean; error?: string };

export async function markLessonSeenAction(topicKey: string, lessonPos: number): Promise<ActionResult> {
  if (!isPhase1TopicKey(topicKey)) {
    return { ok: false, error: "invalid_topic" };
  }
  const user = await getOrCreateDevUser();
  if (!user) {
    return { ok: false, error: "no_user" };
  }

  const lessonCount = await prisma.lesson.count({ where: { topicKey } });
  if (lessonCount === 0 || lessonPos < 0 || lessonPos >= lessonCount) {
    return { ok: false, error: "invalid_lesson" };
  }

  await ensureLearningTopicRow(topicKey);

  const row = await prisma.userTopicProgress.findUnique({
    where: { userId_topicKey: { userId: user.id, topicKey } },
  });
  const prev = parseLearnProgressJson(row?.learnProgressJson ?? null);
  const next = addSeen(prev, lessonPos);

  await prisma.userTopicProgress.upsert({
    where: { userId_topicKey: { userId: user.id, topicKey } },
    create: {
      userId: user.id,
      topicKey,
      stage: "New",
      learnProgressJson: next as unknown as Prisma.InputJsonValue,
    },
    update: {
      learnProgressJson: next as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath(`/learn/${topicKey}`);
  return { ok: true };
}

export async function markLessonUnderstoodAction(topicKey: string, lessonPos: number): Promise<ActionResult> {
  if (!isPhase1TopicKey(topicKey)) {
    return { ok: false, error: "invalid_topic" };
  }
  const user = await getOrCreateDevUser();
  if (!user) {
    return { ok: false, error: "no_user" };
  }

  const lessonCount = await prisma.lesson.count({ where: { topicKey } });
  if (lessonCount === 0 || lessonPos < 0 || lessonPos >= lessonCount) {
    return { ok: false, error: "invalid_lesson" };
  }

  await ensureLearningTopicRow(topicKey);

  const row = await prisma.userTopicProgress.findUnique({
    where: { userId_topicKey: { userId: user.id, topicKey } },
  });
  const prev = parseLearnProgressJson(row?.learnProgressJson ?? null);
  const next = addUnderstood(prev, lessonPos);
  const allDone = isAllLessonsUnderstood(lessonCount, next.understood);
  const now = new Date();

  const stage = row?.stage ?? "New";
  const updateData: Prisma.UserTopicProgressUpdateInput = {
    learnProgressJson: next as unknown as Prisma.InputJsonValue,
  };

  if (allDone) {
    updateData.learnCompletedAt = row?.learnCompletedAt ?? now;
    if (stage === "New") {
      updateData.stage = "Introduced";
    }
  }

  await prisma.userTopicProgress.upsert({
    where: { userId_topicKey: { userId: user.id, topicKey } },
    create: {
      userId: user.id,
      topicKey,
      stage: allDone ? "Introduced" : "New",
      learnProgressJson: next as unknown as Prisma.InputJsonValue,
      learnCompletedAt: allDone ? now : null,
    },
    update: updateData,
  });

  revalidatePath(`/learn/${topicKey}`);
  revalidatePath("/learn");
  return { ok: true };
}

/** Stub: increments counter in `learnProgressJson.reexplain` for analytics; no LLM call. */
export async function requestReExplanationAction(topicKey: string, lessonId: string): Promise<ActionResult & { count?: number }> {
  if (!isPhase1TopicKey(topicKey)) {
    return { ok: false, error: "invalid_topic" };
  }
  const user = await getOrCreateDevUser();
  if (!user) {
    return { ok: false, error: "no_user" };
  }

  await ensureLearningTopicRow(topicKey);

  const row = await prisma.userTopicProgress.findUnique({
    where: { userId_topicKey: { userId: user.id, topicKey } },
  });
  const prev = parseLearnProgressJson(row?.learnProgressJson ?? null);
  const next = incrementReexplain(prev, lessonId);
  const count = next.reexplain[lessonId] ?? 0;

  await prisma.userTopicProgress.upsert({
    where: { userId_topicKey: { userId: user.id, topicKey } },
    create: {
      userId: user.id,
      topicKey,
      stage: "New",
      learnProgressJson: next as unknown as Prisma.InputJsonValue,
    },
    update: {
      learnProgressJson: next as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath(`/learn/${topicKey}`);
  return { ok: true, count };
}
