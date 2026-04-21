/**
 * Week 1 lesson capsules (8 units): LLM generation with static fallback, QA checks, Prisma upsert.
 *
 * Usage:
 *   npx tsx scripts/generate-week1-lessons.ts --dry-run
 *   npx tsx scripts/generate-week1-lessons.ts --save
 *   npx tsx scripts/generate-week1-lessons.ts --dry-run --unit=grammar_svc_core
 *
 * Optional `--use-llm`: call Gemini (gemini-2.5-flash via gateway) first; on failure or QA/simplified
 * issues, fall back to curated static Markdown in `src/lib/content/week1-lesson-static.ts`.
 * Default (no flag): static only — fast, deterministic, no API calls.
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { z } from "zod";

import { PHASE1_TOPIC_KEYS_IN_ORDER } from "../src/content/programs/phase1/topic-order";
import { PHASE1_TOPIC_LABELS } from "../src/content/programs/phase1/skill-map";
import type { Phase1TopicKey } from "../src/content/programs/phase1/types";
import { WEEK1_LESSON_STATIC_MARKDOWN } from "../src/lib/content/week1-lesson-static";
import {
  WEEK1_LESSON_MODULE_KEY,
  WEEK1_LESSON_UNIT_SPECS,
  type Week1LessonUnitId,
} from "../src/lib/content/week1-lesson-units";
import { validateLessonStructure } from "../src/lib/content-qa-rules";
import { completeChat } from "../src/lib/llm/gateway";
import {
  stripOuterMarkdownFence,
  validateLessonMarkdownStructure,
} from "../src/lib/llm/lesson-generator";
import { prisma } from "../src/lib/prisma";

/** User-specified probe for accidental simplified glyphs in lesson bodies. */
const SIMPLIFIED_CHAR_PROBE = /[这个们国学时会说对]/;

const WEEK1_UNIT_IDS = WEEK1_LESSON_UNIT_SPECS.map((s) => s.unit);

const cliSchema = z
  .object({
    dryRun: z.boolean(),
    save: z.boolean(),
    useLlm: z.boolean(),
    unit: z.string().optional(),
  })
  .refine((v) => v.dryRun !== v.save, { message: "Specify exactly one of --dry-run or --save" })
  .refine((v) => v.dryRun || v.save, { message: "Specify --dry-run or --save" });

function parseCli(argv: string[]) {
  const unknown: string[] = [];
  let dryRun = false;
  let save = false;
  let useLlm = false;
  let unit: string | undefined;
  for (const a of argv) {
    if (a === "--dry-run") dryRun = true;
    else if (a === "--save") save = true;
    else if (a === "--use-llm") useLlm = true;
    else if (a.startsWith("--unit=")) unit = a.slice("--unit=".length).trim() || undefined;
    else if (a.startsWith("--")) unknown.push(a);
  }
  if (unknown.length > 0) {
    throw new Error(`Unknown flag(s): ${unknown.join(", ")}`);
  }
  const parsed = cliSchema.parse({ dryRun, save, useLlm, unit });
  if (parsed.unit && !WEEK1_UNIT_IDS.includes(parsed.unit as Week1LessonUnitId)) {
    throw new Error(`Invalid --unit=${parsed.unit}; expected one of: ${WEEK1_UNIT_IDS.join(", ")}`);
  }
  return parsed;
}

function hasSimplifiedProbe(md: string): boolean {
  return SIMPLIFIED_CHAR_PROBE.test(md);
}

async function ensureLearningTopicRow(topicKey: Phase1TopicKey) {
  const orderIndex = PHASE1_TOPIC_KEYS_IN_ORDER.indexOf(topicKey);
  const raw = PHASE1_TOPIC_LABELS[topicKey];
  const parts = raw.split(" / ").map((s) => s.trim());
  await prisma.learningTopic.upsert({
    where: { topicKey },
    create: {
      topicKey,
      orderIndex: orderIndex === -1 ? 0 : orderIndex,
      labelZh: parts[0] ?? raw,
      labelEn: parts[1] ?? parts[0] ?? raw,
    },
    update: {},
  });
}

function buildLlmPrompt(spec: (typeof WEEK1_LESSON_UNIT_SPECS)[number], strictNoSimplified: boolean) {
  const headings = ["例句", "識別信號", "核心規則", "常見錯誤", "應試提示", "快速自測"].join("、");
  const system = [
    "你是 TOEIC 閱讀教學助理。只輸出繁體中文（台灣用字）與必要的英文例句。",
    "禁止輸出簡體中文；禁止使用簡體字形（例如：学、国、对、说、时、会）。",
    "Markdown 規格：第一行必須是單一 H1（# 標題）。",
    "接下來六個段落標題必須各出現一次，且每一行必須完全符合（單獨一行、H2、無編號）：",
    "## 例句",
    "## 識別信號",
    "## 核心規則",
    "## 常見錯誤",
    "## 應試提示",
    "## 快速自測",
    "每個 H2 下方必須有內容；其中「識別信號」不可空白。",
    strictNoSimplified ? "上一輪偵測到簡體字形風險：請全面改寫，確保只使用台灣繁體字形。" : "",
  ]
    .filter(Boolean)
    .join("\n");

  const user = [
    `單元 id：${spec.unit}`,
    `教學類型：${spec.lessonType}；建議閱讀分鐘：${spec.estimatedReadMins}`,
    `中文標題：${spec.titleZh}；英文標題：${spec.titleEn}`,
    "教學重點（請融入內容，不要逐條照抄小標）：",
    ...spec.teachingBulletsZh.map((b) => `- ${b}`),
    "",
    spec.unit === "grammar_svc_core"
      ? "例句段落至少 3 句英文，且至少 1 句需含工程／半導體場景（例如 sensor、firmware、yield）。"
      : "",
    spec.unit === "grammar_svoo_core" ? "必須清楚對比 give…to 與 buy…for；並說明 explain 不能直接雙受詞。" : "",
    "",
    `請輸出完整 Markdown（含六個 H2：${headings}）。不要包在 code fence 內。`,
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}

type GenOutcome = {
  body: string;
  source: "llm" | "static";
  simplifiedCharsFound: boolean;
  simplifiedRetry: boolean;
  llmErrors: string[];
};

async function generateBodyForUnit(
  spec: (typeof WEEK1_LESSON_UNIT_SPECS)[number],
  preferLlm: boolean,
): Promise<GenOutcome> {
  const staticBody = WEEK1_LESSON_STATIC_MARKDOWN[spec.unit];
  const llmErrors: string[] = [];
  let simplifiedRetry = false;

  const finalize = (body: string, source: GenOutcome["source"], simplifiedCharsFound: boolean): GenOutcome => ({
    body,
    source,
    simplifiedCharsFound,
    simplifiedRetry,
    llmErrors,
  });

  const callRawLlm = async (strict: boolean): Promise<string | null> => {
    const { system, user } = buildLlmPrompt(spec, strict);
    const r = await completeChat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      {
        taskType: "lesson_markdown",
        promptVersion: "week1-lesson-gen-v1",
        temperature: 0.5,
        maxOutputTokens: 4096,
        providerOrder: ["google"],
      },
    );
    if (!r.ok || !r.text?.trim()) {
      llmErrors.push(r.errorMessage ?? "LLM empty or failed");
      return null;
    }
    return stripOuterMarkdownFence(r.text);
  };

  if (preferLlm && process.env.GEMINI_API_KEY?.trim()) {
    let md = await callRawLlm(false);
    if (md && hasSimplifiedProbe(md)) {
      simplifiedRetry = true;
      md = await callRawLlm(true);
    }
    if (md && hasSimplifiedProbe(md)) {
      llmErrors.push("simplified_after_retry");
      md = null;
    }
    if (md) {
      const struct = validateLessonMarkdownStructure(md);
      const qa = validateLessonStructure(md);
      if (struct.ok && qa.passed) {
        return finalize(md, "llm", false);
      }
      if (!struct.ok) llmErrors.push(...struct.errors.map((e) => `structure:${e}`));
      if (!qa.passed) llmErrors.push(...qa.issues.map((i) => `qa:${i.code}`));
    }
  }

  const s0 = stripOuterMarkdownFence(staticBody);
  const simpStatic = hasSimplifiedProbe(s0);
  return finalize(s0, "static", simpStatic);
}

async function main() {
  const args = parseCli(process.argv.slice(2));
  const preferLlm = args.useLlm;
  const specs = args.unit
    ? WEEK1_LESSON_UNIT_SPECS.filter((s) => s.unit === args.unit)
    : [...WEEK1_LESSON_UNIT_SPECS];

  const simplifiedRetryEvents: string[] = [];

  for (const spec of specs) {
    const outcome = await generateBodyForUnit(spec, preferLlm);
    if (outcome.simplifiedRetry) {
      simplifiedRetryEvents.push(`${spec.unit}: second LLM call after simplified-char probe matched`);
    }
    const stripped = stripOuterMarkdownFence(outcome.body);
    const charCount = stripped.length;
    const preview = stripped.slice(0, 200) + (stripped.length > 200 ? "..." : "");

    if (args.dryRun) {
      console.log(
        JSON.stringify(
          {
            unit: spec.unit,
            topicCode: spec.topicKey,
            lessonType: spec.lessonType,
            estimatedReadMins: spec.estimatedReadMins,
            charCount,
            simplified_chars_found: outcome.simplifiedCharsFound,
            preview,
          },
          null,
          2,
        ),
      );
      continue;
    }

    // save
    const { struct, qa } = (() => {
      const s = stripOuterMarkdownFence(outcome.body);
      return {
        struct: validateLessonMarkdownStructure(s),
        qa: validateLessonStructure(s),
      };
    })();

    if (outcome.simplifiedCharsFound || !struct.ok || !qa.passed) {
      const reason = [
        outcome.simplifiedCharsFound ? "simplified_char_probe" : "",
        !struct.ok ? struct.errors.join("; ") : "",
        !qa.passed ? qa.issues.map((i) => i.code).join("; ") : "",
      ]
        .filter(Boolean)
        .join(" — ");
      console.error(`❌ failed: ${spec.unit} — ${reason}`);
      continue;
    }

    try {
      await ensureLearningTopicRow(spec.topicKey);
      await prisma.lesson.upsert({
        where: {
          moduleKey_lessonIndex: {
            moduleKey: WEEK1_LESSON_MODULE_KEY,
            lessonIndex: spec.lessonIndex,
          },
        },
        create: {
          moduleKey: WEEK1_LESSON_MODULE_KEY,
          lessonIndex: spec.lessonIndex,
          titleZh: spec.titleZh,
          titleEn: spec.titleEn,
          topicKey: spec.topicKey,
          bodyMarkdown: stripped,
        },
        update: {
          titleZh: spec.titleZh,
          titleEn: spec.titleEn,
          topicKey: spec.topicKey,
          bodyMarkdown: stripped,
        },
      });
      console.log(`✅ saved: ${spec.unit}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`❌ failed: ${spec.unit} — ${msg}`);
    }
  }

  if (simplifiedRetryEvents.length > 0) {
    console.error("Simplified-char retry events:\n" + simplifiedRetryEvents.join("\n"));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
