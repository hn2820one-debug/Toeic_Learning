-- CreateTable
CREATE TABLE "study_session_question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "shownAt" DATETIME,
    "answeredAt" DATETIME,
    "rating" TEXT,
    "correct" BOOLEAN,
    "timeTakenSec" INTEGER,
    "userChoice" TEXT,
    CONSTRAINT "study_session_question_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "study_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "study_session_question_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_study_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "mode" TEXT NOT NULL DEFAULT 'quick',
    "targetCount" INTEGER NOT NULL DEFAULT 10,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_study_sessions" ("correctCount", "createdAt", "endedAt", "id", "startedAt", "totalQuestions", "updatedAt") SELECT "correctCount", "createdAt", "endedAt", "id", "startedAt", "totalQuestions", "updatedAt" FROM "study_sessions";
DROP TABLE "study_sessions";
ALTER TABLE "new_study_sessions" RENAME TO "study_sessions";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "study_session_question_sessionId_answeredAt_idx" ON "study_session_question"("sessionId", "answeredAt");

-- CreateIndex
CREATE UNIQUE INDEX "study_session_question_sessionId_position_key" ON "study_session_question"("sessionId", "position");
