export type LlmTaskType =
  | "generate"
  | "verify"
  | "explain"
  | "weekly_report"
  | "diagnostic"
  | "lesson"
  /** Admin batch: Markdown lesson capsules for `Lesson.bodyMarkdown` (content factory). */
  | "lesson_markdown"
  | "hint"
  | "checkpoint_feedback"
  | "study_plan";

export type LlmProvider = "google" | "anthropic" | "openai";

export interface LlmCallResult {
  success: boolean;
  text: string;
  model: string;
  provider: LlmProvider;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  cacheWriteTokens: number;
  latencyMs: number;
  errorMessage?: string;
}

/** Unified chat completion input for `completeChat` (gateway). */
export type LlmGatewayChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmGatewayCompleteOptions = {
  taskType: LlmTaskType;
  promptVersion: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** Override default provider order (google → anthropic → openai). Comma-separated: `google,anthropic,openai` */
  providerOrder?: LlmProvider[];
};

/**
 * Result of `completeChat`: first successful provider wins; each attempt is logged to `LlmUsageLog`.
 */
export type LlmGatewayCompleteResult = {
  ok: boolean;
  text: string;
  provider: LlmProvider;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  cacheWriteTokens: number;
  latencyMs: number;
  errorMessage?: string;
};

export interface Part5GeneratedItem {
  stem: string;
  choices: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  answer: "A" | "B" | "C" | "D";
  grammar_point: string;
  difficulty: string;
  explanation_zh_hant: string;
}

export interface Part5VerificationVerdict {
  valid: boolean;
  confidence: number;
  issues: string[];
  suggested_fix?: string;
}

export interface SkillSignal {
  skillKey: string;
  category: string;
  topicLabels: string[];
  subFocusLabels: string[];
  attempts: number;
  accuracy: number;
  evidenceQuestionIds?: Array<number | string>;
}

export interface DiagnosticSkillAnalyzerOutput {
  weakSkills: SkillSignal[];
  emergingSkills: SkillSignal[];
  recommendedModuleKey: string;
  confidence: number;
  reasoningSummaryZh: string;
}

export interface MicroLessonWorkedExample {
  stem: string;
  whyCorrectZh: string;
  whyWrongZh: string[];
}

export interface MicroLessonOutput {
  lessonTitleZh: string;
  coreRuleZh: string;
  whyThisMattersZh: string;
  workedExamples: MicroLessonWorkedExample[];
  commonTraps: string[];
  miniCheck: string[];
  reviewSummaryZh: string;
}

export interface GuidedHintOutput {
  hintLevel1: string;
  hintLevel2: string;
  hintLevel3: string;
  doNotRevealAnswerYet: boolean;
}

export interface CheckpointFeedbackOutput {
  resultLabel: "pass" | "borderline" | "retry";
  skillsToReview: string[];
  retryPlan: string[];
  advanceAllowed: boolean;
  coachMessageZh: string;
}

export interface WeeklyStudyPlanOutput {
  recommendedModuleKey: string;
  reviewBlockZh: string;
  drillBlockZh: string;
  checkpointReadinessZh: string;
  weeklyTargetZh: string;
}

export interface LogLlmUsageInput {
  taskType: LlmTaskType;
  provider: LlmProvider;
  model: string;
  promptVersion: string;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  questionId?: number | string;
  sessionId?: number | string;
  temperature?: number;
  seed?: number;
}
