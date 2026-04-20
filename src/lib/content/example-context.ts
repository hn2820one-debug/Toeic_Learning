/**
 * Preferred scenario order for TOEIC-style examples (FSE / tech / business first).
 * Spec: docs/teaching-quality-spec.md §7
 */

export type ExampleContextTier = {
  id: string;
  labelZh: string;
  labelEn: string;
  /** What “good” example sentences sound like */
  hintZh: string;
};

/** Higher index = lower priority as default authoring target. */
export const EXAMPLE_CONTEXT_PRIORITY: readonly ExampleContextTier[] = [
  {
    id: "fse_semiconductor",
    labelZh: "半導體／現場服務工程師（FSE）",
    labelEn: "FSE / semiconductor field service",
    hintZh: "裝機、驗機、客戶現場、ticket、log、calibration、handover",
  },
  {
    id: "tech_general",
    labelZh: "技術維修／安裝／校正／報告",
    labelEn: "General technical service",
    hintZh: "maintenance, install, alignment, test report, sign-off",
  },
  {
    id: "business",
    labelZh: "商務職場",
    labelEn: "Business workplace",
    hintZh: "meeting, email, schedule, vendor, stakeholder",
  },
  {
    id: "toeic_general",
    labelZh: "一般 TOEIC 場景",
    labelEn: "General TOEIC settings",
    hintZh: "travel, office, shopping — use when skill needs neutral context",
  },
] as const;

export type ExampleContextId = (typeof EXAMPLE_CONTEXT_PRIORITY)[number]["id"];

export function getExampleContextTier(id: string): ExampleContextTier | undefined {
  return EXAMPLE_CONTEXT_PRIORITY.find((t) => t.id === id);
}

/** Default tier for new Part 5–style stems when author has not chosen one. */
export const DEFAULT_EXAMPLE_CONTEXT_ID: ExampleContextId = "fse_semiconductor";
