import "server-only";

import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { prisma } from "@/lib/prisma";

/**
 * Topic-level checkpoint writeback. On fail, only increments `testAttempts` (bumps `updatedAt`).
 * Schema has no separate `lastActivityAt`.
 */
export async function applyCheckpointProgressWriteback(params: {
  userId: number;
  topicKey: Phase1TopicKey;
  passed: boolean;
  overallAccuracy: number;
}): Promise<void> {
  if (params.passed) {
    await prisma.userTopicProgress.update({
      where: { userId_topicKey: { userId: params.userId, topicKey: params.topicKey } },
      data: {
        stage: "Tested",
        testPassedAt: new Date(),
        testAccuracy: params.overallAccuracy,
        testAttempts: { increment: 1 },
      },
    });
    return;
  }

  await prisma.userTopicProgress.update({
    where: { userId_topicKey: { userId: params.userId, topicKey: params.topicKey } },
    data: {
      testAttempts: { increment: 1 },
    },
  });
}
