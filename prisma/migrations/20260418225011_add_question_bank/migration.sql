-- CreateTable
CREATE TABLE "questions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "questionText" TEXT NOT NULL,
    "optionA" TEXT NOT NULL,
    "optionB" TEXT NOT NULL,
    "optionC" TEXT NOT NULL,
    "optionD" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT,
    "topic" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "questions_questionText_key" ON "questions"("questionText");

-- CreateIndex
CREATE INDEX "questions_topic_idx" ON "questions"("topic");

-- CreateIndex
CREATE INDEX "questions_difficulty_idx" ON "questions"("difficulty");
