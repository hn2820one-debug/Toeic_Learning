-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_learning_topics" (
    "topicKey" TEXT NOT NULL PRIMARY KEY,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "labelZh" TEXT,
    "labelEn" TEXT
);
INSERT INTO "new_learning_topics" ("labelEn", "labelZh", "topicKey") SELECT "labelEn", "labelZh", "topicKey" FROM "learning_topics";
DROP TABLE "learning_topics";
ALTER TABLE "new_learning_topics" RENAME TO "learning_topics";
CREATE INDEX "learning_topics_orderIndex_idx" ON "learning_topics"("orderIndex");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
