import "server-only";

import { getWeeklyReportData, getWeeklyReportWindow } from "@/lib/report";
import { prisma } from "@/lib/prisma";

import { getGoogleApiKey } from "./providers";
import type { LlmCallResult } from "./types";
import { logLlmUsage } from "./usage-log";

export const GEMINI_WEEKLY_REPORT_MODEL = "gemini-2.5-pro";
export const WEEKLY_COACHING_REPORT_PROMPT_VERSION = "weekly-coaching-report-v1";

const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_TEMPERATURE = 0.5;
const REQUIRED_WEEKLY_REPORT_HEADINGS = [
  "## 📈 本週進展",
  "## 🎯 3 個弱點",
  "## 🧮 TOEIC 估分",
  "## 🗓️ 下週 3 個行動項",
  "## 🔥 Productive-failure 鼓勵",
] as const;

type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  cachedContentTokenCount?: number;
};

type GeminiCandidate = {
  content?: {
    parts?: Array<{
      text?: string;
    }>;
  };
};

type GeminiGenerateContentResponse = {
  candidates?: GeminiCandidate[];
  usageMetadata?: GeminiUsageMetadata;
  modelVersion?: string;
  error?: {
    message?: string;
    status?: string;
    code?: number;
  };
};

type WeeklyReportContext = {
  windowStart: string;
  windowEnd: string;
  summary: {
    completedSessionCount: number;
    totalQuestionsAnswered: number;
    totalCorrectAnswers: number;
    accuracy: number;
  };
  answerHistorySummary: {
    totalRows: number;
    wrongAnswers: number;
    correctAnswers: number;
  };
  topicBreakdown: Array<{
    topic: string;
    totalAnswered: number;
    correctCount: number;
    accuracy: number;
  }>;
  completedSessions: Array<{
    id: number;
    endedAt: string;
    totalQuestions: number;
    correctCount: number;
    accuracy: number;
  }>;
};

export type GenerateWeeklyCoachingReportResult = {
  metricsSummary: WeeklyReportContext;
  generatedReportText: string;
  rawResponse: GeminiGenerateContentResponse;
  promptVersion: string;
  callResult: LlmCallResult;
};

export class WeeklyReportGenerationError extends Error {
  status: number;
  rawResponse?: GeminiGenerateContentResponse;
  rawText?: string;
  callResult?: LlmCallResult;

  constructor(
    message: string,
    options?: {
      status?: number;
      rawResponse?: GeminiGenerateContentResponse;
      rawText?: string;
      callResult?: LlmCallResult;
    },
  ) {
    super(message);
    this.name = "WeeklyReportGenerationError";
    this.status = options?.status ?? 500;
    this.rawResponse = options?.rawResponse;
    this.rawText = options?.rawText;
    this.callResult = options?.callResult;
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function extractGeminiText(response: GeminiGenerateContentResponse) {
  const rawText =
    response.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";

  if (!rawText) {
    throw new Error("Gemini response did not include candidate text.");
  }

  return rawText;
}

function getGeminiApiErrorMessage(status: number, payload: GeminiGenerateContentResponse | undefined) {
  const detail = payload?.error?.message?.trim();
  return detail ? `Gemini request failed (${status}): ${detail}` : `Gemini request failed with HTTP ${status}.`;
}

function createCallResult(input: {
  success: boolean;
  text: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  cacheWriteTokens: number;
  latencyMs: number;
  errorMessage?: string;
}): LlmCallResult {
  return {
    success: input.success,
    text: input.text,
    model: input.model,
    provider: "google",
    promptTokens: input.promptTokens,
    completionTokens: input.completionTokens,
    cachedTokens: input.cachedTokens,
    cacheWriteTokens: input.cacheWriteTokens,
    latencyMs: input.latencyMs,
    errorMessage: input.errorMessage,
  };
}

function extractUsageMetadata(response: GeminiGenerateContentResponse | undefined) {
  return {
    promptTokens: response?.usageMetadata?.promptTokenCount ?? 0,
    completionTokens: response?.usageMetadata?.candidatesTokenCount ?? 0,
    cachedTokens: response?.usageMetadata?.cachedContentTokenCount ?? 0,
    cacheWriteTokens: 0,
  };
}

function validateWeeklyReportText(rawText: string) {
  for (const heading of REQUIRED_WEEKLY_REPORT_HEADINGS) {
    if (!rawText.includes(heading)) {
      throw new Error(`Gemini weekly report is missing required heading: ${heading}`);
    }
  }

  if (!rawText.includes("粗略估計，非官方預測")) {
    throw new Error("Gemini weekly report must explicitly include '粗略估計，非官方預測'.");
  }
}

export async function getWeeklyCoachingReportMetricsSummary(now = new Date()): Promise<WeeklyReportContext> {
  const report = await getWeeklyReportData(now);
  const { windowStart, windowEnd } = getWeeklyReportWindow(now);

  const [completedSessions, totalRows, correctAnswers] = await Promise.all([
    prisma.studySession.findMany({
      where: {
        endedAt: {
          not: null,
          gte: windowStart,
          lte: windowEnd,
        },
        abandonedAt: null,
      },
      orderBy: [{ endedAt: "desc" }, { id: "desc" }],
      take: 10,
      select: {
        id: true,
        endedAt: true,
        totalQuestions: true,
        correctCount: true,
      },
    }),
    prisma.answerHistory.count({
      where: {
        session: {
          endedAt: {
            not: null,
            gte: windowStart,
            lte: windowEnd,
          },
          abandonedAt: null,
        },
      },
    }),
    prisma.answerHistory.count({
      where: {
        session: {
          endedAt: {
            not: null,
            gte: windowStart,
            lte: windowEnd,
          },
          abandonedAt: null,
        },
        isCorrect: true,
      },
    }),
  ]);

  return {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    summary: report.summary,
    answerHistorySummary: {
      totalRows,
      correctAnswers,
      wrongAnswers: Math.max(0, totalRows - correctAnswers),
    },
    topicBreakdown: report.topicBreakdown.slice(0, 8),
    completedSessions: completedSessions.map((session) => {
      const totalQuestions = session.totalQuestions > 0 ? session.totalQuestions : 0;
      const accuracy = totalQuestions > 0 ? Math.round((session.correctCount / totalQuestions) * 100) : 0;

      return {
        id: session.id,
        endedAt: session.endedAt?.toISOString() ?? "",
        totalQuestions,
        correctCount: session.correctCount,
        accuracy,
      };
    }),
  };
}

function buildWeeklyReportPrompts(context: WeeklyReportContext) {
  const systemPrompt = `
你是 TOEIC 學習教練。
請根據使用者近 7 天的練習資料，輸出一份繁體中文（台灣用字）的教練式週報。

請嚴格使用以下固定結構與標題：
## 📈 本週進展
## 🎯 3 個弱點
## 🧮 TOEIC 估分
## 🗓️ 下週 3 個行動項
## 🔥 Productive-failure 鼓勵

要求：
- 全文必須是繁體中文（台灣用字）
- 內容要具體、可執行、像教練對學生說話
- TOEIC 估分段落必須明確寫出「粗略估計，非官方預測」
- 不要輸出 JSON
- 不要輸出 markdown code fence
- 只輸出週報本文
`.trim();

  const userPrompt = `
以下是最近 7 天的 deterministic report context，請根據它撰寫教練式週報：

${JSON.stringify(context, null, 2)}
`.trim();

  return {
    systemPrompt,
    userPrompt,
  };
}

export async function generateWeeklyCoachingReport(
  input?: {
    temperature?: number;
    now?: Date;
    metricsSummary?: WeeklyReportContext;
  },
): Promise<GenerateWeeklyCoachingReportResult> {
  const startedAt = Date.now();
  const promptVersion = WEEKLY_COACHING_REPORT_PROMPT_VERSION;
  const temperature = input?.temperature ?? DEFAULT_TEMPERATURE;
  const context = input?.metricsSummary ?? (await getWeeklyCoachingReportMetricsSummary(input?.now));
  const model = GEMINI_WEEKLY_REPORT_MODEL;

  let rawResponse: GeminiGenerateContentResponse | undefined;
  let rawText = "";
  let responseModel = model;
  let errorMessage: string | undefined;

  try {
    const apiKey = getGoogleApiKey();
    const { systemPrompt, userPrompt } = buildWeeklyReportPrompts(context);
    const response = await fetch(`${GEMINI_API_BASE_URL}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          role: "system",
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature,
          responseMimeType: "text/plain",
        },
      }),
    });

    const responseText = await response.text();

    try {
      rawResponse = responseText.trim() ? (JSON.parse(responseText) as GeminiGenerateContentResponse) : {};
    } catch {
      throw new Error(`Gemini returned a non-JSON HTTP body: ${responseText.slice(0, 200)}`);
    }

    responseModel = rawResponse.modelVersion ?? model;

    if (!response.ok) {
      throw new WeeklyReportGenerationError(getGeminiApiErrorMessage(response.status, rawResponse), {
        status: response.status,
        rawResponse,
      });
    }

    rawText = extractGeminiText(rawResponse);
    validateWeeklyReportText(rawText);
    const usage = extractUsageMetadata(rawResponse);
    const latencyMs = Date.now() - startedAt;
    const callResult = createCallResult({
      success: true,
      text: rawText,
      model: responseModel,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      cachedTokens: usage.cachedTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      latencyMs,
    });

    await logLlmUsage({
      taskType: "weekly_report",
      provider: "google",
      model: responseModel,
      promptVersion,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      cachedTokens: usage.cachedTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      costUsd: 0,
      latencyMs,
      success: true,
      temperature,
    });

    return {
      metricsSummary: context,
      generatedReportText: rawText,
      rawResponse,
      promptVersion,
      callResult,
    };
  } catch (error) {
    errorMessage = getErrorMessage(error);
    const usage = extractUsageMetadata(rawResponse);
    const latencyMs = Date.now() - startedAt;
    const callResult = createCallResult({
      success: false,
      text: rawText,
      model: responseModel,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      cachedTokens: usage.cachedTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      latencyMs,
      errorMessage,
    });

    await logLlmUsage({
      taskType: "weekly_report",
      provider: "google",
      model: responseModel,
      promptVersion,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      cachedTokens: usage.cachedTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      costUsd: 0,
      latencyMs,
      success: false,
      errorMessage,
      temperature,
    });

    if (error instanceof WeeklyReportGenerationError) {
      error.callResult = error.callResult ?? callResult;
      error.rawResponse = error.rawResponse ?? rawResponse;
      error.rawText = error.rawText ?? rawText;
      throw error;
    }

    throw new WeeklyReportGenerationError(errorMessage, {
      status: 500,
      rawResponse,
      rawText,
      callResult,
    });
  }
}
