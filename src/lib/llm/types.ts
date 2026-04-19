export type LlmTaskType = "generate" | "verify" | "explain" | "weekly_report";

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
