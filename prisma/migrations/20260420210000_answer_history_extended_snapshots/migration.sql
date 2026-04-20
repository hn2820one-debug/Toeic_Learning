-- Immutable per-answer snapshots (options + explanation + taxonomy) for reproducible history/report after question edits.
-- stemSnapshot / choicesSnapshot / correctAnswer / topic / difficulty already exist from prior migrations.

ALTER TABLE "answer_history" ADD COLUMN "optionASnapshot" TEXT;
ALTER TABLE "answer_history" ADD COLUMN "optionBSnapshot" TEXT;
ALTER TABLE "answer_history" ADD COLUMN "optionCSnapshot" TEXT;
ALTER TABLE "answer_history" ADD COLUMN "optionDSnapshot" TEXT;
ALTER TABLE "answer_history" ADD COLUMN "explanationSnapshot" TEXT;
ALTER TABLE "answer_history" ADD COLUMN "skillKeySnapshot" TEXT;
ALTER TABLE "answer_history" ADD COLUMN "topicKeySnapshot" TEXT;
ALTER TABLE "answer_history" ADD COLUMN "moduleKeySnapshot" TEXT;
