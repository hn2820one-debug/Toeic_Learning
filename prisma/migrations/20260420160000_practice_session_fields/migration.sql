-- practiceStateJson / user_topic practice+test fields were added in 20260420024600.
-- This migration only adds LearningSession.topicKey for practice routing + composite index.

ALTER TABLE "learning_sessions" ADD COLUMN "topicKey" TEXT;
CREATE INDEX "learning_sessions_userId_topicKey_status_idx" ON "learning_sessions"("userId", "topicKey", "status");
