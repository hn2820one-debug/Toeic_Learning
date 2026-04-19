-- CreateTable
CREATE TABLE "listening_set_v2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "part" INTEGER NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "topic" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "listening_question_v2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "setId" TEXT NOT NULL,
    "stem" TEXT NOT NULL,
    "choices" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "timestampStart" INTEGER,
    CONSTRAINT "listening_question_v2_setId_fkey" FOREIGN KEY ("setId") REFERENCES "listening_set_v2" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "listening_question_v2_setId_idx" ON "listening_question_v2"("setId");
