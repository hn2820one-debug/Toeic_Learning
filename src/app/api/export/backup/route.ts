import { NextResponse } from "next/server";

import { assertExportAllowed } from "@/lib/export/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function serializeDates<T>(rows: T[]): T[] {
  return JSON.parse(JSON.stringify(rows)) as T[];
}

export async function GET(request: Request) {
  try {
  const denied = assertExportAllowed(request);
  if (denied) {
    return denied;
  }

  const [
    users,
    learningItems,
    questionItems,
    questions,
    fsrsCardState,
    reviewLog,
    fsrsParams,
    llmUsageLog,
    eloState,
    topicMastery,
    studySessions,
    studySessionQuestion,
    answerHistory,
    listeningSetsLegacy,
    listeningQuestionsLegacy,
    listeningSetsV2,
    listeningQuestionsV2,
    dailySessions,
    sessionAnswers,
    reviewQueue,
    topicWeights,
    weeklyReports,
    scoreHistory,
  ] = await Promise.all([
    prisma.user.findMany({ orderBy: { id: "asc" } }),
    prisma.learningItem.findMany({ orderBy: { id: "asc" } }),
    prisma.questionItem.findMany({ orderBy: { id: "asc" } }),
    prisma.questionBankItem.findMany({ orderBy: { id: "asc" } }),
    prisma.fsrsCardState.findMany({ orderBy: { id: "asc" } }),
    prisma.reviewLog.findMany({ orderBy: { id: "asc" } }),
    prisma.fsrsParams.findMany(),
    prisma.llmUsageLog.findMany({ orderBy: { id: "asc" } }),
    prisma.eloState.findMany({ orderBy: { id: "asc" } }),
    prisma.topicMastery.findMany({ orderBy: { topic: "asc" } }),
    prisma.studySession.findMany({ orderBy: { id: "asc" } }),
    prisma.studySessionQuestion.findMany({ orderBy: { id: "asc" } }),
    prisma.answerHistory.findMany({ orderBy: { id: "asc" } }),
    prisma.listeningSetLegacy.findMany({ orderBy: { id: "asc" } }),
    prisma.listeningQuestionLegacy.findMany({ orderBy: { id: "asc" } }),
    prisma.listeningSetV2.findMany({ orderBy: { id: "asc" } }),
    prisma.listeningQuestionV2.findMany({ orderBy: { id: "asc" } }),
    prisma.dailySession.findMany({ orderBy: { id: "asc" } }),
    prisma.sessionAnswer.findMany({ orderBy: { id: "asc" } }),
    prisma.reviewQueue.findMany({ orderBy: { id: "asc" } }),
    prisma.topicWeight.findMany({ orderBy: { id: "asc" } }),
    prisma.weeklyReport.findMany({ orderBy: { id: "asc" } }),
    prisma.scoreHistory.findMany({ orderBy: { id: "asc" } }),
  ]);

  const payload = {
    meta: {
      exportedAt: new Date().toISOString(),
      generator: "toeic-web",
      prismaSchema: "backup-v1",
    },
    tables: {
      users: serializeDates(users),
      learning_items: serializeDates(learningItems),
      question_items: serializeDates(questionItems),
      questions: serializeDates(questions),
      fsrs_card_state: serializeDates(fsrsCardState),
      review_log: serializeDates(reviewLog),
      fsrs_params: serializeDates(fsrsParams),
      llm_usage_log: serializeDates(llmUsageLog),
      elo_state: serializeDates(eloState),
      topic_mastery: serializeDates(topicMastery),
      study_sessions: serializeDates(studySessions),
      study_session_question: serializeDates(studySessionQuestion),
      answer_history: serializeDates(answerHistory),
      listening_sets: serializeDates(listeningSetsLegacy),
      listening_questions: serializeDates(listeningQuestionsLegacy),
      listening_set_v2: serializeDates(listeningSetsV2),
      listening_question_v2: serializeDates(listeningQuestionsV2),
      daily_sessions: serializeDates(dailySessions),
      session_answers: serializeDates(sessionAnswers),
      review_queue: serializeDates(reviewQueue),
      topic_weights: serializeDates(topicWeights),
      weekly_reports: serializeDates(weeklyReports),
      score_history: serializeDates(scoreHistory),
    },
  };

  const body = JSON.stringify(payload, null, 2);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
  } catch (error) {
    console.error("[api/export/backup]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Backup export failed", detail: message },
      { status: 500 },
    );
  }
}
