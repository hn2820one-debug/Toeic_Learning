export type QaStatus = "draft" | "qa_failed" | "approved" | "needs_regen";

export type QaIssueLevel = "error" | "warning";

export type QaIssue = {
  code: string;
  level: QaIssueLevel;
  message: string;
};

export type LessonQaResult = {
  passed: boolean;
  score: number;
  status: QaStatus;
  issues: QaIssue[];
};

export type HintSet = {
  hint1: string;
  hint2: string;
  hint3: string;
};

export type HintQaResult = {
  passed: boolean;
  status: QaStatus;
  issues: QaIssue[];
};

const REQUIRED_LESSON_MARKERS = ["## 核心規則", "## 識別信號", "## 例句", "## 常見錯誤"] as const;
const OPTIONAL_PLUS_MARKERS = ["## 應試提示", "## 快速自測"] as const;
const VAGUE_FILLERS = ["再想想", "小心一點", "你一定可以", "加油", "保持信心"];

function clip(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function appearsTraditionalChinese(text: string) {
  const tradHits = (text.match(/[學習題幹選項驗證規則應試關鍵錯誤範例顯示點擊]/g) ?? []).length;
  const simpHits = (text.match(/[学习题干选项验证规则应试关键错误范例显示点击]/g) ?? []).length;
  return tradHits >= simpHits;
}

function hasLikelyTitle(markdown: string) {
  const first = markdown.split("\n").find((line) => line.trim().length > 0) ?? "";
  return /^#\s+/.test(first) || /^##\s+/.test(first);
}

function includesLargeVagueFiller(markdown: string) {
  const lowered = markdown.toLowerCase();
  let hit = 0;
  for (const w of VAGUE_FILLERS) {
    if (lowered.includes(w.toLowerCase())) {
      hit += 1;
    }
  }
  return hit >= 3;
}

export function buildQaIssueList(input: { checks: Array<{ ok: boolean; code: string; message: string; level?: QaIssueLevel }> }): QaIssue[] {
  return input.checks
    .filter((c) => !c.ok)
    .map((c) => ({
      code: c.code,
      level: c.level ?? "error",
      message: c.message,
    }));
}

export function scoreLessonQuality(markdown: string): number {
  const md = clip(markdown);
  let score = 100;
  if (!appearsTraditionalChinese(md)) {
    score -= 20;
  }
  if (md.length < 240) {
    score -= 25;
  }
  if (md.length > 5000) {
    score -= 10;
  }
  if (includesLargeVagueFiller(md)) {
    score -= 15;
  }
  for (const m of REQUIRED_LESSON_MARKERS) {
    if (!md.includes(m)) {
      score -= 12;
    }
  }
  if (!OPTIONAL_PLUS_MARKERS.some((m) => md.includes(m))) {
    score -= 8;
  }
  return Math.max(0, Math.min(100, score));
}

export function validateLessonStructure(markdown: string): LessonQaResult {
  const md = clip(markdown);
  const issues = buildQaIssueList({
    checks: [
      { ok: md.length > 0, code: "lesson_empty", message: "lesson 內容為空白。" },
      { ok: appearsTraditionalChinese(md), code: "lesson_not_traditional_zh", message: "lesson 不是以繁體中文為主。" },
      { ok: hasLikelyTitle(md), code: "lesson_missing_title", message: "lesson 缺少標題（# 或 ## 開頭）。" },
      ...REQUIRED_LESSON_MARKERS.map((marker) => ({
        ok: md.includes(marker),
        code: `lesson_missing_${marker.replace(/^##\s*/, "")}`,
        message: `lesson 缺少段落：${marker}`,
      })),
      {
        ok: OPTIONAL_PLUS_MARKERS.some((marker) => md.includes(marker)),
        code: "lesson_missing_test_tip",
        message: "lesson 缺少「應試提示」或「快速自測」。",
      },
      {
        ok: md.length >= 240,
        code: "lesson_too_short",
        message: `lesson 長度過短（${md.length} 字）。`,
      },
      {
        ok: md.length <= 5000,
        code: "lesson_too_long",
        message: `lesson 長度過長（${md.length} 字）。`,
        level: "warning",
      },
      {
        ok: !includesLargeVagueFiller(md),
        code: "lesson_vague_filler",
        message: "lesson 出現大量空泛鼓勵句，資訊密度不足。",
      },
    ],
  });

  const score = scoreLessonQuality(md);
  const hasError = issues.some((i) => i.level === "error");
  const passed = !hasError && score >= 70;
  const status: QaStatus = passed ? "approved" : issues.some((i) => i.code === "lesson_empty") ? "needs_regen" : "qa_failed";
  return { passed, score, status, issues };
}

function normalizeHint(s: string) {
  return clip(s).replace(/[。!！?？]/g, "");
}

function isVagueHint(s: string) {
  const t = normalizeHint(s);
  if (t.length <= 4) {
    return true;
  }
  return VAGUE_FILLERS.some((w) => t.includes(w));
}

function answerLeak(hint: string, answer: string | undefined) {
  if (!answer) {
    return false;
  }
  const a = answer.trim().toUpperCase();
  return new RegExp(`\\b${a}\\b`).test(hint.toUpperCase()) || hint.includes(`正解是${a}`) || hint.includes(`答案是${a}`);
}

export function validateHintSet(hints: HintSet, options?: { correctAnswer?: string }): HintQaResult {
  const h1 = clip(hints.hint1);
  const h2 = clip(hints.hint2);
  const h3 = clip(hints.hint3);

  const issues = buildQaIssueList({
    checks: [
      { ok: h1.length > 0, code: "hint1_empty", message: "hint1 為空。" },
      { ok: h2.length > 0, code: "hint2_empty", message: "hint2 為空。" },
      { ok: h3.length > 0, code: "hint3_empty", message: "hint3 為空。" },
      { ok: normalizeHint(h1) !== normalizeHint(h2), code: "hint1_hint2_duplicate", message: "hint1 與 hint2 重複。" },
      { ok: normalizeHint(h2) !== normalizeHint(h3), code: "hint2_hint3_duplicate", message: "hint2 與 hint3 重複。" },
      { ok: !answerLeak(h1, options?.correctAnswer), code: "hint1_leaks_answer", message: "hint1 過早洩漏答案。" },
      { ok: h1.length <= h2.length + 40, code: "hint_depth_not_progressive_12", message: "hint1 與 hint2 沒有由淺入深。", level: "warning" },
      { ok: h2.length <= h3.length + 40, code: "hint_depth_not_progressive_23", message: "hint2 與 hint3 沒有由淺入深。", level: "warning" },
      { ok: !isVagueHint(h1), code: "hint1_too_vague", message: "hint1 過度空泛。" },
      { ok: !isVagueHint(h2), code: "hint2_too_vague", message: "hint2 過度空泛。" },
      { ok: !isVagueHint(h3), code: "hint3_too_vague", message: "hint3 過度空泛。" },
    ],
  });

  const passed = issues.filter((i) => i.level === "error").length === 0;
  return {
    passed,
    status: passed ? "approved" : "qa_failed",
    issues,
  };
}

export function getFallbackExplanation(input: {
  correctAnswer: string;
  explanation?: string | null;
  hint3?: string;
}): string {
  const expl = clip(input.explanation ?? "");
  if (expl.length > 0) {
    return [
      `正解是：${input.correctAnswer.toUpperCase()}`,
      `為什麼：${expl}`,
      "常見錯誤原因：只看單字表面意思，未先核對句型或時態線索。",
    ].join("\n");
  }
  const hint3 = clip(input.hint3 ?? "");
  return [
    `正解是：${input.correctAnswer.toUpperCase()}`,
    `為什麼：${hint3 || "此選項最符合題幹語意與文法結構。"}`,
    "常見錯誤原因：過早鎖定選項，忽略上下文與關鍵訊號詞。",
  ].join("\n");
}
