/**
 * MVP multi-axis labels for UI + routing: domain (能力向度) is orthogonal to topic_key (場景).
 * DB still stores LearningSkill.skillCode (underscore) and QuestionBankItem.primaryLearningSkillCode.
 */

import { PHASE1_MODULES } from "@/content/programs/phase1/modules";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import type { ComposedLearningTask } from "@/lib/learning-path.types";
import { primaryModuleForTopic } from "@/lib/learning-path-rules";
import { PHASE1_TOPIC_LABELS } from "@/content/programs/phase1/skill-map";
export type ContentDomain = "grammar" | "vocabulary" | "reading" | "listening";

export const CONTENT_DOMAIN_LABEL_ZH: Record<ContentDomain, string> = {
  grammar: "文法",
  vocabulary: "字彙／片語",
  reading: "閱讀",
  listening: "聆聽",
};

export const CONTENT_DOMAIN_LABEL_EN: Record<ContentDomain, string> = {
  grammar: "Grammar",
  vocabulary: "Vocabulary / Phrases",
  reading: "Reading",
  listening: "Listening",
};

/** LearningSkill.category from Prisma seed. */
export function domainFromLearningSkillCategory(category: string | null | undefined): ContentDomain {
  const c = (category ?? "").toLowerCase();
  if (c === "grammar") return "grammar";
  if (c === "vocabulary" || c === "phrase") return "vocabulary";
  if (c === "strategy") return "reading";
  return "vocabulary";
}

/** Heuristic when category is unknown but skillCode exists. */
export function domainFromSkillCode(skillCode: string | null | undefined): ContentDomain {
  if (!skillCode?.trim()) return "reading";
  const s = skillCode.trim();
  if (s.startsWith("grammar_")) return "grammar";
  if (s.startsWith("vocab_")) return "vocabulary";
  if (s.startsWith("phrase_")) return "vocabulary";
  if (s.startsWith("strat_listen")) return "listening";
  if (s.startsWith("strat_")) return "reading";
  return "vocabulary";
}

/** Scene-only hint when no fine skill is in context. */
export function domainFromPhase1TopicKey(topicKey: Phase1TopicKey): ContentDomain {
  if (topicKey === "grammar_svc" || topicKey === "grammar_svoo") return "grammar";
  if (topicKey === "onboarding") return "reading";
  return "vocabulary";
}

/**
 * Canonical dotted key for display, e.g. grammar_svc → grammar.svc, vocab_medical → vocabulary.medical.
 */
export function canonicalSkillKeyFromLearningCode(skillCode: string | null | undefined): string | null {
  if (!skillCode?.trim()) return null;
  const code = skillCode.trim();
  const idx = code.indexOf("_");
  if (idx <= 0) return code;
  const prefix = code.slice(0, idx);
  const rest = code.slice(idx + 1).replace(/_/g, ".");
  const domainPart =
    prefix === "grammar"
      ? "grammar"
      : prefix === "vocab"
        ? "vocabulary"
        : prefix === "phrase"
          ? "phrase"
          : prefix === "strat"
            ? code.startsWith("strat_listen")
              ? "listening"
              : "reading"
            : prefix;
  return `${domainPart}.${rest}`;
}

export function moduleTitlesFromKey(moduleKey: string | null | undefined): { zh: string; en: string } | null {
  if (!moduleKey?.trim()) return null;
  const mod = PHASE1_MODULES.find((m) => m.moduleKey === moduleKey.trim());
  if (!mod) return { zh: moduleKey, en: moduleKey };
  return { zh: mod.titleZh, en: mod.titleEn };
}

export function topicLabelsFromKey(topicKey: string | null | undefined): { zh: string; en: string } | null {
  if (!topicKey?.trim()) return null;
  const tk = topicKey.trim() as Phase1TopicKey;
  const raw = PHASE1_TOPIC_LABELS[tk];
  if (!raw) return { zh: topicKey, en: topicKey };
  const parts = raw.split(" / ").map((s) => s.trim());
  return { zh: parts[0] ?? raw, en: parts[1] ?? parts[0] ?? raw };
}

export type LearningModeUi = "learn" | "practice" | "test" | "review";

export const LEARNING_MODE_LABEL_ZH: Record<LearningModeUi, string> = {
  learn: "新學",
  practice: "練習",
  test: "驗收",
  review: "複習",
};

export type ClassificationStripProps = {
  domain: ContentDomain;
  skillKeyDisplay: string | null;
  skillLabelZh: string | null;
  topicKey: string | null;
  topicLabelZh: string | null;
  moduleKey: string | null;
  moduleTitleZh: string | null;
  mode: LearningModeUi | null;
};

/** Use after `enrichComposedTasksWithSkills` so domain / labels match DB-backed enrichment. */
export function classificationStripFromComposedTask(task: ComposedLearningTask): ClassificationStripProps {
  const topicL = topicLabelsFromKey(task.topicKey ?? null);
  const mod = moduleTitlesFromKey(task.moduleKey ?? null);
  const domain = task.contentDomain ?? "reading";
  return {
    domain,
    skillKeyDisplay: task.skillKeyDisplay ?? canonicalSkillKeyFromLearningCode(task.primaryLearningSkillCode ?? null),
    skillLabelZh: task.primarySkillLabelZh ?? null,
    topicKey: task.topicKey ?? null,
    topicLabelZh: task.topicLabelZh ?? topicL?.zh ?? null,
    moduleKey: task.moduleKey ?? null,
    moduleTitleZh: task.moduleTitleZh ?? mod?.zh ?? null,
    mode: task.learningModeUi ?? null,
  };
}

export function buildClassificationStrip(input: {
  skillCode: string | null;
  skillCategory: string | null;
  skillLabelZh: string | null;
  topicKey: string | null;
  moduleKey: string | null;
  mode: LearningModeUi | null;
}): ClassificationStripProps {
  const domain = input.skillCategory
    ? domainFromLearningSkillCategory(input.skillCategory)
    : input.skillCode
      ? domainFromSkillCode(input.skillCode)
      : input.topicKey
        ? domainFromPhase1TopicKey(input.topicKey as Phase1TopicKey)
        : "reading";
  const topicL = topicLabelsFromKey(input.topicKey);
  const mod = moduleTitlesFromKey(input.moduleKey);
  return {
    domain,
    skillKeyDisplay: canonicalSkillKeyFromLearningCode(input.skillCode),
    skillLabelZh: input.skillLabelZh,
    topicKey: input.topicKey,
    topicLabelZh: topicL?.zh ?? null,
    moduleKey: input.moduleKey,
    moduleTitleZh: mod?.zh ?? null,
    mode: input.mode,
  };
}

type SkillRow = { skillCode: string; labelZh: string; category: string };

/**
 * Enrich composed tasks with display-only classification (sync).
 */
export function enrichComposedTasksWithSkills(
  tasks: ComposedLearningTask[],
  skillByCode: ReadonlyMap<string, SkillRow>,
): ComposedLearningTask[] {
  return tasks.map((t) => {
    const sk = t.primaryLearningSkillCode ? skillByCode.get(t.primaryLearningSkillCode) : undefined;
    const topicKey = (t.topicKey as Phase1TopicKey | undefined) ?? undefined;
    const modKey =
      t.moduleKey ??
      (topicKey ? primaryModuleForTopic(topicKey).moduleKey : undefined) ??
      undefined;
    const domain = sk
      ? domainFromLearningSkillCategory(sk.category)
      : t.primaryLearningSkillCode
        ? domainFromSkillCode(t.primaryLearningSkillCode)
        : topicKey
          ? domainFromPhase1TopicKey(topicKey)
          : "reading";
    const topicL = topicLabelsFromKey(t.topicKey ?? null);
    const mod = moduleTitlesFromKey(modKey ?? null);
    const mode: LearningModeUi | null =
      t.type === "checkpoint" ? "test" : t.type === "review" ? "review" : (t.type as LearningModeUi);

    return {
      ...t,
      moduleKey: t.moduleKey ?? modKey,
      contentDomain: domain,
      contentDomainLabelZh: CONTENT_DOMAIN_LABEL_ZH[domain],
      skillKeyDisplay: canonicalSkillKeyFromLearningCode(t.primaryLearningSkillCode ?? null),
      primarySkillLabelZh: sk?.labelZh ?? null,
      moduleTitleZh: mod?.zh ?? null,
      moduleTitleEn: mod?.en ?? null,
      topicLabelZh: topicL?.zh ?? null,
      topicLabelEn: topicL?.en ?? null,
      learningModeUi: mode,
    };
  });
}
