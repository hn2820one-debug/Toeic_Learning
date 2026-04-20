import { prisma } from "@/lib/prisma";
import { logOpsError } from "@/lib/ops-log";

import type { LogLlmUsageInput } from "./types";

function toNullableString(value?: number | string) {
  return value === undefined ? null : String(value);
}

export async function logLlmUsage(input: LogLlmUsageInput) {
  try {
    await prisma.llmUsageLog.create({
      data: {
        taskType: input.taskType,
        provider: input.provider,
        model: input.model,
        promptVersion: input.promptVersion,
        promptTokens: input.promptTokens,
        completionTokens: input.completionTokens,
        cachedTokens: input.cachedTokens,
        cacheWriteTokens: input.cacheWriteTokens,
        costUsd: input.costUsd,
        latencyMs: input.latencyMs,
        success: input.success,
        errorMessage: input.errorMessage ?? null,
        questionId: toNullableString(input.questionId),
        sessionId: toNullableString(input.sessionId),
        temperature: input.temperature ?? null,
        seed: input.seed ?? null,
      },
    });
  } catch (error) {
    logOpsError({
      area: "llm",
      event: "usage_log_write_failed",
      detail: {
        taskType: input.taskType,
        provider: input.provider,
        model: input.model,
        promptVersion: input.promptVersion,
      },
      error,
    });
  }
}
