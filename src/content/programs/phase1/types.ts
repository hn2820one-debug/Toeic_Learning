import type { QuestionDifficulty } from "@/lib/question-fields";
import type { QuestionCategory } from "@/lib/question-taxonomy";

export type Phase1ProgramKey = "phase1";

export type Phase1SessionMode =
  | "diagnostic"
  | "lesson_drill"
  | "checkpoint"
  | "review"
  | "mixed_practice";

export type Phase1TopicKey =
  | "onboarding"
  | "grammar_svc"
  | "grammar_svoo"
  | "office"
  | "notices"
  | "meetings"
  | "coordination"
  | "hr"
  | "finance"
  | "operations"
  | "marketing"
  | "logistics"
  | "tech"
  | "communication"
  | "healthEnv"
  | "daily";

export type Phase1SkillKey =
  | "vocabulary.document-workflow"
  | "vocabulary.formal-register"
  | "vocabulary.domain-and-abstract-meaning"
  | "grammar.verb-control"
  | "grammar.pattern-control"
  | "grammar.sentence-linking"
  | "reading.detail-retrieval"
  | "reading.purpose-and-intent"
  | "reading.inference-and-process-logic"
  | "reading.contextual-meaning";

export type Phase1ModuleKey =
  | "phase1-document-workflow"
  | "phase1-core-grammar-control"
  | "phase1-notices-and-decisions"
  | "phase1-business-process-reading"
  | "phase1-cross-topic-checkpoint";

export type SkillMatcher = {
  category: QuestionCategory;
  topicKeys: Phase1TopicKey[];
  subFocusLabels: string[];
  preferredDifficulties: QuestionDifficulty[];
};

export type LearningObjective = {
  zh: string;
  en: string;
};

export type ModuleEntryCriteria = {
  recommendedWhenWeakSkillsAnyOf: Phase1SkillKey[];
  suggestedIfDiagnosticAccuracyBelow: number;
  suggestedIfCheckpointAccuracyBelow?: number;
};

export type CheckpointRule = {
  passAccuracyPercent: number;
  questionCount: number;
  allowHintBeforeSubmit: boolean;
  remediationModuleOnFail?: Phase1ModuleKey;
};

export type SessionBlueprint = {
  mode: Phase1SessionMode;
  questionCount: number;
  skills: Phase1SkillKey[];
  recommendedDifficultyMix: Partial<Record<QuestionDifficulty, number>>;
  allowHints: boolean;
  note: string;
};

export type Phase1SkillDefinition = {
  skillKey: Phase1SkillKey;
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  summaryEn: string;
  matcher: SkillMatcher;
  instructionalGoal: string;
  currentDataRisk: string[];
};

export type Phase1ModuleDefinition = {
  moduleKey: Phase1ModuleKey;
  phaseKey: Phase1ProgramKey;
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  summaryEn: string;
  targetSkills: Phase1SkillKey[];
  entryCriteria: ModuleEntryCriteria;
  lessonObjectives: LearningObjective[];
  lessonOutline: LearningObjective[];
  drillBlueprint: SessionBlueprint;
  checkpointBlueprint: SessionBlueprint;
  checkpointRule: CheckpointRule;
  recommendedDrillCount: number;
  recommendedReviewWindowDays: number;
  listeningReady: boolean;
};

export type Phase1ProgramDefinition = {
  programKey: Phase1ProgramKey;
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  summaryEn: string;
  topics: Record<Phase1TopicKey, string>;
  skills: Phase1SkillDefinition[];
  modules: Phase1ModuleDefinition[];
  mvpModuleKeys: Phase1ModuleKey[];
};
