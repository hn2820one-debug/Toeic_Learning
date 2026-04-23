import "server-only";

import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import {
  buildClassificationStrip,
  type ClassificationStripProps,
  type LearningModeUi,
} from "@/lib/learning-content-classification";
import { primaryModuleForTopic } from "@/lib/learning-path-rules";
import { prisma } from "@/lib/prisma";

/**
 * Server-side banner payload for practice / test entry and in-session headers.
 */
export async function loadSessionClassificationStrip(input: {
  topicKey: Phase1TopicKey;
  skillCode?: string | null;
  moduleKey?: string | null;
  mode: LearningModeUi;
}): Promise<ClassificationStripProps> {
  const mod = primaryModuleForTopic(input.topicKey);
  const moduleKey = input.moduleKey?.trim() || mod.moduleKey;
  const code = input.skillCode?.trim() || null;
  const row = code
    ? await prisma.learningSkill.findUnique({
        where: { skillCode: code },
        select: { skillCode: true, labelZh: true, category: true },
      })
    : null;

  return buildClassificationStrip({
    skillCode: row?.skillCode ?? code,
    skillCategory: row?.category ?? null,
    skillLabelZh: row?.labelZh ?? null,
    topicKey: input.topicKey,
    moduleKey,
    mode: input.mode,
  });
}
