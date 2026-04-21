import { NextResponse } from "next/server";

import { GeminiGenerationError } from "@/lib/llm/gemini-generate";
import { runGenerateBankV2Batch, type GenerateV2Request } from "@/lib/admin/generate-bank-v2";

export const dynamic = "force-dynamic";

function getAdminToken(request: Request) {
  return request.headers.get("x-admin-token")?.trim() ?? "";
}

function validateToken(request: Request): { ok: true } | { ok: false; status: number; message: string } {
  const expected = process.env.ADMIN_GENERATE_TOKEN?.trim();
  if (!expected) {
    return { ok: false, status: 503, message: "ADMIN_GENERATE_TOKEN is not configured on the server." };
  }
  const got = getAdminToken(request);
  if (got !== expected) {
    return { ok: false, status: 401, message: "Unauthorized." };
  }
  return { ok: true };
}

function parseBody(raw: unknown): GenerateV2Request {
  if (!raw || typeof raw !== "object") {
    throw new Error("Request body must be a JSON object.");
  }
  const o = raw as Record<string, unknown>;

  if (typeof o.skillCode !== "string" || o.skillCode.trim().length === 0) {
    throw new Error("skillCode must be a non-empty string.");
  }

  const count = o.count;
  if (typeof count !== "number" || !Number.isFinite(count)) {
    throw new Error("count must be a number.");
  }

  const registerLevel = o.registerLevel;
  if (
    registerLevel !== undefined &&
    registerLevel !== null &&
    registerLevel !== "formal" &&
    registerLevel !== "neutral" &&
    registerLevel !== "mixed"
  ) {
    throw new Error('registerLevel must be "formal", "neutral", or "mixed" when provided.');
  }

  const dup = o.duplicatePolicy;
  if (
    dup !== undefined &&
    dup !== null &&
    dup !== "skip" &&
    dup !== "overwrite" &&
    dup !== "error"
  ) {
    throw new Error('duplicatePolicy must be "skip", "overwrite", or "error" when provided.');
  }

  return {
    skillCode: o.skillCode.trim(),
    count,
    scenario: typeof o.scenario === "string" && o.scenario.trim() ? o.scenario.trim() : undefined,
    topicKey: typeof o.topicKey === "string" && o.topicKey.trim() ? o.topicKey.trim() : undefined,
    dryRun: o.dryRun === true,
    industryFocus: typeof o.industryFocus === "string" && o.industryFocus.trim() ? o.industryFocus.trim() : undefined,
    registerLevel: registerLevel === "formal" || registerLevel === "neutral" || registerLevel === "mixed" ? registerLevel : undefined,
    duplicatePolicy: dup === "skip" || dup === "overwrite" || dup === "error" ? dup : undefined,
  };
}

export async function POST(request: Request) {
  const auth = validateToken(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  let body: GenerateV2Request;
  try {
    const json = await request.json();
    body = parseBody(json);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid JSON body.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  try {
    const result = await runGenerateBankV2Batch(body);
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    if (e instanceof GeminiGenerationError) {
      return NextResponse.json(
        { ok: false, error: e.message, stage: "generate" },
        { status: e.status ?? 500 },
      );
    }
    const message = e instanceof Error ? e.message : "Unknown error.";
    const isClient = message.startsWith("LearningSkill not found") || message.includes("Invalid topicKey") || message.includes("count must");
    return NextResponse.json({ ok: false, error: message }, { status: isClient ? 400 : 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
