export const QUESTION_CATEGORY_LABELS = {
  Vocabulary: "字彙 / Vocabulary",
  Grammar: "文法 / Grammar",
  Reading: "閱讀 / Reading",
} as const;

export type QuestionCategory = keyof typeof QUESTION_CATEGORY_LABELS;

export type ParsedQuestionClassification = {
  category: QuestionCategory;
  categoryLabel: string;
  subFocusLabel: string;
};

const CATEGORY_BY_LABEL = new Map<string, QuestionCategory>(
  Object.entries(QUESTION_CATEGORY_LABELS).map(([category, label]) => [label, category as QuestionCategory]),
);

export function formatQuestionNotes(category: QuestionCategory, subFocusLabel: string) {
  const trimmed = subFocusLabel.trim();
  return trimmed.length > 0
    ? `${QUESTION_CATEGORY_LABELS[category]} | ${trimmed}`
    : QUESTION_CATEGORY_LABELS[category];
}

/**
 * Notes are used as a schema-safe taxonomy channel:
 *   字彙 / Vocabulary | 片語動詞 / Phrasal verbs
 *   文法 / Grammar | 動詞時態 / Verb tense
 *   閱讀 / Reading | 電子郵件細節 / Email detail
 */
export function parseQuestionNotes(notes: string | null | undefined): ParsedQuestionClassification | null {
  const normalized = notes?.trim();
  if (!normalized) {
    return null;
  }

  const [categoryLabelRaw, ...rest] = normalized.split("|");
  const categoryLabel = categoryLabelRaw?.trim() ?? "";
  const category = CATEGORY_BY_LABEL.get(categoryLabel);
  if (!category) {
    return null;
  }

  const subFocusLabel = rest.join("|").trim();

  return {
    category,
    categoryLabel,
    subFocusLabel: subFocusLabel.length > 0 ? subFocusLabel : "未標註 / Unspecified",
  };
}
