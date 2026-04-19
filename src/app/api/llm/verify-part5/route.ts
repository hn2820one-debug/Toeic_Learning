import { NextResponse } from "next/server";

import { ClaudeVerificationError, verifyPart5ItemWithClaude } from "@/lib/llm/claude-verify";
import type { Part5GeneratedItem } from "@/lib/llm/types";

function normalizeGeneratedItem(body: unknown): Part5GeneratedItem {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a Part 5 item JSON object.");
  }

  const item = body as Record<string, unknown>;
  const choices = item.choices as Record<string, unknown> | undefined;

  if (
    typeof item.stem !== "string" ||
    !choices ||
    typeof choices.A !== "string" ||
    typeof choices.B !== "string" ||
    typeof choices.C !== "string" ||
    typeof choices.D !== "string" ||
    (item.answer !== "A" && item.answer !== "B" && item.answer !== "C" && item.answer !== "D") ||
    typeof item.grammar_point !== "string" ||
    typeof item.difficulty !== "string" ||
    typeof item.explanation_zh_hant !== "string"
  ) {
    throw new Error("Request body did not match the required Part 5 item schema.");
  }

  return {
    stem: item.stem,
    choices: {
      A: choices.A,
      B: choices.B,
      C: choices.C,
      D: choices.D,
    },
    answer: item.answer,
    grammar_point: item.grammar_point,
    difficulty: item.difficulty,
    explanation_zh_hant: item.explanation_zh_hant,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const item = normalizeGeneratedItem(body);
    const result = await verifyPart5ItemWithClaude(item);

    return NextResponse.json({
      ok: true,
      verifierVerdict: result.verifierVerdict,
      rawText: result.rawText,
      rawResponse: result.rawResponse,
      model: result.callResult.model,
      promptVersion: result.promptVersion,
      usage: {
        promptTokens: result.callResult.promptTokens,
        completionTokens: result.callResult.completionTokens,
        cachedTokens: result.callResult.cachedTokens,
        cacheWriteTokens: result.callResult.cacheWriteTokens,
        latencyMs: result.callResult.latencyMs,
      },
    });
  } catch (error) {
    if (error instanceof ClaudeVerificationError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          rawText: error.rawText ?? null,
          rawResponse: error.rawResponse ?? null,
          usage: error.callResult
            ? {
                promptTokens: error.callResult.promptTokens,
                completionTokens: error.callResult.completionTokens,
                cachedTokens: error.callResult.cachedTokens,
                cacheWriteTokens: error.callResult.cacheWriteTokens,
                latencyMs: error.callResult.latencyMs,
              }
            : null,
        },
        { status: error.status },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
