-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_answer_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "selectedAnswer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "answeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stemSnapshot" TEXT NOT NULL DEFAULT '',
    "choicesSnapshot" TEXT NOT NULL DEFAULT '{}',
    "correctAnswerSnapshot" TEXT NOT NULL DEFAULT '',
    "topicSnapshot" TEXT NOT NULL DEFAULT '',
    "difficultySnapshot" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "answer_history_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "study_sessions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "answer_history_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_answer_history" ("answeredAt", "id", "isCorrect", "questionId", "selectedAnswer", "sessionId") SELECT "answeredAt", "id", "isCorrect", "questionId", "selectedAnswer", "sessionId" FROM "answer_history";
DROP TABLE "answer_history";
ALTER TABLE "new_answer_history" RENAME TO "answer_history";
CREATE INDEX "answer_history_sessionId_idx" ON "answer_history"("sessionId");
CREATE INDEX "answer_history_questionId_idx" ON "answer_history"("questionId");
CREATE UNIQUE INDEX "answer_history_sessionId_questionId_key" ON "answer_history"("sessionId", "questionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
