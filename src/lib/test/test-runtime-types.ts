/** Persisted in `LearningSession.revisitMetaJson.checkpointRuntime` for timed checkpoint tests. */
export type CheckpointRuntimeMeta = {
  mode: "checkpoint" | "test";
  /** Target `QuestionBankItem.primaryLearningSkillCode` */
  skill?: string;
  topicKey: string;
  moduleKey?: string;
  /** Actual session length */
  count: number;
  /** Positions [0, skillRuleSlots) used for target-skill accuracy rule */
  skillRuleSlots: number;
  secondsPerQuestion: number;
};
