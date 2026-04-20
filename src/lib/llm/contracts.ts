/**
 * Zod contracts for LLM JSON outputs. Markdown-first tasks use string refinements.
 * App logic must only consume **validated** outputs (or deterministic fallbacks).
 */
import { z } from "zod";

/** Central prompt version strings — keep in sync with call sites. */
export const TASK_PROMPT_VERSIONS = {
  wrongAnswerExplain: "wrong-answer-explain-v1",
  weeklyCoachingReport: "weekly-coaching-report-v1",
  lessonMarkdown: "lesson-md-factory-v1",
  part5Generate: "part5-generate-v1",
  part5Verify: "part5-verify-v1",
  diagnosticSkillAnalyzer: "diagnostic-skill-analyzer-v1",
  guidedHint: "guided-hint-v1",
  checkpointFeedback: "checkpoint-feedback-v1",
  weeklyStudyPlan: "weekly-study-plan-v1",
} as const;

export const REQUIRED_WEEKLY_COACHING_HEADINGS = [
  "## 📈 本週進展",
  "## 🎯 3 個弱點",
  "## 🧮 TOEIC 估分",
  "## 🗓️ 下週 3 個行動項",
  "## 🔥 Productive-failure 鼓勵",
] as const;

/** Weekly coaching report: Markdown body (not JSON). */
export const WeeklyCoachingReportMarkdownSchema = z
  .string()
  .min(80)
  .refine((s) => REQUIRED_WEEKLY_COACHING_HEADINGS.every((h) => s.includes(h)), {
    message: "Missing one or more required weekly report headings",
  })
  .refine((s) => s.includes("粗略估計，非官方預測"), {
    message: "Missing TOEIC estimate disclaimer phrase",
  });

/** Plain-text wrong-answer coaching (Haiku path). */
export const WrongAnswerExplanationTextSchema = z.string().trim().min(20).max(12000);

export const Part5GeneratedItemSchema = z.object({
  stem: z.string(),
  choices: z.object({
    A: z.string(),
    B: z.string(),
    C: z.string(),
    D: z.string(),
  }),
  answer: z.enum(["A", "B", "C", "D"]),
  grammar_point: z.string(),
  difficulty: z.string(),
  explanation_zh_hant: z.string(),
});

export const Part5VerificationVerdictSchema = z.object({
  valid: z.boolean(),
  confidence: z.number(),
  issues: z.array(z.string()),
  suggested_fix: z.string().optional(),
});

export const GuidedHintOutputSchema = z.object({
  hintLevel1: z.string(),
  hintLevel2: z.string(),
  hintLevel3: z.string(),
  doNotRevealAnswerYet: z.boolean(),
});

export const CheckpointFeedbackOutputSchema = z.object({
  resultLabel: z.enum(["pass", "borderline", "retry"]),
  skillsToReview: z.array(z.string()),
  retryPlan: z.array(z.string()),
  advanceAllowed: z.boolean(),
  coachMessageZh: z.string(),
});

export const WeeklyStudyPlanOutputSchema = z.object({
  recommendedModuleKey: z.string(),
  reviewBlockZh: z.string(),
  drillBlockZh: z.string(),
  checkpointReadinessZh: z.string(),
  weeklyTargetZh: z.string(),
});

export function parseJsonFromLlmText<T>(raw: string, schema: z.ZodType<T>): { ok: true; data: T } | { ok: false; error: string } {
  const trimmed = raw.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)```$/i.exec(trimmed);
  const jsonText = fence?.[1]?.trim() ?? trimmed;
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "invalid json" };
  }
  const r = schema.safeParse(parsed);
  if (!r.success) {
    return { ok: false, error: r.error.message };
  }
  return { ok: true, data: r.data };
}

export function safeParseWeeklyCoachingMarkdown(text: string): { ok: true; data: string } | { ok: false; error: string } {
  const r = WeeklyCoachingReportMarkdownSchema.safeParse(text);
  if (!r.success) {
    return { ok: false, error: r.error.message };
  }
  return { ok: true, data: r.data };
}

export function safeParseWrongAnswerExplanationText(text: string): { ok: true; data: string } | { ok: false; error: string } {
  const r = WrongAnswerExplanationTextSchema.safeParse(text);
  if (!r.success) {
    return { ok: false, error: r.error.message };
  }
  return { ok: true, data: r.data };
}
