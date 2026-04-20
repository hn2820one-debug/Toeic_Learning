import { extractLabeledLine, findSectionBody, splitLessonMarkdownByH2 } from "./lesson-parser";

/**
 * Front-end teaching blocks (pedagogy-first order is enforced in `markdownToDisplayBlocks`).
 * `exam_tip` is optional UI sugar for the existing「應試提示」section.
 */
export function clampCardIndex(index: number, cardCount: number): number {
  if (cardCount <= 0) {
    return 0;
  }
  return Math.min(Math.max(0, index), cardCount - 1);
}

export type DisplayLessonBlock =
  | { type: "example_pair"; correct: string; wrong?: string; explanation: string }
  | { type: "pattern_signal"; text: string }
  | { type: "rule"; text: string }
  | { type: "trap"; wrongChoice: string; whyItLooksRight: string; whyItsWrong: string }
  | { type: "micro_check"; question: string; options?: string[]; answer: string; explanation: string }
  | { type: "exam_tip"; text: string };

function stripOuterMarkdownFence(text: string): string {
  const t = text.trim();
  const m = /^```(?:markdown|md)?\s*\n?([\s\S]*?)```$/i.exec(t);
  if (m?.[1]) {
    return m[1].trim();
  }
  return t;
}

function firstParagraph(text: string): string {
  const t = text.trim();
  if (!t) return "";
  const parts = t.split(/\n\n+/);
  return (parts[0] ?? t).trim();
}

function parseExamplePair(body: string, preamble: string): DisplayLessonBlock {
  let rest = body.trim();
  let correct = "";
  let wrong: string | undefined;

  const patternsCorrect: RegExp[] = [
    /^(?:[-*]\s*)?\*{0,2}\s*(?:正解|正句|推薦答案|較佳選項)\s*\*{0,2}\s*[:：]\s*(.+)$/,
    /^(?:[-*]\s*)?\*{0,2}\s*✅\s*\*{0,2}\s*[:：]?\s*(.+)$/,
  ];
  const patternsWrong: RegExp[] = [
    /^(?:[-*]\s*)?\*{0,2}\s*(?:易誤|誤選|錯誤(?:選項)?)\s*\*{0,2}\s*[:：]\s*(.+)$/,
    /^(?:[-*]\s*)?\*{0,2}\s*❌\s*\*{0,2}\s*[:：]?\s*(.+)$/,
  ];

  for (const re of patternsCorrect) {
    const x = extractLabeledLine(rest, re);
    if (x.match) {
      correct = x.match;
      rest = x.rest;
      break;
    }
  }
  for (const re of patternsWrong) {
    const x = extractLabeledLine(rest, re);
    if (x.match) {
      wrong = x.match;
      rest = x.rest;
      break;
    }
  }

  let explanation = rest.trim();
  if (preamble.trim()) {
    explanation = [preamble.trim(), explanation].filter(Boolean).join("\n\n");
  }

  if (!correct) {
    correct = firstParagraph(body) || firstParagraph(explanation) || "（請對照下方說明）";
    explanation = body.trim() || explanation;
  }

  return {
    type: "example_pair",
    correct,
    wrong,
    explanation: explanation.trim() || "（此段可再讀一次例句與訊號）",
  };
}

function splitByH3(body: string): { title: string; content: string }[] {
  const lines = body.split("\n");
  const out: { title: string; content: string }[] = [];
  let curTitle = "";
  let buf: string[] = [];
  const flush = () => {
    const c = buf.join("\n").trim();
    if (curTitle || c) {
      out.push({ title: curTitle, content: c });
    }
    buf = [];
  };
  for (const line of lines) {
    const m = /^###\s+(.+?)\s*$/.exec(line);
    if (m?.[1]) {
      flush();
      curTitle = m[1].trim();
    } else {
      buf.push(line);
    }
  }
  flush();
  return out;
}

function parseTrap(body: string): DisplayLessonBlock {
  const t = body.trim();
  if (!t) {
    return {
      type: "trap",
      wrongChoice: "（尚無內容）",
      whyItLooksRight: "",
      whyItsWrong: "",
    };
  }

  const chunks = splitByH3(t);
  const norm = (s: string) => s.replace(/\*\*/g, "").trim();

  let wrongChoice = "";
  let whyItLooksRight = "";
  let whyItsWrong = "";

  for (const ch of chunks) {
    const title = norm(ch.title);
    const c = ch.content.trim();
    if (!c) continue;
    if (/誤選|錯誤選項|陷阱|易誤/.test(title)) {
      wrongChoice = wrongChoice || c;
    } else if (/看起來|合理|像對|誤判/.test(title)) {
      whyItLooksRight = whyItLooksRight || c;
    } else if (/實際|為何錯|正解|關鍵|避免/.test(title)) {
      whyItsWrong = whyItsWrong || c;
    }
  }

  if (!wrongChoice && !whyItLooksRight && !whyItsWrong) {
    const paras = t.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
    wrongChoice = paras[0] ?? t;
    whyItLooksRight = paras[1] ?? "";
    whyItsWrong = paras.slice(2).join("\n\n") || (paras[0] ?? "");
  } else {
    whyItsWrong = whyItsWrong || t;
  }

  return {
    type: "trap",
    wrongChoice: wrongChoice || firstParagraph(t),
    whyItLooksRight: whyItLooksRight || "（語意或搭配表面合理，但忽略關鍵線索。）",
    whyItsWrong: whyItsWrong || t,
  };
}

function parseMicroCheck(body: string): DisplayLessonBlock {
  const raw = body.trim();
  if (!raw) {
    return {
      type: "micro_check",
      question: "（尚無自測題）",
      answer: "",
      explanation: "",
    };
  }

  const lines = raw.split("\n").map((l) => l.trim());
  let question = "";
  const options: string[] = [];
  let answer = "";
  const tail: string[] = [];

  const answerLine = /^(?:答案|正解|參考答案)[:：]\s*(.+)$/i;

  let phase: "q" | "opt" | "rest" = "q";
  for (const line of lines) {
    if (!line) {
      if (phase === "opt" && options.length > 0) {
        phase = "rest";
      }
      continue;
    }
    const am = line.match(answerLine);
    if (am?.[1]) {
      answer = am[1].trim();
      phase = "rest";
      continue;
    }
    if (phase === "q") {
      if (line.includes("?") || line.includes("？")) {
        question = line;
        phase = "opt";
        continue;
      }
      if (/^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
        phase = "opt";
      } else {
        question = question ? `${question} ${line}` : line;
        continue;
      }
    }
    if (phase === "opt") {
      const om = line.match(/^[-*]\s+(.+)$/) ?? line.match(/^\d+[.)]\s+(.+)$/);
      if (om?.[1]) {
        options.push(om[1].trim());
        continue;
      }
      if (options.length > 0) {
        phase = "rest";
        tail.push(line);
      } else {
        question = question ? `${question} ${line}` : line;
      }
      continue;
    }
    tail.push(line);
  }

  const explanation = tail.join("\n").trim();

  return {
    type: "micro_check",
    question: question || firstParagraph(raw),
    options: options.length > 0 ? options : undefined,
    answer: answer || "（請回顧上文的規則與訊號）",
    explanation: explanation || "（想一想：題幹最硬的線索是什麼？）",
  };
}

/**
 * Teaching-first order: **例句 → 識別信號（差異觀察）→ 核心規則 → 常見錯誤 → 應試提示 → 快速自測**。
 * Unknown / preamble-only lessons degrade to a small set of `rule` / `pattern_signal` blocks.
 */
export function markdownToDisplayBlocks(markdown: string): DisplayLessonBlock[] {
  const md = stripOuterMarkdownFence(markdown);
  const { preamble, sections } = splitLessonMarkdownByH2(md);

  if (sections.length === 0) {
    const fallback = md.trim() || "（此課節尚無內容）";
    return [
      { type: "example_pair", correct: firstParagraph(fallback), explanation: fallback },
      { type: "pattern_signal", text: "先觀察例句與訊號詞，再回頭整理規則。" },
      { type: "rule", text: fallback },
      { type: "trap", wrongChoice: "", whyItLooksRight: "", whyItsWrong: "" },
      { type: "micro_check", question: "這一節最重要的 takeaway？", answer: "依上文重點自評即可。", explanation: "" },
    ];
  }

  const exampleBody = findSectionBody(sections, "例句");
  const signalBody = findSectionBody(sections, "識別信號");
  const ruleBody = findSectionBody(sections, "核心規則");
  const trapBody = findSectionBody(sections, "常見錯誤");
  const tipBody = findSectionBody(sections, "應試提示");
  const checkBody = findSectionBody(sections, "快速自測");

  const blocks: DisplayLessonBlock[] = [];

  blocks.push(parseExamplePair(exampleBody, preamble));
  blocks.push({
    type: "pattern_signal",
    text: signalBody.trim() || "（先圈出訊號詞，再對照正／誤例的差異。）",
  });
  blocks.push({
    type: "rule",
    text: ruleBody.trim() || "（把規則收成 1–3 條可操作步驟。）",
  });
  blocks.push(parseTrap(trapBody));

  if (tipBody.trim()) {
    blocks.push({ type: "exam_tip", text: tipBody.trim() });
  }

  blocks.push(parseMicroCheck(checkBody));

  return blocks;
}
