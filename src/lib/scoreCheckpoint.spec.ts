import { describe, expect, it } from "vitest";

import { scoreCheckpoint, TEST_QUESTION_COUNT, TEST_TOPIC_RULE_COUNT } from "@/lib/test-mode";

function checkpointAnswers(
  topicCorrectCount: number,
  distractorCorrectCount: number,
  timeouts?: boolean[],
): { correct: boolean; timedOut: boolean }[] {
  const out: { correct: boolean; timedOut: boolean }[] = [];
  for (let i = 0; i < TEST_TOPIC_RULE_COUNT; i += 1) {
    out.push({ correct: i < topicCorrectCount, timedOut: timeouts?.[i] ?? false });
  }
  for (let i = 0; i < TEST_QUESTION_COUNT - TEST_TOPIC_RULE_COUNT; i += 1) {
    out.push({
      correct: i < distractorCorrectCount,
      timedOut: timeouts?.[TEST_TOPIC_RULE_COUNT + i] ?? false,
    });
  }
  return out;
}

describe("scoreCheckpoint", () => {
  it("computes topicAccuracy, overallAccuracy, timeoutCount, passed", () => {
    const answers = checkpointAnswers(8, 3, Array(TEST_QUESTION_COUNT).fill(false));
    const r = scoreCheckpoint({ answers });
    expect(r.topicAccuracy).toBe(0.8);
    expect(r.overallCorrect).toBe(11);
    expect(r.overallAccuracy).toBeCloseTo(11 / 15, 5);
    expect(r.timeoutCount).toBe(0);
    expect(r.passed).toBe(true);
  });

  it("counts timeouts", () => {
    const timeouts = Array(TEST_QUESTION_COUNT).fill(false);
    timeouts[0] = true;
    timeouts[12] = true;
    const answers = checkpointAnswers(8, 3, timeouts);
    const r = scoreCheckpoint({ answers });
    expect(r.timeoutCount).toBe(2);
  });

  it("fails when topic band passes but overall does not", () => {
    const answers = checkpointAnswers(10, 0);
    const r = scoreCheckpoint({ answers });
    expect(r.topicAccuracy).toBe(1);
    expect(r.overallAccuracy).toBeCloseTo(10 / 15, 5);
    expect(r.passed).toBe(false);
  });

  it("throws when answer length is not TEST_QUESTION_COUNT", () => {
    expect(() => scoreCheckpoint({ answers: [] })).toThrow();
  });
});
