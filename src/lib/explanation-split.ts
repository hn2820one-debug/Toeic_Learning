/**
 * Split long explanations into a short “key difference” line + optional detail for collapsible UI.
 */
export function splitExplanationForFeedback(text: string | null | undefined): { summary: string; detail: string } {
  const t = (text ?? "").trim();
  if (!t) {
    return { summary: "", detail: "" };
  }
  const endSentence = t.search(/[。！？.!?]\s/);
  if (endSentence >= 40 && endSentence <= 200) {
    return {
      summary: t.slice(0, endSentence + 1).trim(),
      detail: t.slice(endSentence + 1).trim(),
    };
  }
  if (t.length <= 140) {
    return { summary: t, detail: "" };
  }
  return {
    summary: `${t.slice(0, 137).trim()}…`,
    detail: t.slice(137).trim(),
  };
}
