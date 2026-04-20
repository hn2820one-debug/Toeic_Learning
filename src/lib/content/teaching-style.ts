/**
 * Unified learner-facing tone & length budgets for lessons, hints, feedback, micro-checks.
 * Spec: docs/teaching-quality-spec.md
 */

/** Character budgets (Unicode code units). Prefer staying under these for scan-friendly UI. */
export const TEACHING_LENGTH_LIMITS = {
  /** Hint 1 — direction / signals only */
  hintLevel1MaxChars: 420,
  /** Hint 2 — rule or comparison strategy */
  hintLevel2MaxChars: 420,
  /** Hint 3 — boundary / near-reveal (still teaching, not essay) */
  hintLevel3MaxChars: 360,
  /** Single line in choice feedback panels */
  feedbackWhyPlausibleMaxChars: 280,
  feedbackDecisiveDifferenceMaxChars: 280,
  feedbackRuleOneSentenceMaxChars: 160,
  feedbackRetryTipMaxChars: 220,
  /** Micro-check stem (before options / reveal) */
  microCheckQuestionMaxChars: 480,
  /** One trap card field (wrong / looks right / actually wrong) */
  trapFieldMaxChars: 320,
  /** Short learner takeaway note (listening / practice free text) */
  takeawayNoteMaxChars: 1200,
} as const;

/**
 * Tone guidelines for strings shown to learners (not operator docs).
 * Use as author checklist; does not perform runtime validation.
 */
export const LEARNER_FACING_TONE = {
  /** Prefer second person or imperative directed at the task */
  address: "你／請／先…再…",
  /** Wrong-answer framing: task/clue, not identity */
  mistakeFraming: "線索沒對完、搭配不成立、題幹語境不符——避免「你錯了因為你不夠好」",
  /** Bilingual labels: 中文為主教學句，英文短補充 */
  bilingualRule: "ZH primary for teaching moves; EN short gloss or section label",
} as const;

/**
 * Clip text to a max length with ellipsis (display helper).
 */
export function clipTeachingText(text: string, maxChars: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= maxChars) {
    return t;
  }
  return `${t.slice(0, Math.max(0, maxChars - 1))}…`;
}
