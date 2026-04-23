import "server-only";

import { PHASE1_TOPIC_LABELS } from "@/content/programs/phase1/skill-map";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { validateLessonStructure } from "@/lib/content-qa-rules";
import { prisma } from "@/lib/prisma";
import type { SkillCoverageReport } from "@/lib/skill-coverage/audit-skill-coverage";
import { auditSkillCoverage } from "@/lib/skill-coverage/audit-skill-coverage";
import { buildStudyPlanDayStartLink } from "@/lib/studyplan/build-study-plan-day-links";
import { getStudyPlanRuntimeView, type StudyPlanDayRuntime } from "@/lib/studyplan/get-studyplan-runtime-view";
import { relatedTopicKeys, resolvePhase1TopicForPlanSkill } from "@/lib/studyplan/resolve-phase1-topic-for-plan-skill";
import {
  acceptanceCriteriaForMode,
  activitySkillCodes,
  planUiModeFromDay,
  weekNumber,
} from "@/lib/studyplan/studyplan-display-meta";

export type StudyPlanDayDetail =
  | { kind: "no_plan" }
  | { kind: "not_found"; dayNumber: number }
  | {
      kind: "ok";
      planId: string;
      planName: string;
      durationDays: number;
      currentDayNumber: number;
      day: StudyPlanDayRuntime;
      dayNumber: number;
      uiMode: ReturnType<typeof planUiModeFromDay>;
      week: number;
      resolvedTopicKey: Phase1TopicKey | null;
      topicLabel: string | null;
      routingWarnings: string[];
      startLink: ReturnType<typeof buildStudyPlanDayStartLink>;
      /** not_started | in_progress | done */
      progressStatus: "not_started" | "in_progress" | "done";
      acceptance: ReturnType<typeof acceptanceCriteriaForMode>;
      primarySkillPrereqCodes: string[];
      primarySkillUnlockCodes: string[];
      lessonTitlesSample: string[];
      lessonCount: number;
      lessonStructureIssues: { lessonIndex: number; titleZh: string; message: string }[];
      skillRowsForActivities: { skillCode: string; labelZh: string }[];
      primarySkillCoverage: SkillCoverageReport | null;
      activitySkillCoverages: { skillCode: string; report: SkillCoverageReport }[];
      strictPracticeFeasible: boolean;
      strictTestFeasible: boolean;
    };

function parseStringArrayJson(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((x): x is string => typeof x === "string");
  }
  return [];
}

export async function getStudyPlanDayDetail(dayNumber: number): Promise<StudyPlanDayDetail> {
  const plan = await getStudyPlanRuntimeView();
  if (!plan) return { kind: "no_plan" };

  const day = plan.days.find((d) => d.dayNumber === dayNumber);
  if (!day) return { kind: "not_found", dayNumber };

  const { topicKey: resolvedTopicKey, warnings: routeWarn } = resolvePhase1TopicForPlanSkill(day.primarySkillCode);
  const routingWarnings = [...routeWarn];
  const topicLabel = resolvedTopicKey ? PHASE1_TOPIC_LABELS[resolvedTopicKey] : null;

  const uiMode = planUiModeFromDay(day);
  const startLink = buildStudyPlanDayStartLink(day, resolvedTopicKey);

  let progressStatus: "not_started" | "in_progress" | "done" = "not_started";
  if (day.completed) progressStatus = "done";
  else if (day.dayNumber === plan.currentDayNumber) progressStatus = "in_progress";

  let primarySkillPrereqCodes: string[] = [];
  let primarySkillUnlockCodes: string[] = [];
  if (day.primarySkillCode) {
    const sk = await prisma.learningSkill.findUnique({
      where: { skillCode: day.primarySkillCode },
      select: { learnPrereqJson: true, learnUnlocksJson: true },
    });
    if (sk) {
      primarySkillPrereqCodes = parseStringArrayJson(sk.learnPrereqJson);
      primarySkillUnlockCodes = parseStringArrayJson(sk.learnUnlocksJson);
    } else {
      routingWarnings.push(`LearningSkill 資料庫找不到 skillCode「${day.primarySkillCode}」。`);
    }
  }

  let lessonTitlesSample: string[] = [];
  let lessonCount = 0;
  const lessonStructureIssues: { lessonIndex: number; titleZh: string; message: string }[] = [];

  if (resolvedTopicKey) {
    const lessons = await prisma.lesson.findMany({
      where: { topicKey: resolvedTopicKey },
      orderBy: { lessonIndex: "asc" },
      select: { lessonIndex: true, titleZh: true, bodyMarkdown: true },
    });
    lessonCount = lessons.length;
    lessonTitlesSample = lessons.slice(0, 5).map((l) => l.titleZh);
    for (const l of lessons) {
      const qa = validateLessonStructure(l.bodyMarkdown ?? "");
      if (!qa.passed) {
        lessonStructureIssues.push({
          lessonIndex: l.lessonIndex,
          titleZh: l.titleZh,
          message: qa.issues[0]?.message ?? "Lesson structure validation failed.",
        });
      }
    }
    if (lessonCount === 0) {
      routingWarnings.push(`主題「${resolvedTopicKey}」目前沒有任何 Lesson 資料列；教材可能尚未匯入。`);
    }
  }

  const actCodes = activitySkillCodes(day.activities);
  const skillRowsForActivities =
    actCodes.length === 0
      ? []
      : await prisma.learningSkill.findMany({
          where: { skillCode: { in: actCodes } },
          select: { skillCode: true, labelZh: true },
        });

  const missingActSkillRows = actCodes.filter((c) => !skillRowsForActivities.some((r) => r.skillCode === c));
  for (const c of missingActSkillRows) {
    routingWarnings.push(`活動中出现的 skillCode「${c}」在 LearningSkill 表中找不到對應列。`);
  }

  let primarySkillCoverage: SkillCoverageReport | null = null;
  if (day.primarySkillCode) {
    primarySkillCoverage = await auditSkillCoverage(day.primarySkillCode);
  }

  const activitySkillCoverages = await Promise.all(
    actCodes.slice(0, 8).map(async (code) => ({ skillCode: code, report: await auditSkillCoverage(code) })),
  );

  const strictPracticeFeasible = primarySkillCoverage?.usable_for_practice ?? false;
  const strictTestFeasible = primarySkillCoverage?.usable_for_test ?? false;

  return {
    kind: "ok",
    planId: plan.id,
    planName: plan.name,
    durationDays: plan.durationDays,
    currentDayNumber: plan.currentDayNumber,
    day,
    dayNumber,
    uiMode,
    week: weekNumber(dayNumber),
    resolvedTopicKey,
    topicLabel,
    routingWarnings,
    startLink,
    progressStatus,
    acceptance: acceptanceCriteriaForMode(uiMode),
    primarySkillPrereqCodes,
    primarySkillUnlockCodes,
    lessonTitlesSample,
    lessonCount,
    lessonStructureIssues,
    skillRowsForActivities,
    primarySkillCoverage,
    activitySkillCoverages,
    strictPracticeFeasible,
    strictTestFeasible,
  };
}

export function planRelatedTopicLabels(topicKey: Phase1TopicKey | null): { key: Phase1TopicKey; label: string }[] {
  return relatedTopicKeys(topicKey).map((key) => ({ key, label: PHASE1_TOPIC_LABELS[key] }));
}
