/**
 * One-off taxonomy backfill for QuestionBankItem (offline; not a request path).
 *
 * Usage:
 *   npm run taxonomy:backfill
 *   npm run taxonomy:backfill -- --write
 *
 * See docs/backfill-taxonomy-report-template.md
 */
import fs from "node:fs";
import path from "node:path";

import type { Phase1SkillKey } from "@/content/programs/phase1/types";

import { prisma } from "../src/lib/prisma";
import {
  inferModuleKeyFromSkill,
  inferSkillKeyFromParsedNotes,
  inferSourceQuality,
  inferTopicKeyFromTopicColumn,
  parseNotesForClassification,
} from "./taxonomy/backfill-mappings";

const ARTIFACTS_DIR = path.join(process.cwd(), "artifacts");

type FieldPatch = {
  skillKey?: string | null;
  topicKey?: string | null;
  moduleKey?: string | null;
  sourceQuality?: string | null;
};

type UnresolvedRow = {
  questionId: number;
  questionTextPreview: string;
  currentTopic: string;
  notes: string | null;
  grammarPointsPreview: string | null;
  sourceQualityBefore: string | null;
  whyUnresolved: string;
};

type MediumRow = {
  questionId: number;
  questionTextPreview: string;
  appliedPatch: FieldPatch;
  reasons: Record<string, string>;
};

function previewText(s: string, max = 120): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function grammarPointsPreviewFromNotes(notes: string | null): string | null {
  if (!notes?.trim()) return null;
  if (notes.includes("|")) return null;
  return notes.length > 200 ? `${notes.slice(0, 200)}…` : notes;
}

function escapeCsvCell(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

type Row = {
  id: number;
  questionText: string;
  topic: string;
  notes: string | null;
  skillKey: string | null;
  topicKey: string | null;
  moduleKey: string | null;
  sourceQuality: string | null;
  priorKnown: boolean | null;
};

function proposeForRow(row: Row): {
  patch: FieldPatch;
  mediumReasons: Record<string, string>;
  whyPartial: string | null;
} {
  const patch: FieldPatch = {};
  const mediumReasons: Record<string, string> = {};
  const gapReasons: string[] = [];

  if (!row.topicKey) {
    const inf = inferTopicKeyFromTopicColumn(row.topic);
    if (inf.topicKey && inf.tier !== "low") {
      patch.topicKey = inf.topicKey;
      if (inf.tier === "medium") {
        mediumReasons.topicKey = inf.reason;
      }
    } else {
      gapReasons.push(`topicKey: ${inf.reason}`);
    }
  }

  if (!row.skillKey) {
    const parsed = parseNotesForClassification(row.notes);
    if (parsed) {
      const inf = inferSkillKeyFromParsedNotes(parsed);
      if (inf.skillKey && inf.tier !== "low") {
        patch.skillKey = inf.skillKey;
        if (inf.tier === "medium") {
          mediumReasons.skillKey = inf.reason;
        }
      } else {
        gapReasons.push(`skillKey: ${inf.reason}`);
      }
    } else {
      gapReasons.push("skillKey: notes missing or not canonical `Category | sub` format");
    }
  }

  const resolvedSkill = (row.skillKey ?? patch.skillKey ?? null) as Phase1SkillKey | null;
  if (!row.moduleKey && resolvedSkill) {
    const inf = inferModuleKeyFromSkill(resolvedSkill);
    if (inf.moduleKey && inf.tier === "high") {
      patch.moduleKey = inf.moduleKey;
    } else {
      gapReasons.push(`moduleKey: ${inf.reason}`);
    }
  } else if (!row.moduleKey && !resolvedSkill) {
    gapReasons.push("moduleKey: skipped (no skillKey available)");
  }

  if (!row.sourceQuality) {
    const inf = inferSourceQuality({
      questionText: row.questionText,
      notes: row.notes,
      topic: row.topic,
      priorKnown: row.priorKnown,
    });
    if (inf.sourceQuality) {
      patch.sourceQuality = inf.sourceQuality;
      if (inf.tier === "medium") {
        mediumReasons.sourceQuality = inf.reason;
      }
    }
  }

  const whyPartial = gapReasons.length > 0 ? gapReasons.join(" | ") : null;

  return { patch, mediumReasons, whyPartial };
}

async function main() {
  const write = process.argv.includes("--write");

  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

  const rows = await prisma.questionBankItem.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      questionText: true,
      topic: true,
      notes: true,
      skillKey: true,
      topicKey: true,
      moduleKey: true,
      sourceQuality: true,
      priorKnown: true,
    },
  });

  const totalScanned = rows.length;
  let skippedPreexistingFields = { skillKey: 0, topicKey: 0, moduleKey: 0, sourceQuality: 0 };
  let rowsNoPatch = 0;
  let autoFilledRows = 0;
  let mediumRows = 0;
  const unresolved: UnresolvedRow[] = [];
  const mediumLog: MediumRow[] = [];
  const updates: Array<{ id: number; data: FieldPatch }> = [];

  for (const row of rows) {
    if (row.skillKey) skippedPreexistingFields.skillKey += 1;
    if (row.topicKey) skippedPreexistingFields.topicKey += 1;
    if (row.moduleKey) skippedPreexistingFields.moduleKey += 1;
    if (row.sourceQuality) skippedPreexistingFields.sourceQuality += 1;

    const { patch: proposed, mediumReasons, whyPartial } = proposeForRow(row);

    const effective: FieldPatch = {};
    if (!row.skillKey && proposed.skillKey !== undefined) effective.skillKey = proposed.skillKey;
    if (!row.topicKey && proposed.topicKey !== undefined) effective.topicKey = proposed.topicKey;
    if (!row.moduleKey && proposed.moduleKey !== undefined) effective.moduleKey = proposed.moduleKey;
    if (!row.sourceQuality && proposed.sourceQuality !== undefined) effective.sourceQuality = proposed.sourceQuality;

    if (Object.keys(effective).length === 0) {
      rowsNoPatch += 1;
      if (unresolved.length < 10_000) {
        unresolved.push({
          questionId: row.id,
          questionTextPreview: previewText(row.questionText),
          currentTopic: row.topic,
          notes: row.notes,
          grammarPointsPreview: grammarPointsPreviewFromNotes(row.notes),
          sourceQualityBefore: row.sourceQuality,
          whyUnresolved: whyPartial ?? "no proposals passed tier thresholds",
        });
      }
      continue;
    }

    const hasMedium = Object.keys(mediumReasons).length > 0;
    if (hasMedium) {
      mediumRows += 1;
      mediumLog.push({
        questionId: row.id,
        questionTextPreview: previewText(row.questionText),
        appliedPatch: { ...effective },
        reasons: { ...mediumReasons },
      });
    } else {
      autoFilledRows += 1;
    }

    updates.push({ id: row.id, data: effective });
  }

  const unresolvedPath = path.join(ARTIFACTS_DIR, "unresolved-taxonomy.json");
  const unresolvedCsvPath = path.join(ARTIFACTS_DIR, "unresolved-taxonomy.csv");
  fs.writeFileSync(unresolvedPath, JSON.stringify(unresolved, null, 2), "utf8");

  if (unresolved.length > 0) {
    const header = [
      "questionId",
      "questionTextPreview",
      "currentTopic",
      "notes",
      "grammarPointsPreview",
      "sourceQualityBefore",
      "whyUnresolved",
    ];
    const lines = [
      header.join(","),
      ...unresolved.map((r) =>
        [
          String(r.questionId),
          escapeCsvCell(r.questionTextPreview),
          escapeCsvCell(r.currentTopic),
          escapeCsvCell(r.notes ?? ""),
          escapeCsvCell(r.grammarPointsPreview ?? ""),
          escapeCsvCell(r.sourceQualityBefore ?? ""),
          escapeCsvCell(r.whyUnresolved),
        ].join(","),
      ),
    ];
    fs.writeFileSync(unresolvedCsvPath, `\uFEFF${lines.join("\n")}`, "utf8");
  }

  const mediumPath = path.join(ARTIFACTS_DIR, "medium-confidence-taxonomy.json");
  fs.writeFileSync(mediumPath, JSON.stringify(mediumLog, null, 2), "utf8");

  if (write) {
    for (const u of updates) {
      await prisma.questionBankItem.update({
        where: { id: u.id },
        data: u.data,
      });
    }
  }

  console.log("=== Taxonomy backfill ===");
  console.log(`Mode: ${write ? "WRITE" : "dry-run (no DB updates)"}`);
  console.log(`Total scanned: ${totalScanned}`);
  console.log(`Pre-existing field counts (skip per field): ${JSON.stringify(skippedPreexistingFields)}`);
  console.log(`Rows with a prepared patch: ${updates.length}`);
  console.log(`  Auto-filled (high-tier only, no medium reasons): ${autoFilledRows}`);
  console.log(`  Medium-confidence (at least one medium-tier field): ${mediumRows}`);
  console.log(`Rows with empty patch (nothing to write): ${rowsNoPatch}`);
  console.log(`Artifact unresolved records: ${unresolved.length}`);
  console.log(`Artifacts written:`);
  console.log(`  ${unresolvedPath}`);
  if (unresolved.length > 0) {
    console.log(`  ${unresolvedCsvPath}`);
  }
  console.log(`  ${mediumPath}`);
  console.log("\nUnresolved sample (first 8):");
  console.log(JSON.stringify(unresolved.slice(0, 8), null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
