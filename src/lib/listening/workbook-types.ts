/**
 * JSON shapes for `ListeningWorkbook` and `UserListeningWorkbookProgress`.
 */

export type ListeningQuestionKind = "main_idea" | "detail" | "speaker_intent" | "paraphrase";

export const LISTENING_QUESTION_KINDS: ListeningQuestionKind[] = [
  "main_idea",
  "detail",
  "speaker_intent",
  "paraphrase",
];

export const KIND_LABEL_ZH: Record<ListeningQuestionKind, string> = {
  main_idea: "主旨題",
  detail: "細節題",
  speaker_intent: "說話者意圖",
  paraphrase: "同義轉換",
};

export type ListeningMcqItem = {
  id: string;
  kind: ListeningQuestionKind;
  promptZh: string;
  promptEn?: string;
  choices: [string, string, string, string];
  correctIndex: number;
};

export type DictationLine = {
  id: string;
  promptZh: string;
  /** Optional answer key for self-check */
  answerZh?: string;
};

export type ShadowingLine = {
  id: string;
  textEn: string;
  noteZh?: string;
};

export function isListeningQuestionKind(x: string): x is ListeningQuestionKind {
  return (LISTENING_QUESTION_KINDS as readonly string[]).includes(x);
}

export function parseMcqList(raw: unknown): ListeningMcqItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: ListeningMcqItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const o = row as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const kind = typeof o.kind === "string" && isListeningQuestionKind(o.kind) ? o.kind : "detail";
    const promptZh = typeof o.promptZh === "string" ? o.promptZh : "";
    const promptEn = typeof o.promptEn === "string" ? o.promptEn : undefined;
    const choices = o.choices;
    const correctIndex = typeof o.correctIndex === "number" ? o.correctIndex : 0;
    if (!id || !promptZh || !Array.isArray(choices) || choices.length !== 4) {
      continue;
    }
    const c = choices.map((x) => String(x)) as [string, string, string, string];
    out.push({
      id,
      kind,
      promptZh,
      promptEn,
      choices: c,
      correctIndex: Math.min(3, Math.max(0, correctIndex)),
    });
  }
  return out;
}

export function parseStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

export function parseDictationLines(raw: unknown): DictationLine[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: DictationLine[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const o = row as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const promptZh = typeof o.promptZh === "string" ? o.promptZh : "";
    if (!id || !promptZh) {
      continue;
    }
    out.push({
      id,
      promptZh,
      answerZh: typeof o.answerZh === "string" ? o.answerZh : undefined,
    });
  }
  return out;
}

export function parseShadowingLines(raw: unknown): ShadowingLine[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: ShadowingLine[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const o = row as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const textEn = typeof o.textEn === "string" ? o.textEn : "";
    if (!id || !textEn) {
      continue;
    }
    out.push({
      id,
      textEn,
      noteZh: typeof o.noteZh === "string" ? o.noteZh : undefined,
    });
  }
  return out;
}
