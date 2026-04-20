import type {
  CheckpointFeedbackOutput,
  DiagnosticSkillAnalyzerOutput,
  GuidedHintOutput,
  MicroLessonOutput,
  SkillSignal,
  WeeklyStudyPlanOutput,
} from "./types";

type ChoiceMap = Record<"A" | "B" | "C" | "D", string>;

type PromptBundle = {
  systemPrompt: string;
  userPrompt: string;
};

type ModuleCandidate = {
  moduleKey: string;
  titleZh: string;
  targetSkills: string[];
};

type RepresentativeQuestion = {
  questionText: string;
  choices: ChoiceMap;
  correctAnswer: "A" | "B" | "C" | "D";
  explanation?: string | null;
};

type DiagnosticSkillAnalyzerInput = {
  phaseKey: string;
  candidateModules: ModuleCandidate[];
  weakSkillSignals: SkillSignal[];
  emergingSkillSignals: SkillSignal[];
  recentAccuracyPercent: number | null;
  dueReviewCount: number;
};

type MicroLessonWriterInput = {
  skillKey: string;
  targetLevel: string;
  learnerWeakSpots: string[];
  representativeQuestions: RepresentativeQuestion[];
};

type GuidedHintInput = {
  skillKey: string;
  hintDepth: 1 | 2 | 3;
  questionText: string;
  choices: ChoiceMap;
  learnerChoice?: "A" | "B" | "C" | "D";
  correctAnswer?: "A" | "B" | "C" | "D";
  explanationSnapshot?: string | null;
};

type CheckpointFeedbackInput = {
  moduleKey: string;
  passAccuracyPercent: number;
  actualAccuracyPercent: number;
  skillsToReview: SkillSignal[];
  mistakes: RepresentativeQuestion[];
};

type WeeklyStudyPlanInput = {
  currentModuleKey?: string;
  dueReviewCount: number;
  recentAccuracyPercent: number | null;
  weakSkillSignals: SkillSignal[];
  checkpointReadinessSummary: string;
  nextModules: ModuleCandidate[];
};

export const DIAGNOSTIC_SKILL_ANALYZER_PROMPT_VERSION = "diagnostic-skill-analyzer-v1";
export const MICRO_LESSON_WRITER_PROMPT_VERSION = "micro-lesson-writer-v1";
export const GUIDED_HINT_PROMPT_VERSION = "guided-hint-v1";
export const CHECKPOINT_FEEDBACK_COACH_PROMPT_VERSION = "checkpoint-feedback-coach-v1";
export const WEEKLY_STUDY_PLAN_PROMPT_VERSION = "weekly-study-plan-v2";

function renderJsonContract(sample: unknown) {
  return JSON.stringify(sample, null, 2);
}

function formatSkillSignals(skillSignals: SkillSignal[]) {
  if (skillSignals.length === 0) {
    return "[]";
  }

  return JSON.stringify(skillSignals, null, 2);
}

function formatRepresentativeQuestions(questions: RepresentativeQuestion[]) {
  if (questions.length === 0) {
    return "[]";
  }

  return JSON.stringify(questions, null, 2);
}

export function buildDiagnosticSkillAnalyzerPrompt(input: DiagnosticSkillAnalyzerInput): PromptBundle {
  const systemPrompt = `
You are a TOEIC learning diagnostician for a closed-loop study system.

Your job is to analyze weak skills and choose the next best module.
Return strict JSON only.
Do not use markdown fences.
Do not add commentary before or after the JSON.

Rules:
- Use Traditional Chinese for all free-text explanation fields.
- Base the recommendation on the supplied skill signals and candidate modules only.
- Prefer the smallest next module that addresses the largest learning bottleneck.
- If the learner has high due reviews, avoid recommending a hard new module unless the weak-skill evidence is strong.
`.trim();

  const userPrompt = `
Analyze the learner's current state for program phase ${input.phaseKey}.

Recent accuracy percent:
${input.recentAccuracyPercent ?? "null"}

Due review count:
${input.dueReviewCount}

Weak skill signals:
${formatSkillSignals(input.weakSkillSignals)}

Emerging skill signals:
${formatSkillSignals(input.emergingSkillSignals)}

Candidate modules:
${JSON.stringify(input.candidateModules, null, 2)}

Return strict JSON in this shape:
${renderJsonContract({
    weakSkills: [
      {
        skillKey: "grammar.verb-control",
        category: "Grammar",
        topicLabels: ["文書作業 / Office Admin"],
        subFocusLabels: ["動詞時態 / Verb tense"],
        attempts: 12,
        accuracy: 58,
        evidenceQuestionIds: [101, 102],
      },
    ],
    emergingSkills: [],
    recommendedModuleKey: "phase1-core-grammar-control",
    confidence: 0.78,
    reasoningSummaryZh: "根據最近答題表現，學習者在動詞控制與句型搭配仍有明顯弱點，應先進入核心文法模組。",
  } satisfies DiagnosticSkillAnalyzerOutput)}
`.trim();

  return { systemPrompt, userPrompt };
}

export function buildMicroLessonWriterPrompt(input: MicroLessonWriterInput): PromptBundle {
  const systemPrompt = `
You are a bilingual TOEIC micro-lesson writer.

Write a short teaching artifact for one skill weakness.
Return strict JSON only.
Do not use markdown fences.
Do not add commentary before or after the JSON.

Rules:
- All explanation fields must be in Traditional Chinese.
- Keep the lesson concise enough to fit inside one lesson screen.
- Teach the concept first, then show how it appears in TOEIC answer choices.
- Use the representative questions only as support material, not as the whole lesson.
`.trim();

  const userPrompt = `
Create a micro-lesson for this skill:

skillKey: ${input.skillKey}
targetLevel: ${input.targetLevel}

Learner weak spots:
${JSON.stringify(input.learnerWeakSpots, null, 2)}

Representative questions:
${formatRepresentativeQuestions(input.representativeQuestions)}

Return strict JSON in this shape:
${renderJsonContract({
    lessonTitleZh: "動詞時態：先看時間線索再選答案",
    coreRuleZh: "若句中有明確時間線索，先判斷動作發生時間，再對應正確時態。",
    whyThisMattersZh: "TOEIC 文法題常用時間副詞或上下文流程測試你是否能正確判斷時態，而不只是背公式。",
    workedExamples: [
      {
        stem: "The team ____ the report before the client arrives.",
        whyCorrectZh: "before 子句提供時間先後，因此主句要用完成式表達先完成的動作。",
        whyWrongZh: ["一般現在式無法表達先完成的順序", "進行式不符合此處完成前置動作的需求"],
      },
    ],
    commonTraps: ["看到熟悉動詞就直覺選一般現在式", "沒有先找時間副詞與前後事件關係"],
    miniCheck: ["先找時間線索。", "再判斷動作先後。", "最後才比較四個選項的形式。"],
    reviewSummaryZh: "做題前先掃描時間與事件順序，可以大幅降低時態誤判。",
  } satisfies MicroLessonOutput)}
`.trim();

  return { systemPrompt, userPrompt };
}

export function buildGuidedHintPrompt(input: GuidedHintInput): PromptBundle {
  const systemPrompt = `
You are a TOEIC guided-practice coach.

Generate scaffolded hints without spoiling the answer too early.
Return strict JSON only.
Do not use markdown fences.
Do not add commentary before or after the JSON.

Rules:
- All hint text must be in Traditional Chinese.
- Hint level 1 should focus attention.
- Hint level 2 should narrow the grammar or reading clue.
- Hint level 3 may become explicit, but should still encourage the learner to verify before revealing.
- If the correct answer is not provided, infer hints from question structure only and do not claim certainty.
`.trim();

  const userPrompt = `
Create scaffolded hints for this practice item.

skillKey: ${input.skillKey}
hintDepthRequested: ${input.hintDepth}
learnerChoice: ${input.learnerChoice ?? "null"}

Question:
${JSON.stringify(
    {
      questionText: input.questionText,
      choices: input.choices,
      correctAnswer: input.correctAnswer ?? null,
      explanationSnapshot: input.explanationSnapshot ?? null,
    },
    null,
    2,
  )}

Return strict JSON in this shape:
${renderJsonContract({
    hintLevel1: "先不要看單字意思，先看空格前後要接哪一種詞性或句型。",
    hintLevel2: "句中有明確時間或搭配線索，先判斷這裡需要的是動詞形式還是介系詞搭配。",
    hintLevel3: "如果你仍不確定，先排除不符合句型的兩個選項，再比較剩下兩個在語境中的自然度。",
    doNotRevealAnswerYet: true,
  } satisfies GuidedHintOutput)}
`.trim();

  return { systemPrompt, userPrompt };
}

export function buildCheckpointFeedbackCoachPrompt(input: CheckpointFeedbackInput): PromptBundle {
  const systemPrompt = `
You are a TOEIC checkpoint coach for a closed-loop learning system.

Summarize checkpoint results and decide whether the learner should advance.
Return strict JSON only.
Do not use markdown fences.
Do not add commentary before or after the JSON.

Rules:
- All coaching text must be in Traditional Chinese.
- The recommendation must match the provided pass threshold.
- If the learner fails, the retry plan must be specific and skill-based.
- If the learner passes narrowly, use resultLabel "borderline".
`.trim();

  const userPrompt = `
Checkpoint module: ${input.moduleKey}
Pass threshold: ${input.passAccuracyPercent}
Actual accuracy percent: ${input.actualAccuracyPercent}

Skills to review:
${formatSkillSignals(input.skillsToReview)}

Representative mistakes:
${formatRepresentativeQuestions(input.mistakes)}

Return strict JSON in this shape:
${renderJsonContract({
    resultLabel: "retry",
    skillsToReview: ["grammar.verb-control", "reading.inference-and-process-logic"],
    retryPlan: [
      "先回看動詞控制 lesson，重做 8 題 hint-first drill。",
      "再用流程推論錯題做 1 次 guided review。",
    ],
    advanceAllowed: false,
    coachMessageZh: "這次 checkpoint 顯示你在核心技能上仍有不穩定區段，先補強再前進會更有效率。",
  } satisfies CheckpointFeedbackOutput)}
`.trim();

  return { systemPrompt, userPrompt };
}

export function buildWeeklyStudyPlanPrompt(input: WeeklyStudyPlanInput): PromptBundle {
  const systemPrompt = `
You are a weekly TOEIC study planner.

Create a compact weekly plan that connects review load, weak skills, and the next learning module.
Return strict JSON only.
Do not use markdown fences.
Do not add commentary before or after the JSON.

Rules:
- All plan text must be in Traditional Chinese.
- Prefer one concrete weekly target over a long to-do list.
- Respect due-review pressure before recommending heavy new learning.
- The plan should fit a self-study learner using short daily sessions.
`.trim();

  const userPrompt = `
Build a weekly study plan from the following learner state.

Current module:
${input.currentModuleKey ?? "null"}

Due review count:
${input.dueReviewCount}

Recent accuracy percent:
${input.recentAccuracyPercent ?? "null"}

Weak skill signals:
${formatSkillSignals(input.weakSkillSignals)}

Checkpoint readiness summary:
${input.checkpointReadinessSummary}

Next module candidates:
${JSON.stringify(input.nextModules, null, 2)}

Return strict JSON in this shape:
${renderJsonContract({
    recommendedModuleKey: "phase1-notices-and-decisions",
    reviewBlockZh: "本週先完成 3 天的到期複習，每次 10 至 15 分鐘。",
    drillBlockZh: "完成 2 次公告與推論 drill，每次 8 題，先用 hint-first 模式。",
    checkpointReadinessZh: "若本週後段兩次 drill 均達 80%，即可進入 checkpoint。",
    weeklyTargetZh: "把公告目的與流程推論的正確率穩定拉到 80% 以上。",
  } satisfies WeeklyStudyPlanOutput)}
`.trim();

  return { systemPrompt, userPrompt };
}
