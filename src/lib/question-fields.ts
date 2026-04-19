export const QUESTION_DIFFICULTY_VALUES = ["A", "B", "C"] as const;
export const QUESTION_CORRECT_ANSWER_VALUES = ["A", "B", "C", "D"] as const;

export type QuestionDifficulty = (typeof QUESTION_DIFFICULTY_VALUES)[number];
export type QuestionCorrectAnswer = (typeof QUESTION_CORRECT_ANSWER_VALUES)[number];

export type QuestionFieldInput = {
  questionText: unknown;
  optionA: unknown;
  optionB: unknown;
  optionC: unknown;
  optionD: unknown;
  correctAnswer: unknown;
  explanation: unknown;
  topic: unknown;
  difficulty: unknown;
};

export type NormalizedQuestionFields = {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: QuestionCorrectAnswer;
  explanation: string | null;
  topic: string;
  difficulty: QuestionDifficulty;
};

export type QuestionValidationIssue =
  | "questionText"
  | "options"
  | "correctAnswer"
  | "explanation"
  | "topic"
  | "difficulty";

function normalizeRequiredString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeOptionalString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeChoice<TChoices extends readonly string[]>(value: unknown, allowedValues: TChoices) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  return allowedValues.includes(normalized as TChoices[number]) ? (normalized as TChoices[number]) : undefined;
}

export function normalizeQuestionTopic(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeQuestionDifficulty(value: unknown) {
  return normalizeChoice(value, QUESTION_DIFFICULTY_VALUES);
}

export function normalizeQuestionCorrectAnswer(value: unknown) {
  return normalizeChoice(value, QUESTION_CORRECT_ANSWER_VALUES);
}

export function isAllowedQuestionDifficulty(value: string): value is QuestionDifficulty {
  return QUESTION_DIFFICULTY_VALUES.includes(value as QuestionDifficulty);
}

export function getNormalizedQuestionTopics(topics: Iterable<string>) {
  const uniqueTopics = new Set<string>();

  for (const topic of topics) {
    const normalized = normalizeQuestionTopic(topic);

    if (normalized) {
      uniqueTopics.add(normalized);
    }
  }

  return Array.from(uniqueTopics).sort((left, right) => left.localeCompare(right));
}

export function validateQuestionFields(
  input: QuestionFieldInput,
): { ok: true; data: NormalizedQuestionFields } | { ok: false; issue: QuestionValidationIssue } {
  const questionText = normalizeRequiredString(input.questionText);
  const optionA = normalizeRequiredString(input.optionA);
  const optionB = normalizeRequiredString(input.optionB);
  const optionC = normalizeRequiredString(input.optionC);
  const optionD = normalizeRequiredString(input.optionD);
  const correctAnswer = normalizeQuestionCorrectAnswer(input.correctAnswer);
  const explanation = normalizeOptionalString(input.explanation);
  const topic = normalizeQuestionTopic(input.topic);
  const difficulty = normalizeQuestionDifficulty(input.difficulty);

  if (!questionText) {
    return {
      ok: false,
      issue: "questionText",
    };
  }

  if (!optionA || !optionB || !optionC || !optionD) {
    return {
      ok: false,
      issue: "options",
    };
  }

  if (!correctAnswer) {
    return {
      ok: false,
      issue: "correctAnswer",
    };
  }

  if (explanation === undefined) {
    return {
      ok: false,
      issue: "explanation",
    };
  }

  if (!topic) {
    return {
      ok: false,
      issue: "topic",
    };
  }

  if (!difficulty) {
    return {
      ok: false,
      issue: "difficulty",
    };
  }

  return {
    ok: true,
    data: {
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      explanation,
      topic,
      difficulty,
    },
  };
}

export function formatQuestionValidationMessage(issue: QuestionValidationIssue, options?: { rowNumber?: number }) {
  const rowPrefix = options?.rowNumber ? `Row ${options.rowNumber} ` : "";

  switch (issue) {
    case "questionText":
      return options?.rowNumber
        ? `${rowPrefix}is missing a non-empty questionText.`
        : "questionText must remain non-empty.";
    case "options":
      return options?.rowNumber
        ? `${rowPrefix}must include non-empty optionA, optionB, optionC, and optionD values.`
        : "optionA, optionB, optionC, and optionD must remain non-empty.";
    case "correctAnswer":
      return options?.rowNumber
        ? `${rowPrefix}must use A, B, C, or D as correctAnswer.`
        : "correctAnswer must be A, B, C, or D.";
    case "explanation":
      return options?.rowNumber
        ? `${rowPrefix}has an invalid explanation value.`
        : "explanation must be text when provided.";
    case "topic":
      return options?.rowNumber
        ? `${rowPrefix}must include a non-empty topic after trimming.`
        : "topic must remain non-empty after trimming.";
    case "difficulty":
      return options?.rowNumber
        ? `${rowPrefix}must use A, B, or C as difficulty.`
        : "difficulty must be A, B, or C.";
  }
}