/**
 * Admin-side Markdown lesson factory: builds prompts, calls `completeChat`, validates structure,
 * persists to `Lesson` (topic-scoped rows). Not used from learner request paths.
 */
import { PHASE1_TOPIC_LABELS } from "@/content/programs/phase1/skill-map";
import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { validateLessonStructure } from "@/lib/content-qa-rules";
import { primaryModuleForTopic } from "@/lib/learning-path";
import { prisma } from "@/lib/prisma";

import { completeChat } from "./gateway";
import { logLlmUsage } from "./usage-log";
import type { LlmGatewayCompleteResult } from "./types";

export const LESSON_MARKDOWN_PROMPT_VERSION = "lesson-md-factory-v1";

/** Fixed `##` headings (Traditional Chinese). Validation is heading-based, not zod — see runbook. */
export const LESSON_MARKDOWN_REQUIRED_HEADINGS = [
  "核心規則",
  "識別信號",
  "例句",
  "常見錯誤",
  "應試提示",
  "快速自測",
] as const;

const FACTORY_LESSON_INDEX_BASE = 800;

const LEARNER_PROFILE_ZH = [
  "學習者假設：繁體中文母語使用者、成人、工程／科技工作背景。",
  "考試目標：TOEIC Reading / Part 5–6 取向；要精準、可操作的應試步驟。",
  "語氣：教學導向、短句、不要廢話、不要聊天式開場。",
].join("\n");

export type TopicLessonGeneratorInput = {
  topicKey: Phase1TopicKey;
  /** Extra free-text description of the topic domain (e.g. module summary). */
  topicDescriptionZh: string;
  moduleTitleZh: string;
  moduleTitleEn: string;
  /** Phase1 skill keys covered by the hosting module (strings). */
  skillKeys: string[];
  /** Optional sample stems from the bank to ground examples. */
  sampleQuestions?: Array<{ stem: string }>;
};

export type GenerateTopicLessonResult = {
  ok: boolean;
  /** True when `bodyMarkdown` already existed and `force` was false — no LLM call. */
  skipped?: boolean;
  topicKey: Phase1TopicKey;
  markdown?: string;
  gateway?: LlmGatewayCompleteResult;
  structureErrors?: string[];
  persistError?: string;
  lessonId?: string;
  qaStatus?: "draft" | "qa_failed" | "approved" | "needs_regen";
  qaIssues?: string[];
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Strips optional ```markdown fences so validation runs on raw Markdown body. */
export function stripOuterMarkdownFence(text: string): string {
  const t = text.trim();
  const m = /^```(?:markdown|md)?\s*\n?([\s\S]*?)```$/i.exec(t);
  if (m?.[1]) {
    return m[1].trim();
  }
  return t;
}

/**
 * Structure check: each section must appear as a level-2 heading `## 標題` (exact titles, Traditional Chinese).
 * This is intentionally **not** zod — we validate document shape for teaching content, not JSON.
 */
export function validateLessonMarkdownStructure(markdown: string): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const md = stripOuterMarkdownFence(markdown);
  if (md.length < 120) {
    errors.push("內容過短（< 120 字元），可能不完整。");
  }
  for (const title of LESSON_MARKDOWN_REQUIRED_HEADINGS) {
    const re = new RegExp(`^##\\s*${escapeRegExp(title)}\\s*$`, "m");
    if (!re.test(md)) {
      errors.push(`缺少或標題格式不正確：## ${title}（需為 H2、單獨一行）`);
    }
  }
  return { ok: errors.length === 0, errors };
}

function splitTopicLabel(topicKey: Phase1TopicKey): { titleZh: string; titleEn: string } {
  const raw = PHASE1_TOPIC_LABELS[topicKey];
  const parts = raw.split(" / ").map((s) => s.trim());
  return { titleZh: parts[0] ?? raw, titleEn: parts[1] ?? parts[0] ?? raw };
}

export function buildLessonMarkdownMessages(input: TopicLessonGeneratorInput) {
  const { titleZh, titleEn } = splitTopicLabel(input.topicKey);
  const samples =
    input.sampleQuestions && input.sampleQuestions.length > 0
      ? input.sampleQuestions
          .slice(0, 5)
          .map((q, i) => `${i + 1}. ${q.stem.replace(/\s+/g, " ").slice(0, 400)}`)
          .join("\n")
      : "（題庫未提供範例題；請仍依主題撰寫，勿虛構題號。）";

  const skills = input.skillKeys.length > 0 ? input.skillKeys.join(", ") : "（未列出）";

  const system = `
你是 TOEIC 備考教材編輯。只輸出繁體中文（台灣用字）Markdown 本文。
禁止簡體字。不要前言後語、不要自介、不要「好的我來幫你」。
${LEARNER_PROFILE_ZH}
`.trim();

  const user = `
請為以下主題撰寫「單篇」精簡教學 Markdown（僅本文，不要 JSON）。

【主題鍵】${input.topicKey}
【主題名（中）】${titleZh}
【主題名（英）】${titleEn}
【模組脈絡（中）】${input.moduleTitleZh}
【模組脈絡（英）】${input.moduleTitleEn}
【主題說明】
${input.topicDescriptionZh.trim()}

【相關 skill keys】${skills}

【可選範例題幹（僅供語境，勿逐字抄成考題）】
${samples}

【版面強制要求】
- 依序使用以下 H2 標題（逐字相同），每段都要有實質內容（條列或短段落皆可）：
${LESSON_MARKDOWN_REQUIRED_HEADINGS.map((h) => `  - ## ${h}`).join("\n")}
- 全文使用 Markdown；可加粗 **…**；不要包在 code fence 裡。
- 教學節奏（請配合，利於前台「例句優先」呈現）：
  - 「例句」先給對照：盡量各用一行標出 **正解：** … 與 **易誤：** …（或 ✅ / ❌ 開頭行亦可），其餘文字用來說「差異觀察」。
  - 「常見錯誤」建議用 \`###\` 小標分段（例如：誤選／看起來合理／實際錯因），每段 1–4 句即可。
  - 「快速自測」第一行寫題幹（可含問號）；選項用 \`- \` 條列；獨立一行 \`答案：…\`；其餘為簡短解析。
`.trim();

  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}

async function logStructureFailure(gateway: LlmGatewayCompleteResult, errors: string[]) {
  await logLlmUsage({
    taskType: "lesson_markdown",
    provider: gateway.provider,
    model: gateway.model,
    promptVersion: `${LESSON_MARKDOWN_PROMPT_VERSION}-structure-reject`,
    promptTokens: gateway.promptTokens,
    completionTokens: gateway.completionTokens,
    cachedTokens: gateway.cachedTokens,
    cacheWriteTokens: gateway.cacheWriteTokens,
    costUsd: 0,
    latencyMs: gateway.latencyMs,
    success: false,
    errorMessage: `STRUCTURE: ${errors.join("; ")}`,
  });
}

/**
 * Calls the gateway, validates Markdown sections, returns text (not persisted).
 */
export async function generateTopicLessonMarkdown(
  input: TopicLessonGeneratorInput,
  options?: { temperature?: number; providerOrder?: import("./types").LlmProvider[] },
): Promise<GenerateTopicLessonResult> {
  const messages = buildLessonMarkdownMessages(input);
  const gateway = await completeChat(messages, {
    taskType: "lesson_markdown",
    promptVersion: LESSON_MARKDOWN_PROMPT_VERSION,
    temperature: options?.temperature ?? 0.45,
    providerOrder: options?.providerOrder,
  });

  if (!gateway.ok) {
    return { ok: false, topicKey: input.topicKey, gateway };
  }

  const md = stripOuterMarkdownFence(gateway.text);
  const { ok, errors } = validateLessonMarkdownStructure(md);
  if (!ok) {
    await logStructureFailure(gateway, errors);
    return {
      ok: false,
      topicKey: input.topicKey,
      gateway,
      structureErrors: errors,
    };
  }

  const qa = validateLessonStructure(md);
  if (!qa.passed) {
    const qaMessages = qa.issues.map((i) => `${i.code}: ${i.message}`);
    await logStructureFailure(gateway, qaMessages);
    return {
      ok: false,
      topicKey: input.topicKey,
      gateway,
      structureErrors: qaMessages,
      qaStatus: qa.status,
      qaIssues: qaMessages,
    };
  }

  return {
    ok: true,
    topicKey: input.topicKey,
    markdown: md,
    gateway,
    qaStatus: qa.status,
    qaIssues: qa.issues.map((i) => `${i.code}: ${i.message}`),
  };
}

function factoryLessonIndex(topicKey: Phase1TopicKey): number {
  const i = PHASE1_TOPIC_KEYS_IN_ORDER.indexOf(topicKey);
  return FACTORY_LESSON_INDEX_BASE + (i === -1 ? 0 : i);
}

/**
 * Loads module + optional sample questions, generates Markdown, validates, upserts `Lesson` by `topicKey`.
 */
export async function generateAndPersistTopicLesson(params: {
  topicKey: Phase1TopicKey;
  /** When true, overwrite existing non-empty `bodyMarkdown`. */
  force?: boolean;
  temperature?: number;
  providerOrder?: import("./types").LlmProvider[];
}): Promise<GenerateTopicLessonResult> {
  const { topicKey, force, temperature, providerOrder } = params;
  const mod = primaryModuleForTopic(topicKey);
  const lessonIndex = factoryLessonIndex(topicKey);
  const existing = await prisma.lesson.findUnique({
    where: { moduleKey_lessonIndex: { moduleKey: mod.moduleKey, lessonIndex } },
  });
  if (existing?.bodyMarkdown && existing.bodyMarkdown.trim().length > 0 && !force) {
    const qa = validateLessonStructure(existing.bodyMarkdown);
    return {
      ok: qa.passed,
      skipped: true,
      topicKey,
      markdown: existing.bodyMarkdown,
      lessonId: existing.id,
      qaStatus: qa.status,
      qaIssues: qa.issues.map((i) => `${i.code}: ${i.message}`),
    };
  }

  const samples = await prisma.questionBankItem.findMany({
    where: { topicKey },
    take: 4,
    orderBy: { id: "asc" },
    select: { questionText: true },
  });

  const gen = await generateTopicLessonMarkdown(
    {
      topicKey,
      topicDescriptionZh: `${mod.summaryZh}\n\n（主題標籤：${PHASE1_TOPIC_LABELS[topicKey]}）`,
      moduleTitleZh: mod.titleZh,
      moduleTitleEn: mod.titleEn,
      skillKeys: mod.targetSkills,
      sampleQuestions: samples.map((s) => ({ stem: s.questionText })),
    },
    { temperature, providerOrder },
  );

  if (!gen.ok || !gen.markdown) {
    return { ...gen, lessonId: existing?.id ?? gen.lessonId };
  }

  const { titleZh, titleEn } = splitTopicLabel(topicKey);

  try {
    const row = await prisma.lesson.upsert({
      where: { moduleKey_lessonIndex: { moduleKey: mod.moduleKey, lessonIndex } },
      create: {
        moduleKey: mod.moduleKey,
        lessonIndex,
        titleZh: `${titleZh} · 教學稿`,
        titleEn: `${titleEn} · Lesson`,
        topicKey,
        bodyMarkdown: gen.markdown,
      },
      update: {
        moduleKey: mod.moduleKey,
        lessonIndex,
        titleZh: `${titleZh} · 教學稿`,
        titleEn: `${titleEn} · Lesson`,
        topicKey,
        bodyMarkdown: gen.markdown,
      },
    });
    return { ...gen, ok: true, lessonId: row.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ...gen, ok: false, persistError: msg };
  }
}
