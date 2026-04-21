"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  abandonStudySession,
  ACTIVE_SESSION_COOKIE_MAX_AGE_SECONDS,
  ACTIVE_SESSION_COOKIE_NAME,
  composeAndCreateTrainingSession,
  getTrainingHref,
  recordTrainingAnswerChoice,
  submitTrainingAnswer,
  TRAINING_QUESTION_LIMIT,
  type ComposeSessionInput,
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
  const result = await composeAndCreateTrainingSession({
    mode: "mixed_practice",
    count: TRAINING_QUESTION_LIMIT,
  });

  if (!result.ok) {
    redirect(getTrainingHref({ notice: "no-questions" }));
  }

  setActiveSessionCookie(result.sessionId);
  redirect(getTrainingHref({ sessionId: result.sessionId }));
}

/** Mode-aware entry (diagnostic / lesson_drill / checkpoint / review / mixed_practice) — wire from learn/planner UIs later. */
export async function startTrainingSessionFromComposeInputAction(input: ComposeSessionInput) {
  const result = await composeAndCreateTrainingSession(input);

  if (!result.ok) {
    redirect(getTrainingHref({ notice: "no-questions" }));
  }

  setActiveSessionCookie(result.sessionId);
  redirect(getTrainingHref({ sessionId: result.sessionId }));
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