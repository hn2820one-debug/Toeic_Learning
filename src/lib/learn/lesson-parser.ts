/**
 * Structural parsing of Phase 1 lesson Markdown (H2 sections).
 * Source text stays Markdown from DB / LLM; this module only splits and lightly extracts fields.
 */

const H2_LINE = /^##\s+(.+?)\s*$/;

export type LessonH2Section = {
  /** Heading text without `##`. */
  heading: string;
  body: string;
};

export type SplitLessonMarkdownResult = {
  /** Content before the first `##` (often `#` title or lead-in). */
  preamble: string;
  sections: LessonH2Section[];
};

/**
 * Splits document on level-2 headings. First block before any `##` is `preamble` (may be empty).
 */
export function splitLessonMarkdownByH2(markdown: string): SplitLessonMarkdownResult {
  const md = markdown.replace(/^\uFEFF/, "").trim();
  if (!md) {
    return { preamble: "", sections: [] };
  }

  const lines = md.split("\n");
  const hits: { line: number; heading: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(H2_LINE);
    if (m?.[1]) {
      hits.push({ line: i, heading: m[1].trim() });
    }
  }

  if (hits.length === 0) {
    return { preamble: md, sections: [] };
  }

  const preamble = lines.slice(0, hits[0].line).join("\n").trim();
  const sections: LessonH2Section[] = [];

  for (let h = 0; h < hits.length; h++) {
    const start = hits[h].line + 1;
    const end = h + 1 < hits.length ? hits[h + 1].line : lines.length;
    sections.push({
      heading: hits[h].heading,
      body: lines.slice(start, end).join("\n").trim(),
    });
  }

  return { preamble, sections };
}

export function findSectionBody(sections: LessonH2Section[], includes: string): string {
  const s = sections.find((x) => x.heading.includes(includes));
  return s?.body ?? "";
}

/** Strip a line-based label block from markdown and return the captured line + remainder. */
export function extractLabeledLine(body: string, pattern: RegExp): { match: string; rest: string } {
  const lines = body.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].trim().match(pattern);
    if (m?.[1]) {
      const rest = [...lines.slice(0, i), ...lines.slice(i + 1)].join("\n").trim();
      return { match: m[1].trim(), rest };
    }
  }
  return { match: "", rest: body.trim() };
}
