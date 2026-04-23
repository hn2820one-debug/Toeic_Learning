import "server-only";

import { prisma } from "@/lib/prisma";

const PRACTICE_MIN = 10;
const TEST_MIN = 15;

export type DifficultyDistribution = {
  easy: number;
  medium: number;
  hard: number;
  unknown: number;
};

export type SkillCoverageReport = {
  skill_key: string;
  total_questions: number;
  difficulty_distribution: DifficultyDistribution;
  with_topic_key: number;
  with_module_key: number;
  usable_for_practice: boolean;
  usable_for_test: boolean;
  missing_fields: string[];
};

function bucketDifficulty(d: string): keyof Omit<DifficultyDistribution, never> {
  const x = d.trim().toUpperCase();
  if (x === "A") return "easy";
  if (x === "B") return "medium";
  if (x === "C" || x === "D") return "hard";
  return "unknown";
}

/**
 * Aggregates bank coverage for one `LearningSkill.skillCode` (same as `primaryLearningSkillCode` on items).
 */
export async function auditSkillCoverage(skillCode: string): Promise<SkillCoverageReport> {
  const skill_key = skillCode.trim();
  const missing_fields: string[] = [];

  if (!skill_key) {
    return {
      skill_key: "",
      total_questions: 0,
      difficulty_distribution: { easy: 0, medium: 0, hard: 0, unknown: 0 },
      with_topic_key: 0,
      with_module_key: 0,
      usable_for_practice: false,
      usable_for_test: false,
      missing_fields: ["empty_skill_key"],
    };
  }

  const skillRow = await prisma.learningSkill.findUnique({
    where: { skillCode: skill_key },
    select: { skillCode: true },
  });
  if (!skillRow) {
    missing_fields.push("skill_not_in_learning_skills_table");
  }

  const total_questions = await prisma.questionBankItem.count({
    where: { primaryLearningSkillCode: skill_key },
  });

  const groups = await prisma.questionBankItem.groupBy({
    by: ["difficulty"],
    where: { primaryLearningSkillCode: skill_key },
    _count: { _all: true },
  });

  const difficulty_distribution: DifficultyDistribution = {
    easy: 0,
    medium: 0,
    hard: 0,
    unknown: 0,
  };
  for (const g of groups) {
    const bucket = bucketDifficulty(g.difficulty);
    difficulty_distribution[bucket] += g._count._all;
  }

  const with_topic_key = await prisma.questionBankItem.count({
    where: { primaryLearningSkillCode: skill_key, NOT: { topicKey: null } },
  });
  const with_module_key = await prisma.questionBankItem.count({
    where: { primaryLearningSkillCode: skill_key, NOT: { moduleKey: null } },
  });

  if (total_questions === 0) {
    missing_fields.push("no_questions_for_this_skill");
  }
  if (with_topic_key < total_questions) {
    missing_fields.push("some_questions_missing_topicKey");
  }
  if (with_module_key < total_questions) {
    missing_fields.push("some_questions_missing_moduleKey");
  }

  return {
    skill_key,
    total_questions,
    difficulty_distribution,
    with_topic_key,
    with_module_key,
    usable_for_practice: total_questions >= PRACTICE_MIN,
    usable_for_test: total_questions >= TEST_MIN,
    missing_fields,
  };
}

export function formatSkillCoverageReportXml(r: SkillCoverageReport): string {
  const d = r.difficulty_distribution;
  return `<skill_coverage_report>
  <skill_key>${escapeXml(r.skill_key)}</skill_key>
  <total_questions>${r.total_questions}</total_questions>
  <difficulty_distribution easy="${d.easy}" medium="${d.medium}" hard="${d.hard}" unknown="${d.unknown}" />
  <usable_for_practice>${r.usable_for_practice}</usable_for_practice>
  <usable_for_test>${r.usable_for_test}</usable_for_test>
  <missing_fields>${r.missing_fields.map((m) => `<field>${escapeXml(m)}</field>`).join("")}</missing_fields>
</skill_coverage_report>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
