"use server";

import { revalidatePath } from "next/cache";

import type { Prisma } from "../../../generated/prisma";
import {
  DEFAULT_KEY_PHRASES,
  DEFAULT_TRANSCRIPT_PLACEHOLDER,
  defaultDictationLines,
  defaultRound1Questions,
  defaultRound2Questions,
  defaultShadowingLines,
} from "@/lib/listening/default-workbook-content";
import { getOrCreateDevUser } from "@/lib/dev-user";
import { prisma } from "@/lib/prisma";

export type ListeningActionResult = { ok: true } | { ok: false; error: string };

export async function createListeningWorkbook(formData: FormData): Promise<ListeningActionResult & { id?: string }> {
  const user = await getOrCreateDevUser();
  if (!user) {
    return { ok: false, error: "no_user" };
  }

  const title = String(formData.get("title") ?? "").trim();
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim();
  const sourceLabel = String(formData.get("sourceLabel") ?? "").trim() || null;
  const startRaw = String(formData.get("startSec") ?? "").trim();
  const endRaw = String(formData.get("endSec") ?? "").trim();
  const startSec = startRaw === "" ? null : Number.parseFloat(startRaw);
  const endSec = endRaw === "" ? null : Number.parseFloat(endRaw);

  if (!title || !sourceUrl) {
    return { ok: false, error: "missing_title_or_url" };
  }

  const row = await prisma.listeningWorkbook.create({
    data: {
      title,
      sourceLabel,
      sourceUrl,
      startSec: startSec != null && Number.isFinite(startSec) ? startSec : null,
      endSec: endSec != null && Number.isFinite(endSec) ? endSec : null,
      transcript: DEFAULT_TRANSCRIPT_PLACEHOLDER,
      keyPhrasesJson: DEFAULT_KEY_PHRASES as unknown as Prisma.InputJsonValue,
      questionsRound1Json: defaultRound1Questions() as unknown as Prisma.InputJsonValue,
      questionsRound2Json: defaultRound2Questions() as unknown as Prisma.InputJsonValue,
      dictationLinesJson: defaultDictationLines() as unknown as Prisma.InputJsonValue,
      shadowingLinesJson: defaultShadowingLines() as unknown as Prisma.InputJsonValue,
      takeawayHintZh: "用一句話寫：你學到最有用的一點是什麼？",
      tomorrowReviewHintZh: "明天回顧時，最想先複習哪 1–2 個點？",
    },
    select: { id: true },
  });

  revalidatePath("/listening");
  return { ok: true, id: row.id };
}

export async function saveListeningWorkbookProgress(params: {
  workbookId: string;
  round1Answers?: Record<string, number>;
  round2Answers?: Record<string, number>;
  dictationAnswers?: Record<string, string>;
  shadowingChecked?: string[];
  takeawayUser?: string;
  tomorrowReviewPoints?: string[];
  lastStepSeen?: number;
}): Promise<ListeningActionResult> {
  const user = await getOrCreateDevUser();
  if (!user) {
    return { ok: false, error: "no_user" };
  }

  const wb = await prisma.listeningWorkbook.findFirst({ where: { id: params.workbookId } });
  if (!wb) {
    return { ok: false, error: "not_found" };
  }

  await prisma.userListeningWorkbookProgress.upsert({
    where: {
      userId_workbookId: { userId: user.id, workbookId: params.workbookId },
    },
    create: {
      userId: user.id,
      workbookId: params.workbookId,
      round1AnswersJson: params.round1Answers as unknown as Prisma.InputJsonValue,
      round2AnswersJson: params.round2Answers as unknown as Prisma.InputJsonValue,
      dictationAnswersJson: params.dictationAnswers as unknown as Prisma.InputJsonValue,
      shadowingCheckedJson: params.shadowingChecked as unknown as Prisma.InputJsonValue,
      takeawayUser: params.takeawayUser,
      tomorrowReviewPointsJson: params.tomorrowReviewPoints as unknown as Prisma.InputJsonValue,
      lastStepSeen: params.lastStepSeen ?? 1,
    },
    update: {
      ...(params.round1Answers != null ? { round1AnswersJson: params.round1Answers as unknown as Prisma.InputJsonValue } : {}),
      ...(params.round2Answers != null ? { round2AnswersJson: params.round2Answers as unknown as Prisma.InputJsonValue } : {}),
      ...(params.dictationAnswers != null ? { dictationAnswersJson: params.dictationAnswers as unknown as Prisma.InputJsonValue } : {}),
      ...(params.shadowingChecked != null ? { shadowingCheckedJson: params.shadowingChecked as unknown as Prisma.InputJsonValue } : {}),
      ...(params.takeawayUser != null ? { takeawayUser: params.takeawayUser } : {}),
      ...(params.tomorrowReviewPoints != null ? { tomorrowReviewPointsJson: params.tomorrowReviewPoints as unknown as Prisma.InputJsonValue } : {}),
      ...(params.lastStepSeen != null ? { lastStepSeen: params.lastStepSeen } : {}),
    },
  });

  revalidatePath("/listening");
  revalidatePath(`/listening/${params.workbookId}`);
  return { ok: true };
}
