/**
 * Timed checkpoint (TEST) mode — pure scoring + question-set construction.
 * PRACTICE uses `practiceStateJson`; TEST uses `testStateJson` on LearningSessionItem.
 */

import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { prisma } from "@/lib/prisma";

/** Default checkpoint length */
export const TEST_QUESTION_COUNT = 15;

/** Positions 1–10 (indices 0–9): target topic; used for topic accuracy rule */
export const TEST_TOPIC_RULE_COUNT = 10;

/** Positions 11–15 (indices 10–14): mixed-topic distractors */
export const TEST_DISTRACTOR_COUNT = 5;

export const TEST_SECONDS_PER_QUESTION = 30;

/** Stored in `userChoice` when the timer expires — must stay consistent across client + server */
export const TEST_TIMEOUT_USER_CHOICE = "TIMEOUT" as const;

export type TestItemPhase = "pending" | "shown" | "answered";

export type TestItemStateJson = {
  v: 1;
  phase: TestItemPhase;
  mode: "test";
  shownAt?: string;
  userChoice?: string;
  correct?: boolean;
  answeredAt?: string;
  timeTakenSec?: number;
  timedOut?: boolean;
  lastSubmitKey?: string;
};

export function emptyTestItemState(): TestItemStateJson {
  return { v: 1, phase: "pending", mode: "test" };
}

export function parseTestItemState(raw: unknown): TestItemStateJson {
  if (!raw || typeof raw !== "object") {
    return emptyTestItemState();
  }
  const o = raw as Record<string, unknown>;
  const phase = o.phase === "shown" || o.phase === "answered" ? o.phase : "pending";
  return {
    v: 1,
    phase,
    mode: "test",
    shownAt: typeof o.shownAt === "string" ? o.shownAt : undefined,
    userChoice: typeof o.userChoice === "string" ? o.userChoice : undefined,
    correct: typeof o.correct === "boolean" ? o.correct : undefined,
    answeredAt: typeof o.answeredAt === "string" ? o.answeredAt : undefined,
    timeTakenSec: typeof o.timeTakenSec === "number" && Number.isFinite(o.timeTakenSec) ? o.timeTakenSec : undefined,
    timedOut: typeof o.timedOut === "boolean" ? o.timedOut : undefined,
    lastSubmitKey: typeof o.lastSubmitKey === "string" ? o.lastSubmitKey : undefined,
  };
}

export function isTestItemResolved(st: TestItemStateJson): boolean {
  return st.phase === "answered" && st.userChoice != null && st.correct != null;
}

// ─── Pass rules (pure) ─────────────────────────────────────────────

export type CheckpointScoreInput = {
  /** Length `TEST_QUESTION_COUNT`; index `< TEST_TOPIC_RULE_COUNT` = target-topic slot */
  answers: ReadonlyArray<{ correct: boolean; timedOut: boolean }>;
};

export type CheckpointScoreResult = {
  topicCorrect: number;
  topicAccuracy: number;
  overallCorrect: number;
  overallAccuracy: number;
  timeoutCount: number;
  passed: boolean;
};

const DEFAULT_TOPIC_MIN = 0.8;
const DEFAULT_OVERALL_MIN = 0.7;
/** When total items &lt; 15, pass requires only overall accuracy ≥ this threshold. */
const SHORT_SESSION_OVERALL_MIN = 0.75;
/** Full rules (skill slice + overall) apply when session length ≥ this. */
export const CHECKPOINT_FULL_RULE_MIN_ITEMS = 15;

/**
 * Variable-length checkpoint scoring.
 * - If `answers.length >= 15`: first `skillRuleSlots` answers (cap 10) vs **topicMin** + overall vs **overallMin**.
 * - If shorter: **overall** ≥ `shortSessionOverallMin` (default 0.75) only.
 */
export function scoreCheckpointSession(
  input: {
    answers: ReadonlyArray<{ correct: boolean; timedOut: boolean }>;
    /** Usually `min(10, n)` — positions used for “target skill phase” rule. */
    skillRuleSlots: number;
  },
  opts?: { topicMin?: number; overallMin?: number; shortSessionOverallMin?: number },
): CheckpointScoreResult {
  const topicMin = opts?.topicMin ?? DEFAULT_TOPIC_MIN;
  const overallMin = opts?.overallMin ?? DEFAULT_OVERALL_MIN;
  const shortOverallMin = opts?.shortSessionOverallMin ?? SHORT_SESSION_OVERALL_MIN;
  const answers = input.answers;
  const n = answers.length;

  let timeoutCount = 0;
  for (const a of answers) {
    if (a.timedOut) {
      timeoutCount += 1;
    }
  }

  if (n === 0) {
    return {
      topicCorrect: 0,
      topicAccuracy: 0,
      overallCorrect: 0,
      overallAccuracy: 0,
      timeoutCount: 0,
      passed: false,
    };
  }

  const skillSlots = Math.min(Math.max(0, input.skillRuleSlots), n);
  const topicSlice = answers.slice(0, skillSlots);
  const topicCorrect = topicSlice.filter((a) => a.correct).length;
  const topicAccuracy = skillSlots > 0 ? topicCorrect / skillSlots : 0;

  const overallCorrect = answers.filter((a) => a.correct).length;
  const overallAccuracy = overallCorrect / n;

  const passed =
    n >= CHECKPOINT_FULL_RULE_MIN_ITEMS
      ? topicAccuracy >= topicMin && overallAccuracy >= overallMin
      : overallAccuracy >= shortOverallMin;

  return {
    topicCorrect,
    topicAccuracy,
    overallCorrect,
    overallAccuracy,
    timeoutCount,
    passed,
  };
}

/**
 * Default checkpoint pass rule (legacy **15**-question sessions):
 * - Target-topic slots (positions 1–10): accuracy ≥ 80%
 * - All 15: accuracy ≥ 70%
 */
export function scoreCheckpoint(
  input: CheckpointScoreInput,
  opts?: { topicMin?: number; overallMin?: number },
): CheckpointScoreResult {
  const answers = input.answers;
  if (answers.length !== TEST_QUESTION_COUNT) {
    throw new Error(`scoreCheckpoint: expected ${TEST_QUESTION_COUNT} answers, got ${answers.length}`);
  }
  return scoreCheckpointSession({ answers, skillRuleSlots: TEST_TOPIC_RULE_COUNT }, opts);
}

// ─── Result summary (pure, given scored rows) ────────────────────

export type TestPerItemResultRow = {
  position: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  userChoice: string;
  correctAnswer: string;
  correct: boolean;
  timedOut: boolean;
  timeTakenSec: number | null;
  explanation: string | null;
};

export type TestResultSummary = {
  totalQuestions: number;
  topicCorrect: number;
  topicAccuracy: number;
  overallCorrect: number;
  overallAccuracy: number;
  /** Among bank rows whose `primaryLearningSkillCode` equals the checkpoint target skill (if known). */
  targetSkillAccuracy?: number;
  targetSkillCorrect?: number;
  targetSkillTotal?: number;
  timeoutCount: number;
  passed: boolean;
  avgTimeTakenSec: number | null;
  perItem: TestPerItemResultRow[];
  /** Present when computed on the server (fast/slow vs peers, timeouts, etc.). */
  hesitation?: {
    summary: { fluent: number; hesitant: number; struggling: number };
    items: Array<{
      position: number;
      questionId: number;
      tier: "fluent" | "hesitant" | "struggling";
      reasons: string[];
      resolveSec: number | null;
    }>;
  };
};

export function getTestResultSummary(params: {
  items: ReadonlyArray<{
    position: number;
    questionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
    explanation: string | null;
    primaryLearningSkillCode?: string | null;
    testState: TestItemStateJson;
  }>;
  /** Defaults to `min(10, n)` when omitted. */
  skillRuleSlots?: number;
  /** If set, computes bank-based target skill accuracy for the results UI. */
  targetSkillCode?: string | null;
}): TestResultSummary {
  const builtAnswers: { correct: boolean; timedOut: boolean }[] = [];
  const perItem: TestPerItemResultRow[] = [];

  const ordered = [...params.items].sort((a, b) => a.position - b.position);

  for (const row of ordered) {
    const st = row.testState;
    const timedOut = Boolean(st.timedOut) || st.userChoice === TEST_TIMEOUT_USER_CHOICE;
    const correct = Boolean(st.correct);
    builtAnswers.push({ correct, timedOut });

    perItem.push({
      position: row.position,
      questionText: row.questionText,
      optionA: row.optionA,
      optionB: row.optionB,
      optionC: row.optionC,
      optionD: row.optionD,
      userChoice: st.userChoice ?? "—",
      correctAnswer: row.correctAnswer,
      correct,
      timedOut,
      timeTakenSec: typeof st.timeTakenSec === "number" ? st.timeTakenSec : null,
      explanation: row.explanation,
    });
  }

  const n = builtAnswers.length;
  if (n === 0) {
    return {
      totalQuestions: 0,
      topicCorrect: 0,
      topicAccuracy: 0,
      overallCorrect: 0,
      overallAccuracy: 0,
      timeoutCount: 0,
      passed: false,
      avgTimeTakenSec: null,
      perItem: [],
    };
  }

  const ruleSlots = params.skillRuleSlots ?? Math.min(TEST_TOPIC_RULE_COUNT, n);
  const score = scoreCheckpointSession({ answers: builtAnswers, skillRuleSlots: ruleSlots });

  const times = perItem.map((p) => p.timeTakenSec).filter((t): t is number => t != null && Number.isFinite(t));
  const avgTimeTakenSec =
    times.length === 0 ? null : times.reduce((a, b) => a + b, 0) / times.length;

  const target = params.targetSkillCode?.trim();
  let targetSkillAccuracy: number | undefined;
  let targetSkillCorrect: number | undefined;
  let targetSkillTotal: number | undefined;
  if (target) {
    let sk = 0;
    let stot = 0;
    for (let i = 0; i < ordered.length; i += 1) {
      const row = ordered[i]!;
      if (row.primaryLearningSkillCode !== target) {
        continue;
      }
      stot += 1;
      if (builtAnswers[i]!.correct) {
        sk += 1;
      }
    }
    if (stot > 0) {
      targetSkillTotal = stot;
      targetSkillCorrect = sk;
      targetSkillAccuracy = sk / stot;
    }
  }

  return {
    totalQuestions: n,
    ...score,
    targetSkillAccuracy,
    targetSkillCorrect,
    targetSkillTotal,
    avgTimeTakenSec,
    perItem,
  };
}

// ─── Question selection (DB; with documented fallbacks) ───────────

export type TestQuestionSetBuildResult = {
  questionIds: number[];
  compositionWarnings: string[];
};

function uniqPreserve<T>(ids: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

function relatedTopicKeys(topicKey: Phase1TopicKey): Phase1TopicKey[] {
  const idx = PHASE1_TOPIC_KEYS_IN_ORDER.indexOf(topicKey);
  const out: Phase1TopicKey[] = [];
  if (idx > 0) {
    out.push(PHASE1_TOPIC_KEYS_IN_ORDER[idx - 1]!);
  }
  if (idx >= 0 && idx < PHASE1_TOPIC_KEYS_IN_ORDER.length - 1) {
    out.push(PHASE1_TOPIC_KEYS_IN_ORDER[idx + 1]!);
  }
  return uniqPreserve(out);
}

/**
 * Builds 15 question ids:
 * - 1–5: target topic, easier band (difficulty A, then B)
 * - 6–10: target topic, harder band (difficulty C, then unused B)
 * - 11–15: non-target topics (related first, then other Phase1 keys, then any row — last resort)
 *
 * **Temporary heuristic:** `QuestionBankItem.difficulty` is A/B/C (see `question-fields.ts`).
 * `topicKey` / `skillKey` may be null on older rows — pools are filled in order with explicit warnings.
 */
export async function buildTestQuestionSet(topicKey: Phase1TopicKey): Promise<TestQuestionSetBuildResult> {
  const warnings: string[] = [];
  const used = new Set<number>();
  const ids: number[] = [];

  const take = (candidates: number[], n: number) => {
    for (const id of candidates) {
      if (ids.length >= TEST_QUESTION_COUNT) {
        return;
      }
      if (ids.length >= n) {
        return;
      }
      if (!used.has(id)) {
        used.add(id);
        ids.push(id);
      }
    }
  };

  const allTopicRows = await prisma.questionBankItem.findMany({
    where: { topicKey },
    orderBy: { id: "asc" },
    select: { id: true, difficulty: true },
  });
  const byDiff = (d: string) => allTopicRows.filter((r) => r.difficulty === d).map((r) => r.id);

  const corePool = uniqPreserve([...byDiff("A"), ...byDiff("B")]);

  /** Slots 0–4: “core” */
  take(corePool, 5);
  if (ids.length < 5) {
    warnings.push("target_topic_core_pool_short:filled_from_remaining_topic_rows");
    const rest = allTopicRows.map((r) => r.id).filter((id) => !used.has(id));
    take(rest, 5);
  }

  /** Slots 5–9: “advanced” (prefer C, then B not yet used) */
  const advOrdered = uniqPreserve([...byDiff("C"), ...byDiff("B")]);
  const advCandidates = advOrdered.filter((id) => !used.has(id));
  take(advCandidates, 10);
  if (ids.length < 10) {
    warnings.push("target_topic_advanced_pool_short:filled_from_any_same_topic");
    const rest = allTopicRows.map((r) => r.id).filter((id) => !used.has(id));
    take(rest, 10);
  }

  if (ids.length < 10) {
    warnings.push("target_topic_total_short:non_topic_or_global_fallback_for_topic_slots");
    const anySameTopic = await prisma.questionBankItem.findMany({
      where: { topicKey },
      orderBy: { id: "asc" },
      select: { id: true },
    });
    take(
      anySameTopic.map((r) => r.id),
      10,
    );
  }

  /** Distractors 10–14 */
  const related = relatedTopicKeys(topicKey);
  for (const tk of related) {
    if (ids.length >= TEST_QUESTION_COUNT) {
      break;
    }
    const rows = await prisma.questionBankItem.findMany({
      where: { topicKey: tk },
      orderBy: { id: "asc" },
      select: { id: true },
    });
    take(
      rows.map((r) => r.id),
      TEST_QUESTION_COUNT,
    );
  }

  if (ids.length < TEST_QUESTION_COUNT) {
    warnings.push("distractor_pool_short:filling_from_other_phase1_topicKeys");
    for (const tk of PHASE1_TOPIC_KEYS_IN_ORDER) {
      if (tk === topicKey) {
        continue;
      }
      if (ids.length >= TEST_QUESTION_COUNT) {
        break;
      }
      const rows = await prisma.questionBankItem.findMany({
        where: { topicKey: tk },
        orderBy: { id: "asc" },
        select: { id: true },
      });
      take(
        rows.map((r) => r.id),
        TEST_QUESTION_COUNT,
      );
    }
  }

  if (ids.length < TEST_QUESTION_COUNT) {
    warnings.push("bank_thin:global_fallback_for_remaining_slots");
    const rows = await prisma.questionBankItem.findMany({
      where: { id: { notIn: [...used] } },
      orderBy: { id: "asc" },
      take: TEST_QUESTION_COUNT - ids.length,
      select: { id: true },
    });
    take(
      rows.map((r) => r.id),
      TEST_QUESTION_COUNT,
    );
  }

  if (ids.length < TEST_QUESTION_COUNT) {
    warnings.push("fatal:insufficient_questions_in_bank");
  }

  return {
    questionIds: ids.slice(0, TEST_QUESTION_COUNT),
    compositionWarnings: warnings,
  };
}

/**
 * Derives post-hoc warnings from the **actual** 15-question row (bank may lack metadata or pools may be thin).
 */
export function collectTestCompositionWarnings(
  targetTopic: Phase1TopicKey,
  orderedItems: ReadonlyArray<{ position: number; topicKey: string | null }>,
  opts?: { skillRuleSlots?: number },
): string[] {
  const skillSlots = opts?.skillRuleSlots ?? TEST_TOPIC_RULE_COUNT;
  const w: string[] = [];
  for (const it of orderedItems) {
    if (it.position < skillSlots && it.topicKey !== targetTopic) {
      w.push(`topic_rule_slot_${it.position}_topicKey_mismatch`);
    }
    if (it.position >= skillSlots && it.topicKey === targetTopic) {
      w.push(`distractor_slot_${it.position}_still_target_topic`);
    }
  }
  return w;
}
