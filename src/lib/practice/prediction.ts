/**
 * Lightweight "prediction before options" for LEARN micro-checks and PRACTICE early items.
 * Heuristic-only — no LLM required; returns undefined when not applicable.
 */

export const PREDICTION_PREF_STORAGE_KEY = "toeic:predictionStepEnabled";

export type PredictionKind = "pos" | "structure" | "signal";

export type PredictionChoice = {
  id: string;
  labelZh: string;
  labelEn: string;
};

export type PredictionPayload = {
  kind: PredictionKind;
  promptZh: string;
  promptEn: string;
  choices: PredictionChoice[];
};

const POS_CHOICES: PredictionChoice[] = [
  { id: "noun", labelZh: "名詞 · noun", labelEn: "noun" },
  { id: "verb", labelZh: "動詞 · verb", labelEn: "verb" },
  { id: "adj", labelZh: "形容詞 · adjective", labelEn: "adjective" },
  { id: "adv", labelZh: "副詞 · adverb", labelEn: "adverb" },
];

const STRUCTURE_CHOICES: PredictionChoice[] = [
  { id: "clause", labelZh: "子句 · clause", labelEn: "clause" },
  { id: "participle", labelZh: "分詞片語 · participle phrase", labelEn: "participle phrase" },
  { id: "prep_phrase", labelZh: "介系詞片語 · prep. phrase", labelEn: "preposition phrase" },
  { id: "complement", labelZh: "補語 · complement", labelEn: "complement" },
];

const SIGNAL_CHOICES: PredictionChoice[] = [
  { id: "linking", labelZh: "連綴動詞 · linking verb", labelEn: "linking verb" },
  { id: "prep", labelZh: "介系詞 · preposition", labelEn: "preposition" },
  { id: "tense", labelZh: "時態標記 · tense marker", labelEn: "tense marker" },
  { id: "conj", labelZh: "連接詞 · conjunction", labelEn: "conjunction" },
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function inferKindFromText(questionText: string, skillKey: string | null, topicKey: string | null): PredictionKind {
  const t = `${questionText} ${skillKey ?? ""} ${topicKey ?? ""}`.toLowerCase();
  if (
    /\b(which|what|blank|空格|填入|詞性|word form|verb|noun|adjective|adverb)\b/.test(t) ||
    /詞性|空格|填入|動詞|名詞|形容詞|副詞/.test(t)
  ) {
    return "pos";
  }
  if (
    /\b(clause|participle|complement|phrase|子句|分詞|片語|補語|結構)\b/.test(t) ||
    /子句|分詞|片語|補語|結構|grammar/.test(t)
  ) {
    return "structure";
  }
  if (skillKey?.includes("grammar") || topicKey?.includes("grammar")) {
    return "structure";
  }
  const h = hashString(questionText || skillKey || topicKey || "x");
  return (h % 3 === 0 ? "pos" : h % 3 === 1 ? "structure" : "signal") as PredictionKind;
}

function kindToPayload(kind: PredictionKind, variant: number): PredictionPayload {
  const prompts: Record<
    PredictionKind,
    { zh: string; en: string; choices: PredictionChoice[] }
  > = {
    pos: {
      zh: "先估下呢個空位要咩詞性？",
      en: "What part of speech fits the blank?",
      choices: POS_CHOICES,
    },
    structure: {
      zh: "先諗結構，再睇選項：呢度似邊類？",
      en: "Think structure first — which pattern is this?",
      choices: STRUCTURE_CHOICES,
    },
    signal: {
      zh: "第一眼最值得留意邊個信號？",
      en: "Which cue stands out first?",
      choices: SIGNAL_CHOICES,
    },
  };
  const base = prompts[kind];
  const alt =
    variant % 2 === 1 && kind === "pos"
      ? { zh: "呢格最需要名詞定動詞定形容？先揀一類。", en: "Noun, verb, or adjective family?" }
      : null;
  return {
    kind,
    promptZh: alt?.zh ?? base.zh,
    promptEn: alt?.en ?? base.en,
    choices: base.choices,
  };
}

/** PRACTICE: first 3 items or first half of the session (union). */
export function practicePositionEligibleForPrediction(totalItems: number, position: number): boolean {
  if (totalItems <= 0) {
    return false;
  }
  const half = Math.ceil(totalItems / 2);
  return position < 3 || position < half;
}

export function buildPracticePredictionPayload(params: {
  questionText: string;
  skillKey: string | null;
  topicKey: string | null;
  topic: string;
  position: number;
  totalItems: number;
  reinforceBannerZh?: string;
}): PredictionPayload | undefined {
  if (params.reinforceBannerZh) {
    return undefined;
  }
  if (!practicePositionEligibleForPrediction(params.totalItems, params.position)) {
    return undefined;
  }
  const qt = params.questionText.trim();
  if (qt.length < 12) {
    return undefined;
  }
  const kind = inferKindFromText(qt, params.skillKey, params.topicKey);
  const variant = hashString(`${params.skillKey ?? ""}-${params.position}-${qt.slice(0, 40)}`);
  return kindToPayload(kind, variant);
}

/** LEARN micro-check: always try a light prompt when the stem is long enough. */
export function buildMicroCheckPredictionPayload(question: string, topicKey?: string): PredictionPayload | undefined {
  const q = question.trim();
  if (q.length < 10) {
    return undefined;
  }
  const kind = inferKindFromText(q, null, topicKey ?? null);
  const variant = hashString(`${topicKey ?? ""}-${q.slice(0, 60)}`);
  return kindToPayload(kind, variant);
}
