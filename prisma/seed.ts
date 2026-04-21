import "dotenv/config";

import { PrismaLibSql } from "@prisma/adapter-libsql";

import { PrismaClient } from "../generated/prisma";
import { PERSONALIZED_PHASE1_BANK } from "./seed-data/personalized-phase1-bank";
import { LEARNING_SKILLS_SEED } from "./seed-data/learning-skills";
import { THIRTY_DAY_BANK_SEED } from "./seed-data/thirty-day-bank";
import { PLANNED_SKILL_CODES, THIRTY_DAY_PLAN_TEMPLATE } from "./seed-data/thirty-day-plan";
import {
  DEFAULT_KEY_PHRASES,
  DEFAULT_TRANSCRIPT_PLACEHOLDER,
  defaultDictationLines,
  defaultRound1Questions,
  defaultRound2Questions,
  defaultShadowingLines,
} from "../src/lib/listening/default-workbook-content";
import { getOrCreateDevUser } from "../src/lib/dev-user";
import { buildQuestionBankCreateData, buildQuestionBankUpdateData } from "../src/lib/question-management";
import { formatQuestionValidationMessage, validateAndNormalizeQuestionInput } from "../src/lib/question-fields";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaLibSql({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const normalizedRows = PERSONALIZED_PHASE1_BANK.map((question, index) => {
    const validation = validateAndNormalizeQuestionInput({
      questionText: question.questionText,
      optionA: question.optionA,
      optionB: question.optionB,
      optionC: question.optionC,
      optionD: question.optionD,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      topic: question.topic,
      difficulty: question.difficulty,
      priorKnown: question.priorKnown,
    });

    if (!validation.ok) {
      throw new Error(formatQuestionValidationMessage(validation.issue, { rowNumber: index + 1 }));
    }

    return { validated: validation.data, notes: question.notes };
  });

  for (const row of normalizedRows) {
    const createPayload = buildQuestionBankCreateData(row.validated, {
      sourceKind: "seed",
      extra: { notes: row.notes },
    });
    await prisma.questionBankItem.upsert({
      where: { questionText: row.validated.questionText },
      update: {
        ...buildQuestionBankUpdateData(row.validated, {
          sourceKind: "seed",
          extra: { notes: row.notes },
        }),
        notes: row.notes,
        sourceQuality: "seed",
      },
      create: {
        ...createPayload,
        notes: row.notes,
      },
    });
  }

  console.log(`Seeded ${normalizedRows.length} personalized Phase 1 question records.`);

  const devUser = await getOrCreateDevUser();
  console.log("Ensured dev user, profile, and phase1 enrollment (see src/lib/dev-user.ts).");

  // ─────────────────────────────────────────────
  //  LearningSkill — 58 fine-grained skill rows for the 30-day plan
  // ─────────────────────────────────────────────
  for (const skill of LEARNING_SKILLS_SEED) {
    await prisma.learningSkill.upsert({
      where: { skillCode: skill.skillCode },
      create: {
        skillCode: skill.skillCode,
        category: skill.category,
        subCategory: skill.subCategory,
        labelZh: skill.labelZh,
        labelEn: skill.labelEn,
        priority: skill.priority,
        difficultyBand: skill.difficultyBand,
        toeicScoreBand: skill.toeicScoreBand,
        part5Frequency: skill.part5Frequency,
        part6Frequency: skill.part6Frequency,
        part7Frequency: skill.part7Frequency,
        parentSkillKey: skill.parentSkillKey,
        recommendedWeek: skill.recommendedWeek,
        within30DayPlan: skill.within30DayPlan,
        learnPrereqJson: skill.learnPrereqJson ?? undefined,
        learnUnlocksJson: skill.learnUnlocksJson ?? undefined,
        orderIndex: skill.orderIndex,
      },
      update: {
        category: skill.category,
        subCategory: skill.subCategory,
        labelZh: skill.labelZh,
        labelEn: skill.labelEn,
        priority: skill.priority,
        difficultyBand: skill.difficultyBand,
        toeicScoreBand: skill.toeicScoreBand,
        part5Frequency: skill.part5Frequency,
        part6Frequency: skill.part6Frequency,
        part7Frequency: skill.part7Frequency,
        parentSkillKey: skill.parentSkillKey,
        recommendedWeek: skill.recommendedWeek,
        within30DayPlan: skill.within30DayPlan,
        learnPrereqJson: skill.learnPrereqJson ?? undefined,
        learnUnlocksJson: skill.learnUnlocksJson ?? undefined,
        orderIndex: skill.orderIndex,
      },
    });
  }
  console.log(`Seeded ${LEARNING_SKILLS_SEED.length} LearningSkill rows (grammar/vocab/phrase/strategy).`);

  // ─────────────────────────────────────────────
  //  30-Day bank seed — 24 hand-authored Priority 1 items exercising the Reconciled v2 schema fields.
  // ─────────────────────────────────────────────
  for (const item of THIRTY_DAY_BANK_SEED) {
    await prisma.questionBankItem.upsert({
      where: { questionText: item.questionText },
      create: {
        questionText: item.questionText,
        optionA: item.optionA,
        optionB: item.optionB,
        optionC: item.optionC,
        optionD: item.optionD,
        correctAnswer: item.correctAnswer,
        explanation: item.explanation,
        topic: item.topic,
        topicKey: item.topicKey ?? null,
        skillKey: item.skillKey ?? null,
        difficulty: item.difficulty,
        part: item.part,
        primaryLearningSkillCode: item.primaryLearningSkillCode,
        coreRule: item.coreRule,
        recognitionSignal: item.recognitionSignal,
        hint1: item.hint1,
        hint2: item.hint2,
        hint3: item.hint3,
        distractorAnalysisJson: item.distractorAnalysis,
        industryFocus: item.industryFocus ?? null,
        registerLevel: item.registerLevel ?? null,
        sourceQuality: item.sourceQuality,
      },
      update: {
        optionA: item.optionA,
        optionB: item.optionB,
        optionC: item.optionC,
        optionD: item.optionD,
        correctAnswer: item.correctAnswer,
        explanation: item.explanation,
        topic: item.topic,
        topicKey: item.topicKey ?? null,
        skillKey: item.skillKey ?? null,
        difficulty: item.difficulty,
        part: item.part,
        primaryLearningSkillCode: item.primaryLearningSkillCode,
        coreRule: item.coreRule,
        recognitionSignal: item.recognitionSignal,
        hint1: item.hint1,
        hint2: item.hint2,
        hint3: item.hint3,
        distractorAnalysisJson: item.distractorAnalysis,
        industryFocus: item.industryFocus ?? null,
        registerLevel: item.registerLevel ?? null,
        sourceQuality: item.sourceQuality,
      },
    });
  }
  console.log(`Seeded ${THIRTY_DAY_BANK_SEED.length} 30-Day bank items with full Reconciled v2 metadata.`);

  // ─────────────────────────────────────────────
  //  StudyPlan + DailyPlanItem — 30-day closed-loop plan for the dev user
  //  Idempotent: reuses the existing active plan if one already exists.
  // ─────────────────────────────────────────────
  if (devUser) {
    const existingPlan = await prisma.studyPlan.findFirst({
      where: { userId: devUser.id, status: "active" },
    });

    const plan = existingPlan
      ? await prisma.studyPlan.update({
          where: { id: existingPlan.id },
          data: {
            name: "30-Day Closed-Loop Plan (Reconciled v2)",
            durationDays: 30,
            targetScore: 610,
            baselineScore: 570,
            plannedSkillsJson: [...PLANNED_SKILL_CODES],
          },
        })
      : await prisma.studyPlan.create({
          data: {
            userId: devUser.id,
            name: "30-Day Closed-Loop Plan (Reconciled v2)",
            durationDays: 30,
            targetScore: 610,
            baselineScore: 570,
            plannedSkillsJson: [...PLANNED_SKILL_CODES],
            status: "active",
          },
        });

    for (const day of THIRTY_DAY_PLAN_TEMPLATE) {
      const activitiesJson = day.activities.map((activity) => ({
        type: activity.type,
        skillCode: activity.skillCode ?? null,
        minutes: activity.minutes,
        notes: activity.notes ?? null,
      }));
      await prisma.dailyPlanItem.upsert({
        where: {
          studyPlanId_dayNumber: { studyPlanId: plan.id, dayNumber: day.dayNumber },
        },
        create: {
          studyPlanId: plan.id,
          dayNumber: day.dayNumber,
          dayType: day.dayType,
          primarySkillCode: day.primarySkillCode,
          activitiesJson,
          notes: day.headlineZh,
        },
        update: {
          dayType: day.dayType,
          primarySkillCode: day.primarySkillCode,
          activitiesJson,
          notes: day.headlineZh,
        },
      });
    }
    console.log(`Ensured StudyPlan (${plan.id}) + ${THIRTY_DAY_PLAN_TEMPLATE.length} DailyPlanItem rows for dev user.`);
  } else {
    console.warn("Dev user not available — skipping StudyPlan seed.");
  }

  const demoTitle = "【示範】Listening 練習本 · External video";
  const demo = await prisma.listeningWorkbook.findFirst({ where: { title: demoTitle } });
  if (!demo) {
    await prisma.listeningWorkbook.create({
      data: {
        title: demoTitle,
        sourceLabel: "YouTube · 示範連結（請自行替換真實影片）",
        sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        startSec: 0,
        endSec: 120,
        transcript: DEFAULT_TRANSCRIPT_PLACEHOLDER,
        keyPhrasesJson: DEFAULT_KEY_PHRASES,
        questionsRound1Json: defaultRound1Questions(),
        questionsRound2Json: defaultRound2Questions(),
        dictationLinesJson: defaultDictationLines(),
        shadowingLinesJson: defaultShadowingLines(),
        takeawayHintZh: "用一句話寫：你學到最有用的一點是什麼？",
        tomorrowReviewHintZh: "明天回顧時，最想先複習哪 1–2 個點？",
      },
    });
    console.log("Seeded demo listening workbook.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
