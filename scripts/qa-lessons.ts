import dotenv from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { runLessonQaScan } from "../src/lib/content-qa";

async function main() {
  const report = await runLessonQaScan();
  const sampleIssues = report.rows
    .filter((r) => !r.qa.passed)
    .slice(0, 10)
    .map((r) => ({
      lessonId: r.lessonId,
      topicKey: r.topicKey,
      moduleKey: r.moduleKey,
      lessonIndex: r.lessonIndex,
      score: r.qa.score,
      status: r.qa.status,
      issues: r.qa.issues,
    }));

  const artifact = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalScanned: report.totalScanned,
      passed: report.passed,
      failed: report.failed,
      warnings: report.warnings,
    },
    sampleIssues,
  };

  const outDir = path.resolve(process.cwd(), "artifacts");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "lesson-qa-report.json");
  await writeFile(outPath, JSON.stringify(artifact, null, 2), "utf-8");

  console.log(JSON.stringify(artifact, null, 2));
  console.error(`lesson QA artifact written: ${outPath}`);
  if (report.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
