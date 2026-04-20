import { describe, expect, it } from "vitest";

import {
  classifyPracticeItem,
  practiceItemLooksHesitant,
  practiceResolveSeconds,
  summarizeMasteryTiers,
} from "./hesitation";

describe("hesitation", () => {
  it("flags hesitant when hints used on correct solve", () => {
    const state = {
      maxHintLayerSeen: 1,
      hintViews: [{ layer: 1 as const, at: new Date().toISOString() }],
      attempts: [
        {
          choice: "B",
          correct: true,
          hintsAtSubmit: 1,
          answeredAt: new Date().toISOString(),
        },
      ],
      status: "solved" as const,
    };
    const r = classifyPracticeItem({
      state,
      position: 0,
      questionId: 1,
      peerResolveSeconds: [],
    });
    expect(r.tier).toBe("hesitant");
    expect(r.reasons).toContain("hint_used");
  });

  it("flags hesitant on second attempt correct", () => {
    const t0 = new Date().toISOString();
    const t1 = new Date(Date.now() + 2000).toISOString();
    const state = {
      maxHintLayerSeen: 0,
      hintViews: [] as { layer: 1 | 2 | 3; at: string }[],
      attempts: [
        { choice: "A", correct: false, hintsAtSubmit: 0, answeredAt: t0 },
        { choice: "B", correct: true, hintsAtSubmit: 0, answeredAt: t1 },
      ],
      status: "solved" as const,
      firstOpenedAt: t0,
    };
    expect(practiceResolveSeconds(state)).toBeGreaterThan(0);
    const r = classifyPracticeItem({
      state,
      position: 0,
      questionId: 1,
      peerResolveSeconds: [3, 4, 5],
    });
    expect(r.tier).toBe("hesitant");
    expect(practiceItemLooksHesitant(state)).toBe(true);
  });

  it("summarizeMasteryTiers counts buckets", () => {
    const s = summarizeMasteryTiers([
      { position: 0, questionId: 1, tier: "fluent", reasons: [], resolveSec: 1 },
      { position: 1, questionId: 2, tier: "hesitant", reasons: ["hint_used"], resolveSec: 2 },
      { position: 2, questionId: 3, tier: "struggling", reasons: ["timeout_or_wrong"], resolveSec: null },
    ]);
    expect(s).toEqual({ fluent: 1, hesitant: 1, struggling: 1 });
  });
});
