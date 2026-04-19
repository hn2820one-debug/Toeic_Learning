-- CreateTable
CREATE TABLE "elo_state" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "rating" REAL NOT NULL DEFAULT 1500,
    "n" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "topic_mastery" (
    "topic" TEXT NOT NULL PRIMARY KEY,
    "flag" TEXT NOT NULL DEFAULT 'Mixed',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "elo_state_kind_idx" ON "elo_state"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "elo_state_kind_subjectId_key" ON "elo_state"("kind", "subjectId");
