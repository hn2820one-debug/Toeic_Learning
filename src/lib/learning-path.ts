/**
 * Learning Path Engine — single source for ranked queues and per-topic CTAs.
 * Re-exports types + rules; use `getRankedLearningTasks` / `getTopicProgressActions` everywhere.
 */
export type {
  ComposedLearningTask,
  FsrsQueueSnapshot,
  LearningTask,
  LearningTaskSource,
  LearningTaskType,
  RankLearningTasksInput,
} from "./learning-path.types";

export {
  getRankedLearningTasks,
  getTopicProgressActions,
  learningTaskBadgeKey,
  mergeTopicOrderWithDb,
  primaryModuleForTopic,
  sumEstimatedMinutes,
} from "./learning-path-rules";

export type { TopicProgressLabels } from "./learning-path-rules";

export { buildComposedLearningTasks, composedTaskBadgeKey } from "./today-task-composer";
export type { BuildComposedTasksInput } from "./today-task-composer";

/** @deprecated Prefer `getRankedLearningTasks` — alias kept for tests and gradual migration. */
export { getRankedLearningTasks as rankLearningTasks } from "./learning-path-rules";
