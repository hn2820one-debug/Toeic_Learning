/**
 * Splits Phase 1 lesson Markdown (##-sectioned) into ordered micro-cards for one-screen-at-a-time UI.
 * Aligns with markers in `content-qa-rules.ts` (核心規則、識別信號、例句、…).
 */

export type MicroCardKind = "intro" | "rule" | "signals" | "example" | "trap" | "tip" | "check" | "generic";

export type LessonMicroCard = {
  kind: MicroCardKind;
  /** Original ## heading text (no ##). */
  title: string;
  bodyMarkdown: string;
};

const HEADING_LINE = /^##\s+(.+?)\s*$/;

function classifyTitle(title: string): MicroCardKind {
  const t = title.trim();
  if (t.includes("核心規則")) return "rule";
  if (t.includes("識別信號")) return "signals";
  if (t.includes("例句")) return "example";
  if (t.includes("常見錯誤") || t.includes("常見陷阱")) return "trap";
  if (t.includes("應試提示")) return "tip";
  if (t.includes("快速自測")) return "check";
  return "generic";
}

/**
 * Returns ordered micro-cards. If there are no `##` headings, returns a single generic card with the full body.
 */
export function parseLessonBodyToMicroCards(markdown: string): LessonMicroCard[] {
  const md = markdown.replace(/^\uFEFF/, "").trim();
  if (!md) {
    return [];
  }

  const lines = md.split("\n");
  const headingIndices: { line: number; title: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(HEADING_LINE);
    if (m?.[1]) {
      headingIndices.push({ line: i, title: m[1] });
    }
  }

  if (headingIndices.length === 0) {
    return [{ kind: "generic", title: "內容", bodyMarkdown: md }];
  }

  const out: LessonMicroCard[] = [];

  const firstHeadLine = headingIndices[0].line;
  if (firstHeadLine > 0) {
    const intro = lines.slice(0, firstHeadLine).join("\n").trim();
    if (intro.length > 0) {
      out.push({ kind: "intro", title: "導讀", bodyMarkdown: intro });
    }
  }

  for (let h = 0; h < headingIndices.length; h++) {
    const start = headingIndices[h].line + 1;
    const end = h + 1 < headingIndices.length ? headingIndices[h + 1].line : lines.length;
    const title = headingIndices[h].title;
    const body = lines.slice(start, end).join("\n").trim();
    const kind = classifyTitle(title);
    out.push({ kind, title, bodyMarkdown: body });
  }

  return out;
}

export function clampCardIndex(index: number, cardCount: number): number {
  if (cardCount <= 0) return 0;
  return Math.min(Math.max(0, index), cardCount - 1);
}
