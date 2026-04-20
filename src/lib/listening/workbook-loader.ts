import "server-only";

import { prisma } from "@/lib/prisma";
import {
  parseDictationLines,
  parseMcqList,
  parseShadowingLines,
  parseStringList,
} from "@/lib/listening/workbook-types";
import type { DictationLine, ListeningMcqItem, ShadowingLine } from "@/lib/listening/workbook-types";

export type ListeningWorkbookView = {
  id: string;
  title: string;
  sourceLabel: string | null;
  sourceUrl: string;
  startSec: number | null;
  endSec: number | null;
  transcript: string;
  keyPhrases: string[];
  round1: ListeningMcqItem[];
  round2: ListeningMcqItem[];
  dictation: DictationLine[];
  shadowing: ShadowingLine[];
  takeawayHintZh: string | null;
  tomorrowReviewHintZh: string | null;
  updatedAt: string;
};

export type ListeningProgressView = {
  round1Answers: Record<string, number>;
  round2Answers: Record<string, number>;
  dictationAnswers: Record<string, string>;
  shadowingChecked: string[];
  takeawayUser: string;
  tomorrowReviewPoints: [string, string];
  lastStepSeen: number;
};

function parseAnswerMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const o = raw as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === "number" && v >= 0 && v <= 3) {
      out[k] = v;
    }
  }
  return out;
}

function parseStringMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const o = raw as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === "string") {
      out[k] = v;
    }
  }
  return out;
}

function parseTomorrowPoints(raw: unknown): [string, string] {
  if (!Array.isArray(raw)) {
    return ["", ""];
  }
  const a = typeof raw[0] === "string" ? raw[0] : "";
  const b = typeof raw[1] === "string" ? raw[1] : "";
  return [a, b];
}

export function workbookRowToView(row: {
  id: string;
  title: string;
  sourceLabel: string | null;
  sourceUrl: string;
  startSec: number | null;
  endSec: number | null;
  transcript: string;
  keyPhrasesJson: unknown;
  questionsRound1Json: unknown;
  questionsRound2Json: unknown;
  dictationLinesJson: unknown;
  shadowingLinesJson: unknown;
  takeawayHintZh: string | null;
  tomorrowReviewHintZh: string | null;
  updatedAt: Date;
}): ListeningWorkbookView {
  return {
    id: row.id,
    title: row.title,
    sourceLabel: row.sourceLabel,
    sourceUrl: row.sourceUrl,
    startSec: row.startSec,
    endSec: row.endSec,
    transcript: row.transcript,
    keyPhrases: parseStringList(row.keyPhrasesJson),
    round1: parseMcqList(row.questionsRound1Json),
    round2: parseMcqList(row.questionsRound2Json),
    dictation: parseDictationLines(row.dictationLinesJson),
    shadowing: parseShadowingLines(row.shadowingLinesJson),
    takeawayHintZh: row.takeawayHintZh,
    tomorrowReviewHintZh: row.tomorrowReviewHintZh,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function progressRowToView(row: {
  round1AnswersJson: unknown;
  round2AnswersJson: unknown;
  dictationAnswersJson: unknown;
  shadowingCheckedJson: unknown;
  takeawayUser: string | null;
  tomorrowReviewPointsJson: unknown;
  lastStepSeen: number;
} | null): ListeningProgressView | null {
  if (!row) {
    return null;
  }
  const pts = parseTomorrowPoints(row.tomorrowReviewPointsJson);
  const shadowRaw = row.shadowingCheckedJson;
  const shadowingChecked = Array.isArray(shadowRaw)
    ? shadowRaw.filter((x): x is string => typeof x === "string")
    : [];
  return {
    round1Answers: parseAnswerMap(row.round1AnswersJson),
    round2Answers: parseAnswerMap(row.round2AnswersJson),
    dictationAnswers: parseStringMap(row.dictationAnswersJson),
    shadowingChecked,
    takeawayUser: row.takeawayUser ?? "",
    tomorrowReviewPoints: pts,
    lastStepSeen: row.lastStepSeen,
  };
}

export async function listListeningWorkbooks(): Promise<ListeningWorkbookView[]> {
  const rows = await prisma.listeningWorkbook.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(workbookRowToView);
}

export async function getListeningWorkbookForUser(
  id: string,
  userId: number | null,
): Promise<{ workbook: ListeningWorkbookView; progress: ListeningProgressView | null } | null> {
  const row = await prisma.listeningWorkbook.findFirst({ where: { id } });
  if (!row) {
    return null;
  }
  const workbook = workbookRowToView(row);
  if (userId == null) {
    return { workbook, progress: null };
  }
  const prog = await prisma.userListeningWorkbookProgress.findUnique({
    where: { userId_workbookId: { userId, workbookId: id } },
  });
  return { workbook, progress: progressRowToView(prog) };
}
