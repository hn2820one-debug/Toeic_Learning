-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL DEFAULT 'Keith',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "learning_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "itemType" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "meaning" TEXT,
    "confusionWord" TEXT,
    "confusionMeaning" TEXT,
    "exampleEn" TEXT,
    "exampleZh" TEXT,
    "topic" TEXT,
    "level" TEXT,
    "source" TEXT,
    "originalResult" TEXT,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "masteryScore" REAL NOT NULL DEFAULT 0.0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "consecutiveOk" INTEGER NOT NULL DEFAULT 0,
    "nextReview" DATETIME,
    "intervalDays" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "question_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "learningItemId" INTEGER,
    "questionType" TEXT NOT NULL,
    "promptText" TEXT NOT NULL,
    "optionA" TEXT,
    "optionB" TEXT,
    "optionC" TEXT,
    "optionD" TEXT,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT,
    "topic" TEXT,
    "level" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "question_items_learningItemId_fkey" FOREIGN KEY ("learningItemId") REFERENCES "learning_items" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

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

-- CreateTable
CREATE TABLE "listening_sets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "part" INTEGER NOT NULL,
    "transcript" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "listening_questions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "setId" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "optionA" TEXT NOT NULL,
    "optionB" TEXT NOT NULL,
    "optionC" TEXT NOT NULL,
    "optionD" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT,
    "orderNo" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "listening_questions_setId_fkey" FOREIGN KEY ("setId") REFERENCES "listening_sets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "daily_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionDate" DATETIME NOT NULL,
    "dayType" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "durationMin" INTEGER NOT NULL DEFAULT 45,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "session_answers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" INTEGER NOT NULL,
    "questionItemId" INTEGER NOT NULL,
    "userAnswer" TEXT,
    "isCorrect" BOOLEAN NOT NULL,
    "errorType" TEXT,
    "timeSpentSec" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "session_answers_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "daily_sessions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "session_answers_questionItemId_fkey" FOREIGN KEY ("questionItemId") REFERENCES "question_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "review_queue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "learningItemId" INTEGER NOT NULL,
    "questionItemId" INTEGER,
    "nextReviewDate" DATETIME NOT NULL,
    "intervalDays" INTEGER NOT NULL DEFAULT 1,
    "easeFactor" REAL NOT NULL DEFAULT 2.5,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "lastResult" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "review_queue_learningItemId_fkey" FOREIGN KEY ("learningItemId") REFERENCES "learning_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "review_queue_questionItemId_fkey" FOREIGN KEY ("questionItemId") REFERENCES "question_items" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "topic_weights" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "topic" TEXT NOT NULL,
    "baseWeight" REAL NOT NULL DEFAULT 1.0,
    "currentWeight" REAL NOT NULL DEFAULT 1.0,
    "updatedAt" DATETIME NOT NULL,
    "reason" TEXT
);

-- CreateTable
CREATE TABLE "weekly_reports" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "weekNo" INTEGER NOT NULL,
    "weekStart" DATETIME NOT NULL,
    "weekEnd" DATETIME NOT NULL,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "totalAccuracy" REAL,
    "readingAccuracy" REAL,
    "listeningAccuracy" REAL,
    "weakestTopics" TEXT,
    "weakestErrorTypes" TEXT,
    "nextWeekFocus" TEXT,
    "programPhase" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "score_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "testType" TEXT NOT NULL DEFAULT 'mock',
    "listening" INTEGER NOT NULL,
    "reading" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "questions_questionText_key" ON "questions"("questionText");

-- CreateIndex
CREATE INDEX "questions_topic_idx" ON "questions"("topic");

-- CreateIndex
CREATE INDEX "questions_difficulty_idx" ON "questions"("difficulty");

-- CreateIndex
CREATE INDEX "answer_history_sessionId_idx" ON "answer_history"("sessionId");

-- CreateIndex
CREATE INDEX "answer_history_questionId_idx" ON "answer_history"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "answer_history_sessionId_questionId_key" ON "answer_history"("sessionId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "topic_weights_topic_key" ON "topic_weights"("topic");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_reports_weekNo_key" ON "weekly_reports"("weekNo");

