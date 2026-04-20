import { describe, expect, it } from "vitest";

import { clampCardIndex, markdownToDisplayBlocks } from "./lesson-display";

describe("markdownToDisplayBlocks", () => {
  it("orders blocks example → signals → rule → trap → tip → check", () => {
    const md = `
## 核心規則
Rule here.

## 識別信號
Signal here.

## 例句
**正解：** Good sentence.
**易誤：** Bad sentence.
Why different.

## 常見錯誤
### 誤選
Wrong pick.
### 看起來合理
Seems ok.
### 實際錯因
Not ok.

## 應試提示
Tip line.

## 快速自測
What is the best choice?
- A) one
- B) two
答案：B
Because two fits.
`;
    const blocks = markdownToDisplayBlocks(md);
    expect(blocks.map((b) => b.type)).toEqual([
      "example_pair",
      "pattern_signal",
      "rule",
      "trap",
      "exam_tip",
      "micro_check",
    ]);
    const ex = blocks[0];
    expect(ex?.type).toBe("example_pair");
    if (ex?.type === "example_pair") {
      expect(ex.correct).toContain("Good sentence");
      expect(ex.wrong).toContain("Bad sentence");
    }
    const mc = blocks[5];
    expect(mc?.type).toBe("micro_check");
    if (mc?.type === "micro_check") {
      expect(mc.options?.length).toBeGreaterThanOrEqual(1);
      expect(mc.answer).toContain("B");
    }
  });
});

describe("clampCardIndex", () => {
  it("clamps", () => {
    expect(clampCardIndex(10, 3)).toBe(2);
    expect(clampCardIndex(-2, 4)).toBe(0);
  });
});
