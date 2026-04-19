-- CreateTable
CREATE TABLE "fsrs_card_state" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" INTEGER NOT NULL,
    "due" DATETIME NOT NULL,
    "stability" REAL NOT NULL DEFAULT 0,
    "difficulty" REAL NOT NULL DEFAULT 0,
    "elapsedDays" REAL NOT NULL DEFAULT 0,
    "scheduledDays" REAL NOT NULL DEFAULT 0,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "state" TEXT NOT NULL DEFAULT 'New',
    "lastReview" DATETIME,
    "seededFrom" TEXT,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "fsrs_card_state_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "review_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" INTEGER NOT NULL,
    "rating" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "due" DATETIME NOT NULL,
    "stability" REAL NOT NULL,
    "difficulty" REAL NOT NULL,
    "elapsedDays" REAL NOT NULL,
    "lastElapsedDays" REAL NOT NULL,
    "scheduledDays" REAL NOT NULL,
    "review" DATETIME NOT NULL,
    CONSTRAINT "review_log_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fsrs_params" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "w" TEXT NOT NULL,
    "requestRetention" REAL NOT NULL DEFAULT 0.9,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "llm_usage_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskType" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "cachedTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheWriteTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" REAL NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "sessionId" TEXT,
    "questionId" TEXT,
    "temperature" REAL,
    "seed" INTEGER
);

-- CreateIndex
CREATE UNIQUE INDEX "fsrs_card_state_questionId_key" ON "fsrs_card_state"("questionId");

-- CreateIndex
CREATE INDEX "fsrs_card_state_state_due_idx" ON "fsrs_card_state"("state", "due");

-- CreateIndex
CREATE INDEX "fsrs_card_state_state_createdAt_idx" ON "fsrs_card_state"("state", "createdAt");

-- CreateIndex
CREATE INDEX "review_log_review_idx" ON "review_log"("review");

-- CreateIndex
CREATE INDEX "review_log_questionId_review_idx" ON "review_log"("questionId", "review");

-- CreateIndex
CREATE INDEX "llm_usage_log_createdAt_idx" ON "llm_usage_log"("createdAt");

-- CreateIndex
CREATE INDEX "llm_usage_log_taskType_createdAt_idx" ON "llm_usage_log"("taskType", "createdAt");
