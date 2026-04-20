-- learnProgressJson / learnCompletedAt / practice+test counters were introduced in 20260420024600.
-- This migration only adjusts lesson indexes for multi-row topic capsules.

-- Drop unique on lessons.topicKey so multiple lesson rows can share one topicKey
DROP INDEX IF EXISTS "lessons_topicKey_key";

-- Composite index for topic-scoped lesson queries
CREATE INDEX IF NOT EXISTS "lessons_topicKey_lessonIndex_idx" ON "lessons"("topicKey", "lessonIndex");
