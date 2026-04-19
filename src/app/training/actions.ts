"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  abandonStudySession,
  ACTIVE_SESSION_COOKIE_MAX_AGE_SECONDS,
  ACTIVE_SESSION_COOKIE_NAME,
  createStudySession,
  getTrainingHref,
  pickTrainingQuestionIds,
  recordTrainingAnswerChoice,
  submitTrainingAnswer,
} from "@/lib/training";

function setActiveSessionCookie(sessionId: number) {
  cookies().set({
    name: ACTIVE_SESSION_COOKIE_NAME,
    value: String(sessionId),
    httpOnly: true,
    sameSite: "lax",
    maxAge: ACTIVE_SESSION_COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
}

function clearActiveSessionCookie() {
  cookies().set({
    name: ACTIVE_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });
}

export async function startTrainingSessionAction() {
  const questionIds = await pickTrainingQuestionIds();

  if (questionIds.length === 0) {
    redirect(getTrainingHref({ notice: "no-questions" }));
  }

  const session = await createStudySession(questionIds);
  setActiveSessionCookie(session.id);
  redirect(getTrainingHref({ sessionId: session.id }));
}

export async function submitTrainingAnswerAction(formData: FormData) {
  const result = await recordTrainingAnswerChoice({
    sessionId: formData.get("sessionId")?.toString() ?? null,
    sessionQuestionId: formData.get("sessionQuestionId")?.toString() ?? null,
    questionId: formData.get("questionId")?.toString() ?? null,
    selectedAnswer: formData.get("selectedAnswer")?.toString() ?? null,
  });

  redirect(
    getTrainingHref({
      sessionId: result.sessionId,
      notice: result.notice,
    }),
  );
}

export async function submitTrainingRatingAction(formData: FormData) {
  const result = await submitTrainingAnswer({
    sessionQuestionId: formData.get("sessionQuestionId")?.toString() ?? null,
    userChoice: formData.get("userChoice")?.toString() ?? null,
    rating: formData.get("rating")?.toString() ?? null,
    timeTakenSec: formData.get("timeTakenSec")?.toString() ?? null,
  });

  if (result.sessionCompleted) {
    clearActiveSessionCookie();
  }

  redirect(
    getTrainingHref({
      sessionId: result.sessionId,
      notice: result.notice,
    }),
  );
}

export async function abandonActiveSessionAction() {
  const activeSessionId = cookies().get(ACTIVE_SESSION_COOKIE_NAME)?.value;

  await abandonStudySession(activeSessionId);
  clearActiveSessionCookie();
  redirect("/training");
}