import { describe, expect, test } from "vitest";
import {
  getScoreBucket,
  getScoreClass,
  getScoreLabel,
  SCORE_BUCKETS,
} from "./scoreBuckets";

describe("getScoreBucket", () => {
  test.each([
    [100, "excellent"],
    [90, "excellent"],
    [89, "good"],
    [70, "good"],
    [69, "needs-work"],
    [50, "needs-work"],
    [49, "poor"],
    [0, "poor"],
  ])("scores %i as %s", (score, bucket) => {
    expect(getScoreBucket(score)).toBe(bucket);
  });

  test("rounds nothing — the caller decides", () => {
    // 89.6 is below the 90 boundary. If a view wants it to read "Excellent"
    // it must round before calling, as Results does.
    expect(getScoreBucket(89.6)).toBe("good");
  });
});

describe("getScoreClass", () => {
  test("returns the CSS class for the bucket", () => {
    expect(getScoreClass(95)).toBe("score-excellent");
    expect(getScoreClass(75)).toBe("score-good");
    expect(getScoreClass(55)).toBe("score-needs-work");
    expect(getScoreClass(20)).toBe("score-poor");
  });
});

describe("getScoreLabel", () => {
  test("returns the label for the bucket", () => {
    expect(getScoreLabel(95)).toBe("Excellent");
    expect(getScoreLabel(75)).toBe("Good");
    expect(getScoreLabel(55)).toBe("Needs work");
    expect(getScoreLabel(20)).toBe("Poor");
  });

  // The bug this module exists to prevent: "Needs work" used to mean <50 in
  // Results and 50-69 in SimulationView, so the same words described two
  // different score ranges depending on which screen you were looking at.
  test("gives one label per score, no matter the caller", () => {
    const label = getScoreLabel(55);
    expect(getScoreLabel(55)).toBe(label);
    expect(getScoreLabel(49)).not.toBe(label);
  });

  // Guards the two loop-based tests below from passing vacuously.
  test("SCORE_BUCKETS covers all four buckets", () => {
    expect(SCORE_BUCKETS.map((b) => b.bucket)).toEqual([
      "excellent",
      "good",
      "needs-work",
      "poor",
    ]);
  });

  test("no label is reused across buckets", () => {
    const labels = SCORE_BUCKETS.map((b) => getScoreLabel(b.min));
    expect(new Set(labels).size).toBe(labels.length);
  });

  test("label and class agree on the bucket for every threshold", () => {
    for (const { min, bucket } of SCORE_BUCKETS) {
      expect(getScoreClass(min)).toBe(`score-${bucket}`);
      expect(getScoreBucket(min)).toBe(bucket);
    }
  });
});
