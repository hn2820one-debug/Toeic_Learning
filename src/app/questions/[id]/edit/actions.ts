"use server";

import { redirect } from "next/navigation";

import {
  deleteQuestionBankItem,
  getQuestionEditHref,
  getQuestionsPageHref,
  updateQuestionBankItem,
} from "@/lib/question-management";

export async function updateQuestionAction(formData: FormData) {
  const result = await updateQuestionBankItem({
    questionId: formData.get("questionId")?.toString() ?? null,
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

  if (!result.questionId) {
    redirect(getQuestionsPageHref({ status: "error", message: result.message }));
  }

  redirect(
    getQuestionEditHref(result.questionId, {
      status: result.status,
      message: result.message,
    }),
  );
}

export async function deleteQuestionAction(formData: FormData) {
  const result = await deleteQuestionBankItem(formData.get("questionId")?.toString() ?? null);

  if (result.status === "success") {
    redirect(getQuestionsPageHref({ status: "success", message: result.message }));
  }

  if (!result.questionId) {
    redirect(getQuestionsPageHref({ status: "error", message: result.message }));
  }

  redirect(
    getQuestionEditHref(result.questionId, {
      status: result.status,
      message: result.message,
    }),
  );
}