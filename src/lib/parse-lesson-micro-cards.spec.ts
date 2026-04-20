import { describe, expect, it } from "vitest";

import { clampCardIndex, parseLessonBodyToMicroCards } from "./parse-lesson-micro-cards";

describe("parseLessonBodyToMicroCards", () => {
  it("splits standard Phase 1 ## headings into typed cards", () => {
    const md = `# 標題

## 核心規則
A.

## 識別信號
B.

## 例句
C.

## 常見錯誤
D.

## 應試提示
E.

## 快速自測
F.
`;
    const cards = parseLessonBodyToMicroCards(md);
    expect(cards.map((c) => c.kind)).toEqual(["intro", "rule", "signals", "example", "trap", "tip", "check"]);
  });

  it("returns one generic card when there are no ## headings", () => {
    const cards = parseLessonBodyToMicroCards("Plain paragraph only.");
    expect(cards).toHaveLength(1);
    expect(cards[0]?.kind).toBe("generic");
  });
});

describe("clampCardIndex", () => {
  it("clamps to valid range", () => {
    expect(clampCardIndex(99, 3)).toBe(2);
    expect(clampCardIndex(-1, 3)).toBe(0);
    expect(clampCardIndex(0, 0)).toBe(0);
  });
});
