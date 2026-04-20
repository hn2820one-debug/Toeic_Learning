/**
 * Admin batch: generate Phase 1 topic Markdown lessons and upsert `lessons` (topicKey + bodyMarkdown).
 *
 * Usage:
 *   npx tsx scripts/generate-lessons.ts --topic=office
 *   npx tsx scripts/generate-lessons.ts --all
 *   npx tsx scripts/generate-lessons.ts --all --force
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { PHASE1_TOPIC_KEYS_IN_ORDER } from "../src/content/programs/phase1/topic-order";
import type { Phase1TopicKey } from "../src/content/programs/phase1/types";
import { generateAndPersistTopicLesson } from "../src/lib/llm/lesson-generator";

function parseArgs(argv: string[]) {
  const out = {
    topic: undefined as Phase1TopicKey | undefined,
    all: false,
    force: false,
  };
  for (const a of argv) {
    if (a === "--all") {
      out.all = true;
    } else if (a === "--force") {
      out.force = true;
    } else if (a.startsWith("--topic=")) {
      const v = a.slice("--topic=".length).trim();
      if ((PHASE1_TOPIC_KEYS_IN_ORDER as readonly string[]).includes(v)) {
        out.topic = v as Phase1TopicKey;
      } else {
        console.error(`Unknown topic key: ${v}`);
        process.exit(1);
      }
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.all && !args.topic) {
    console.error("Specify --topic=<Phase1TopicKey> or --all");
    process.exit(1);
  }

  const topics: Phase1TopicKey[] = args.all ? [...PHASE1_TOPIC_KEYS_IN_ORDER] : [args.topic!];

  const summary = {
    ok: [] as string[],
    skipped: [] as string[],
    failed: [] as { topic: string; reason: string }[],
  };

  for (const topicKey of topics) {
    console.error(`\n--- ${topicKey} ---`);
    try {
      const r = await generateAndPersistTopicLesson({ topicKey, force: args.force });
      if (r.skipped) {
        summary.skipped.push(topicKey);
        console.error(`skipped (already has body): ${topicKey} lessonId=${r.lessonId}`);
        continue;
      }
      if (r.ok && r.lessonId) {
        summary.ok.push(topicKey);
        console.error(`ok: ${topicKey} lessonId=${r.lessonId}`);
        continue;
      }
      const reason =
        r.persistError ??
        r.structureErrors?.join("; ") ??
        r.gateway?.errorMessage ??
        "unknown";
      summary.failed.push({ topic: topicKey, reason });
      console.error(`failed: ${topicKey} — ${reason}`);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      summary.failed.push({ topic: topicKey, reason });
      console.error(`failed: ${topicKey} — ${reason}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        total: topics.length,
        ok: summary.ok,
        skipped: summary.skipped,
        failed: summary.failed,
      },
      null,
      2,
    ),
  );

  if (summary.failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
