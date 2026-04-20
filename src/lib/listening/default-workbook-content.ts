import type { DictationLine, ListeningMcqItem, ShadowingLine } from "./workbook-types";

/** Minimal starter content for a newly created workbook (editable in DB later). */
export function defaultRound1Questions(): ListeningMcqItem[] {
  return [
    {
      id: "r1-q1",
      kind: "main_idea",
      promptZh: "這段主要在講什麼？（第一次聽）",
      promptEn: "What is the main idea? (first listen)",
      choices: ["訂立計畫", "抱怨交通", "介紹新同事", "取消會議"],
      correctIndex: 0,
    },
    {
      id: "r1-q2",
      kind: "detail",
      promptZh: "說話者提到的具體數字或時間是？",
      promptEn: "Which detail is stated?",
      choices: ["下週一", "明天下午", "三點整", "下個月"],
      correctIndex: 0,
    },
  ];
}

export function defaultRound2Questions(): ListeningMcqItem[] {
  return [
    {
      id: "r2-q1",
      kind: "speaker_intent",
      promptZh: "說話者這樣說的主要意圖是？（重聽後）",
      promptEn: "What does the speaker mainly intend?",
      choices: ["請對方確認", "拒絕邀請", "表達感謝", "轉移話題"],
      correctIndex: 0,
    },
    {
      id: "r2-q2",
      kind: "paraphrase",
      promptZh: "下列哪一句最贴近原文意思？",
      promptEn: "Which paraphrases the line best?",
      choices: ["We need to reschedule.", "The room is too small.", "Please send the file.", "I agree with you."],
      correctIndex: 0,
    },
  ];
}

export function defaultDictationLines(): DictationLine[] {
  return [
    {
      id: "d1",
      promptZh: "聽一句，寫一句（可用英文或中文記關鍵字）",
      answerZh: "（請對照 transcript 自評）",
    },
  ];
}

export function defaultShadowingLines(): ShadowingLine[] {
  return [
    {
      id: "s1",
      textEn: "Let me confirm the timeline for next week.",
      noteZh: "注意重音與連音",
    },
  ];
}

export const DEFAULT_TRANSCRIPT_PLACEHOLDER = `（請將影片逐字稿貼在此欄位，或於資料庫／後台更新 listening_workbooks.transcript）`;

export const DEFAULT_KEY_PHRASES = [
  "片語或句型 1",
  "片語或句型 2",
  "片語或句型 3",
];
