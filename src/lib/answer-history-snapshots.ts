/**
 * Helpers for immutable AnswerHistory snapshots vs live QuestionBankItem.
 * stemSnapshot = question text at answer time; choicesSnapshot = JSON {A,B,C,D}.
 */

export type QuestionSnapshotSource = {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string | null;
  topic: string;
  difficulty: string;
  skillKey?: string | null;
  topicKey?: string | null;
  moduleKey?: string | null;
};

export function serializeChoicesSnapshotJson(question: Pick<QuestionSnapshotSource, "optionA" | "optionB" | "optionC" | "optionD">) {
  return JSON.stringify({
    A: question.optionA,
    B: question.optionB,
    C: question.optionC,
    D: question.optionD,
  });
}

/** Payload for Prisma `answerHistory.create` / `update` snapshot fields (all from the same `question` row at submit time). */
export function buildAnswerHistorySnapshotData(question: QuestionSnapshotSource) {
  return {
    stemSnapshot: question.questionText,
    choicesSnapshot: serializeChoicesSnapshotJson(question),
    optionASnapshot: question.optionA,
    optionBSnapshot: question.optionB,
    optionCSnapshot: question.optionC,
    optionDSnapshot: question.optionD,
    correctAnswerSnapshot: question.correctAnswer,
    explanationSnapshot: question.explanation,
    topicSnapshot: question.topic,
    difficultySnapshot: question.difficulty,
    skillKeySnapshot: question.skillKey ?? null,
    topicKeySnapshot: question.topicKey ?? null,
    moduleKeySnapshot: question.moduleKey ?? null,
  };
}

function nonEmpty(s: string | null | undefined): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

export function resolveStemDisplay(stemSnapshot: string, fallbackQuestionText: string | undefined) {
  return nonEmpty(stemSnapshot) ? stemSnapshot.trim() : (fallbackQuestionText ?? "");
}

export function resolveTopicDisplay(topicSnapshot: string, fallbackTopic: string | undefined) {
  return nonEmpty(topicSnapshot) ? topicSnapshot.trim() : (fallbackTopic ?? "");
}

export function resolveDifficultyDisplay(difficultySnapshot: string, fallbackDifficulty: string | undefined) {
  return nonEmpty(difficultySnapshot) ? difficultySnapshot.trim() : (fallbackDifficulty ?? "");
}

export function resolveCorrectAnswerLetter(correctAnswerSnapshot: string, fallback: string | undefined) {
  return nonEmpty(correctAnswerSnapshot) ? correctAnswerSnapshot.trim() : (fallback ?? "");
}

export function resolveExplanationForExplain(
  explanationSnapshot: string | null | undefined,
  fallbackExplanation: string | null | undefined,
) {
  if (nonEmpty(explanationSnapshot)) {
    return explanationSnapshot.trim();
  }
  return fallbackExplanation?.trim() || undefined;
}

export function parseChoicesSnapshotJson(choicesSnapshot: string): { A: string; B: string; C: string; D: string } | null {
  if (!nonEmpty(choicesSnapshot) || choicesSnapshot.trim() === "{}") {
    return null;
  }
  try {
    const parsed = JSON.parse(choicesSnapshot) as Record<string, unknown>;
    if (
      typeof parsed.A === "string" &&
      typeof parsed.B === "string" &&
      typeof parsed.C === "string" &&
      typeof parsed.D === "string"
    ) {
      return { A: parsed.A, B: parsed.B, C: parsed.C, D: parsed.D };
    }
  } catch {
    return null;
  }
  return null;
}

/** Prefer explicit option snapshots, then JSON, then live question options. */
export function resolveChoicesAtAnswerTime(
  row: {
    optionASnapshot: string | null;
    optionBSnapshot: string | null;
    optionCSnapshot: string | null;
    optionDSnapshot: string | null;
    choicesSnapshot: string;
  },
  fallback: Pick<QuestionSnapshotSource, "optionA" | "optionB" | "optionC" | "optionD">,
) {
  if (
    nonEmpty(row.optionASnapshot) &&
    nonEmpty(row.optionBSnapshot) &&
    nonEmpty(row.optionCSnapshot) &&
    nonEmpty(row.optionDSnapshot)
  ) {
    return {
      A: row.optionASnapshot!.trim(),
      B: row.optionBSnapshot!.trim(),
      C: row.optionCSnapshot!.trim(),
      D: row.optionDSnapshot!.trim(),
    };
  }

  const parsed = parseChoicesSnapshotJson(row.choicesSnapshot);
  if (parsed) {
    return parsed;
  }

  return {
    A: fallback.optionA,
    B: fallback.optionB,
    C: fallback.optionC,
    D: fallback.optionD,
  };
}
