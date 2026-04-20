import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Marks the parent `LearningSession` as completed when the last item has been rated.
 */
export async function markReviewLearningSessionCompleted(sessionId: string) {
  await prisma.learningSession.update({
    where: { id: sessionId },
    data: {
      status: "completed",
      endedAt: new Date(),
    },
  });
}
