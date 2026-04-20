/*
  Warnings:

  - You are about to alter the column `practiceStateJson` on the `learning_session_items` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `learnProgressJson` on the `user_topic_progress` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_learning_session_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "learningSessionId" TEXT NOT NULL,
    "questionBankItemId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "practiceStateJson" JSONB,
    "testStateJson" JSONB,
    CONSTRAINT "learning_session_items_learningSessionId_fkey" FOREIGN KEY ("learningSessionId") REFERENCES "learning_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "learning_session_items_questionBankItemId_fkey" FOREIGN KEY ("questionBankItemId") REFERENCES "questions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_learning_session_items" ("id", "learningSessionId", "position", "practiceStateJson", "questionBankItemId") SELECT "id", "learningSessionId", "position", "practiceStateJson", "questionBankItemId" FROM "learning_session_items";
DROP TABLE "learning_session_items";
ALTER TABLE "new_learning_session_items" RENAME TO "learning_session_items";
CREATE INDEX "learning_session_items_questionBankItemId_idx" ON "learning_session_items"("questionBankItemId");
CREATE UNIQUE INDEX "learning_session_items_learningSessionId_position_key" ON "learning_session_items"("learningSessionId", "position");
CREATE TABLE "new_user_topic_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "topicKey" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'New',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "learnProgressJson" JSONB,
    "learnCompletedAt" DATETIME,
    "practicePassedAt" DATETIME,
    "practiceAccuracy" REAL,
    "practicePassCount" INTEGER NOT NULL DEFAULT 0,
    "testPassedAt" DATETIME,
    "testAccuracy" REAL,
    "testAttempts" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_topic_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_topic_progress_topicKey_fkey" FOREIGN KEY ("topicKey") REFERENCES "learning_topics" ("topicKey") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_user_topic_progress" ("attempts", "correct", "id", "learnCompletedAt", "learnProgressJson", "practiceAccuracy", "practicePassCount", "practicePassedAt", "stage", "topicKey", "updatedAt", "userId") SELECT "attempts", "correct", "id", "learnCompletedAt", "learnProgressJson", "practiceAccuracy", "practicePassCount", "practicePassedAt", "stage", "topicKey", "updatedAt", "userId" FROM "user_topic_progress";
DROP TABLE "user_topic_progress";
ALTER TABLE "new_user_topic_progress" RENAME TO "user_topic_progress";
CREATE INDEX "user_topic_progress_userId_idx" ON "user_topic_progress"("userId");
CREATE UNIQUE INDEX "user_topic_progress_userId_topicKey_key" ON "user_topic_progress"("userId", "topicKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
