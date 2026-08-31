/**
 * Score buckets for a graded answer or a session percentage: 90 / 70 / 50.
 *
 * Deliberately **not** the bank-mastery scale in `mastery.ts`, which buckets at
 * 80 / 60 / 40 and answers a different question ("how well do you know this
 * bank?" rather than "how did this answer score?"). Keep the two apart.
 *
 * `Results.tsx` and `SimulationView.tsx` each had their own copy of this, and
 * the labels drifted: "Needs work" meant below 50 in one and 50-69 in the
 * other, so the same words described different scores depending on the screen.
 * The label and the CSS class are derived from one bucket here so they cannot
 * disagree again.
 */
export type ScoreBucket = "excellent" | "good" | "needs-work" | "poor";

/** Buckets in descending order — the first whose `min` a score meets wins. */
export const SCORE_BUCKETS: ReadonlyArray<{
  min: number;
  bucket: ScoreBucket;
  label: string;
}> = [
  { min: 90, bucket: "excellent", label: "Excellent" },
  { min: 70, bucket: "good", label: "Good" },
  { min: 50, bucket: "needs-work", label: "Needs work" },
  { min: 0, bucket: "poor", label: "Poor" },
];

function bucketFor(score: number) {
  // The last entry has min 0, so this always matches for a non-negative score;
  // the ?? keeps a negative score from blowing up.
  return SCORE_BUCKETS.find((b) => score >= b.min) ?? SCORE_BUCKETS[3];
}

export function getScoreBucket(score: number): ScoreBucket {
  return bucketFor(score).bucket;
}

/** CSS class for the score pill, e.g. `score-good`. */
export function getScoreClass(score: number): string {
  return `score-${getScoreBucket(score)}`;
}

/** Short human label for the score, e.g. `Good`. */
export function getScoreLabel(score: number): string {
  return bucketFor(score).label;
}
