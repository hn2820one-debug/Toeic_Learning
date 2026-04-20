-- AlterTable
ALTER TABLE "lessons" ADD COLUMN "topicKey" TEXT;
ALTER TABLE "lessons" ADD COLUMN "bodyMarkdown" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "lessons_topicKey_key" ON "lessons"("topicKey");

-- CreateIndex
CREATE INDEX "lessons_topicKey_idx" ON "lessons"("topicKey");
