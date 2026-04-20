import { splitExplanationForFeedback } from "@/lib/explanation-split";

/**
 * Teaching-oriented feedback after a Part 5-style MCQ attempt — distractor analysis, not just "correct = B".
 */
export type ChoiceFeedback = {
  selectedChoice: string;
  correctChoice: string;
  /** Why the learner’s pick can feel tempting (or why the correct one fits). */
  whySelectedLooksPlausible: string;
  /** What actually separates the correct line from the trap. */
  decisiveDifference: string;
  /** One-line rule to carry to the next item. */
  ruleInOneSentence: string;
  retryTip?: string;
};

export type BuildChoiceFeedbackInput = {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  /** "A" | "B" | "C" | "D" — may be TIMEOUT sentinel in test/review */
  selectedChoice: string;
  correctChoice: string;
  isCorrect: boolean;
  explanation: string | null | undefined;
  notes?: string | null;
  timedOut?: boolean;
};

function pickOption(
  input: Pick<BuildChoiceFeedbackInput, "optionA" | "optionB" | "optionC" | "optionD">,
  key: string,
): string {
  const k = key.trim().toUpperCase();
  if (k === "A") return input.optionA.trim();
  if (k === "B") return input.optionB.trim();
  if (k === "C") return input.optionC.trim();
  if (k === "D") return input.optionD.trim();
  return "";
}

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function firstSentenceOrLine(text: string): string {
  const t = text.trim();
  if (!t) return "";
  const m = /^(.{1,200}[。！？.!?]|.{1,120})(\s|$)/u.exec(t);
  return (m?.[1] ?? t.slice(0, 120)).trim();
}

const DEFAULT_RULE =
  "做題時先抓題幹的「動作／關係／時間」，再逐選項檢查：語意與文法線索是否同時成立。";

const DEFAULT_RETRY = "下一題：先把題幹縮成一句中文要點，再帶著要點去對選項，避免只看單字是否眼熟。";

/**
 * Builds structured feedback from existing question fields (no DB migration).
 * Uses `explanation` + simple heuristics so wrong answers still get distractor-style guidance.
 */
export function buildChoiceFeedback(input: BuildChoiceFeedbackInput): ChoiceFeedback {
  const selected = input.selectedChoice.trim().toUpperCase();
  const correct = input.correctChoice.trim().toUpperCase();
  const expl = splitExplanationForFeedback((input.explanation ?? "").trim() || "");
  const selText = pickOption(input, selected);
  const corText = pickOption(input, correct);

  if (input.timedOut || selected === "TIMEOUT") {
    return {
      selectedChoice: selected,
      correctChoice: correct,
      whySelectedLooksPlausible:
        "時間壓力下，最容易先看到「讀起來順」的選項就選下去，但題幹裡決定真偽的線索可能還沒對完。",
      decisiveDifference:
        expl.summary ||
        `正解 ${correct} 需要在完整讀懂題幹後，確認選項與題幹的語意與搭配同時成立；逾時時往往停在表面字義。`,
      ruleInOneSentence: firstSentenceOrLine(expl.summary || expl.detail) || DEFAULT_RULE,
      retryTip: "限時題：先圈題幹 1–2 個硬線索（時態、主被動、關鍵名詞），再回頭看選項。",
    };
  }

  if (input.isCorrect) {
    return {
      selectedChoice: selected,
      correctChoice: correct,
      whySelectedLooksPlausible: `選項 ${selected}（${clip(selText, 56)}）能同時滿足題幹的語意需求與文法／搭配線索，因此是較佳答案。`,
      decisiveDifference:
        expl.summary ||
        `與其他選項相比，正解在「整句邏輯」上最完整：不只字彙相關，還要能承接題幹真正的動作或關係。`,
      ruleInOneSentence: firstSentenceOrLine(expl.summary || expl.detail) || DEFAULT_RULE,
      retryTip: DEFAULT_RETRY,
    };
  }

  const whyTrap =
    selText.length > 0
      ? `選項 ${selected}（${clip(selText, 56)}）常在字彙主題或片語外觀上「看起來像答案」：它可能呼應題幹某個關鍵詞，但若忽略題幹真正的語法或搭配限制，就會誤選。`
      : `你選的選項在表面上可能呼應題幹某個片段，但若忽略題幹真正的語法或搭配限制，就容易誤判。`;

  const decisive =
    expl.summary ||
    `正解 ${correct}（${clip(corText, 56)}）與 ${selected} 的關鍵差異，通常在於：誰能完整承接題幹的語意與搭配，而不只是「詞彙相關」。`;

  const rule =
    firstSentenceOrLine(expl.detail || expl.summary) ||
    (input.notes?.trim() ? clip(input.notes.trim(), 120) : DEFAULT_RULE);

  return {
    selectedChoice: selected,
    correctChoice: correct,
    whySelectedLooksPlausible: whyTrap,
    decisiveDifference: decisive,
    ruleInOneSentence: rule,
    retryTip: DEFAULT_RETRY,
  };
}
