"use server";

import { redirect } from "next/navigation";

import { createQuestionBankItem, getQuestionEditHref, getQuestionNewHref } from "@/lib/question-management";

export async function createQuestionAction(formData: FormData) {
  const result = await createQuestionBankItem({
    questionText: formData.get("questionText")?.toString() ?? null,
    optionA: formData.get("optionA")?.toString() ?? null,
    optionB: formData.get("optionB")?.toString() ?? null,
    optionC: formData.get("optionC")?.toString() ?? null,
    optionD: formData.get("optionD")?.toString() ?? null,
    correctAnswer: formData.get("correctAnswer")?.toString() ?? null,
    explanation: formData.get("explanation")?.toString() ?? null,
    topic: formData.get("topic")?.toString() ?? null,
    difficulty: formData.get("difficulty")?.toString() ?? null,
  });

  if (result.status === "success" && result.questionId) {
    redirect(
      getQuestionEditHref(result.questionId, {
        status: result.status,
        message: result.message,
      }),
    );
  }

  redirect(
    getQuestionNewHref({
      status: "error",
      message: result.message,
    }),
  );
}