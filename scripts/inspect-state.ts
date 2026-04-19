import { prisma } from "../src/lib/prisma";

(async () => {
  const counts = {
    questions: await prisma.questionBankItem.count(),
    study_sessions: await prisma.studySession.count(),
    study_session_question: await prisma.studySessionQuestion.count(),
    answer_history: await prisma.answerHistory.count(),
    fsrs_card_state: await prisma.fsrsCardState.count(),
    review_log: await prisma.reviewLog.count(),
    elo_state: await prisma.eloState.count(),
    topic_mastery: await prisma.topicMastery.count(),
    llm_usage_log: await prisma.llmUsageLog.count(),
  };
  console.log("counts:", JSON.stringify(counts, null, 2));

  const topics = await prisma.questionBankItem.groupBy({
    by: ["topic"],
    _count: { _all: true },
  });
  console.log("topics:", JSON.stringify(topics, null, 2));

  const diffs = await prisma.questionBankItem.groupBy({
    by: ["difficulty"],
    _count: { _all: true },
  });
  console.log("difficulties:", JSON.stringify(diffs, null, 2));

  const sample = await prisma.questionBankItem.findMany({
    take: 6,
    orderBy: { id: "asc" },
    select: {
      id: true,
      topic: true,
      difficulty: true,
      correctAnswer: true,
      questionText: true,
      optionA: true,
      optionB: true,
      optionC: true,
      optionD: true,
      explanation: true,
    },
  });
  console.log("sample:", JSON.stringify(sample, null, 2));
})()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
