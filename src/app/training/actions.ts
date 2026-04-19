"use server";

import { redirect } from "next/navigation";

import {
  createStudySession,
  getTrainingHref,
  pickTrainingQuestionIds,
  submitTrainingAnswer,
} from "@/lib/training";

export async function startTrainingSessionAction() {
  const questionIds = await pickTrainingQuestionIds();

  if (questionIds.length === 0) {
    redirect(getTrainingHref({ notice: "no-questions" }));
  }

  const session = await createStudySession();
  redirect(
    getTrainingHref({
      sessionId: session.id,
      questionIds,
    }),
  );
}

export async function submitTrainingAnswerAction(formData: FormData) {
  const result = await submitTrainingAnswer({
    sessionId: formData.get("sessionId")?.toString() ?? null,
    questionId: formData.get("questionId")?.toString() ?? null,
    questionIds: formData.get("questionIds")?.toString() ?? null,
    selectedAnswer: formData.get("selectedAnswer")?.toString() ?? null,
  });

  redirect(
    getTrainingHref({
      sessionId: result.sessionId,
      questionIds: result.questionIds,
      notice: result.notice,
    }),
  );
}