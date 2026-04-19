-- CreateTable
CREATE TABLE "study_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "answer_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "selectedAnswer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "answeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "answer_history_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "study_sessions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "answer_history_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "answer_history_sessionId_idx" ON "answer_history"("sessionId");

-- CreateIndex
CREATE INDEX "answer_history_questionId_idx" ON "answer_history"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "answer_history_sessionId_questionId_key" ON "answer_history"("sessionId", "questionId");
