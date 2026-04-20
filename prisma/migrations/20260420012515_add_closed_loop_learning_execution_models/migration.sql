-- CreateTable
CREATE TABLE "learning_topics" (
    "topicKey" TEXT NOT NULL PRIMARY KEY,
    "labelZh" TEXT,
    "labelEn" TEXT
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleKey" TEXT NOT NULL,
    "lessonIndex" INTEGER NOT NULL,
    "titleZh" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "lesson_practice_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lessonId" TEXT NOT NULL,
    "questionBankItemId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "lesson_practice_items_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lesson_practice_items_questionBankItemId_fkey" FOREIGN KEY ("questionBankItemId") REFERENCES "questions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_topic_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "topicKey" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'New',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_topic_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_topic_progress_topicKey_fkey" FOREIGN KEY ("topicKey") REFERENCES "learning_topics" ("topicKey") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "module_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "diagnosticAccuracy" REAL,
    "checkpointAccuracy" REAL,
    "lastStartedAt" DATETIME,
    "lastCompletedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "module_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "program_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "programKey" TEXT NOT NULL,
    "activeModuleKey" TEXT,
    "phaseStatus" TEXT,
    "lastRecommendedActionJson" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "program_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "learning_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "programKey" TEXT NOT NULL DEFAULT 'phase1',
    "moduleKey" TEXT,
    "lessonId" TEXT,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "studySessionId" INTEGER,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "abandonedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "learning_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "learning_sessions_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "learning_sessions_studySessionId_fkey" FOREIGN KEY ("studySessionId") REFERENCES "study_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "learning_session_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "learningSessionId" TEXT NOT NULL,
    "questionBankItemId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "learning_session_items_learningSessionId_fkey" FOREIGN KEY ("learningSessionId") REFERENCES "learning_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "learning_session_items_questionBankItemId_fkey" FOREIGN KEY ("questionBankItemId") REFERENCES "questions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "checkpoint_attempts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "learningSessionId" TEXT,
    "studySessionId" INTEGER,
    "accuracy" REAL,
    "passThreshold" REAL NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "summarySnapshot" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "checkpoint_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "checkpoint_attempts_learningSessionId_fkey" FOREIGN KEY ("learningSessionId") REFERENCES "learning_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "checkpoint_attempts_studySessionId_fkey" FOREIGN KEY ("studySessionId") REFERENCES "study_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "study_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "programKey" TEXT NOT NULL,
    "moduleKey" TEXT,
    "taskType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scheduledFor" DATETIME,
    "studySessionId" INTEGER,
    "learningSessionId" TEXT,
    "skillKeysJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "study_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "study_tasks_studySessionId_fkey" FOREIGN KEY ("studySessionId") REFERENCES "study_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "study_tasks_learningSessionId_fkey" FOREIGN KEY ("learningSessionId") REFERENCES "learning_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "lessons_moduleKey_idx" ON "lessons"("moduleKey");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_moduleKey_lessonIndex_key" ON "lessons"("moduleKey", "lessonIndex");

-- CreateIndex
CREATE INDEX "lesson_practice_items_questionBankItemId_idx" ON "lesson_practice_items"("questionBankItemId");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_practice_items_lessonId_questionBankItemId_key" ON "lesson_practice_items"("lessonId", "questionBankItemId");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_practice_items_lessonId_position_key" ON "lesson_practice_items"("lessonId", "position");

-- CreateIndex
CREATE INDEX "user_topic_progress_userId_idx" ON "user_topic_progress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_topic_progress_userId_topicKey_key" ON "user_topic_progress"("userId", "topicKey");

-- CreateIndex
CREATE INDEX "module_progress_moduleKey_idx" ON "module_progress"("moduleKey");

-- CreateIndex
CREATE UNIQUE INDEX "module_progress_userId_moduleKey_key" ON "module_progress"("userId", "moduleKey");

-- CreateIndex
CREATE INDEX "program_progress_programKey_idx" ON "program_progress"("programKey");

-- CreateIndex
CREATE UNIQUE INDEX "program_progress_userId_programKey_key" ON "program_progress"("userId", "programKey");

-- CreateIndex
CREATE UNIQUE INDEX "learning_sessions_studySessionId_key" ON "learning_sessions"("studySessionId");

-- CreateIndex
CREATE INDEX "learning_sessions_userId_idx" ON "learning_sessions"("userId");

-- CreateIndex
CREATE INDEX "learning_sessions_programKey_idx" ON "learning_sessions"("programKey");

-- CreateIndex
CREATE INDEX "learning_sessions_moduleKey_idx" ON "learning_sessions"("moduleKey");

-- CreateIndex
CREATE INDEX "learning_session_items_questionBankItemId_idx" ON "learning_session_items"("questionBankItemId");

-- CreateIndex
CREATE UNIQUE INDEX "learning_session_items_learningSessionId_position_key" ON "learning_session_items"("learningSessionId", "position");

-- CreateIndex
CREATE INDEX "checkpoint_attempts_userId_idx" ON "checkpoint_attempts"("userId");

-- CreateIndex
CREATE INDEX "checkpoint_attempts_moduleKey_idx" ON "checkpoint_attempts"("moduleKey");

-- CreateIndex
CREATE INDEX "study_tasks_userId_status_idx" ON "study_tasks"("userId", "status");

-- CreateIndex
CREATE INDEX "study_tasks_programKey_idx" ON "study_tasks"("programKey");
