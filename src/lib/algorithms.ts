import { SM2State, FSRSState } from "../types";

// ===== SM-2 Algorithm =====
// quality: 0 (complete fail) .. 5 (perfect)
// quality >= 3 is considered "correct"

export function sm2Update(state: SM2State, quality: number): SM2State {
  let { ease, interval, reps } = state;
  const now = Date.now();

  if (quality >= 3) {
    if (reps === 0) {
      interval = 1;
    } else if (reps === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * ease);
    }
    reps += 1;
  } else {
    reps = 0;
    interval = 1;
  }

  ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ease < 1.3) ease = 1.3;

  const due = now + interval * 24 * 60 * 60 * 1000;
  return { ease, interval, reps, due, lastReviewed: now };
}

export function sm2IsDue(state: SM2State, now: number = Date.now()): boolean {
  return state.due <= now;
}

// ===== FSRS Algorithm =====
// FSRS-4-style implementation with 17 default weights.
// rating: 1 (again), 2 (hard), 3 (good), 4 (easy)
// rating >= 3 is considered "correct"

const FSRS_DECAY = 9.0;
const FSRS_FACTOR = Math.pow(0.9, 1 / FSRS_DECAY) - 1; // ≈ -0.0116
const FSRS_REQUEST_RETENTION = 0.9;

// FSRS-4 default weights (17 values).
const FSRS_W = [
  0.4, 0.6, 2.4, 5.8,   // w[0..3]: initial stability for ratings 1..4
  4.93, 0.94, 0.86, 0.01, // w[4..7]: initial difficulty, difficulty delta, stability constants
  1.49, 0.14, 0.94, 2.18, // w[8..11]: stability formula constants
  0.05, 0.34, 1.26, 0.29, 2.61, // w[12..16]: lapse stability, hard penalty, easy bonus
];

function fsrsInitDifficulty(rating: number): number {
  const d = FSRS_W[4] - FSRS_W[5] * (rating - 3);
  return Math.min(10, Math.max(1, d));
}

function fsrsInitStability(rating: number): number {
  return Math.max(0.1, FSRS_W[rating - 1]);
}

function fsrsNextDifficulty(d: number, rating: number): number {
  const newD = d - FSRS_W[5] * (rating - 3);
  return Math.min(10, Math.max(1, newD));
}

function fsrsNextStability(d: number, s: number, r: number, rating: number): number {
  if (rating === 1) {
    // Lapse: stability decreases.
    const newS =
      FSRS_W[11] *
      Math.pow(d, -FSRS_W[12]) *
      (Math.pow(s + 1, FSRS_W[13]) - 1) *
      Math.exp((1 - r) * FSRS_W[14]);
    return Math.max(0.1, newS);
  }
  // Recall (rating 2, 3, or 4):
  const hardPenalty = rating === 2 ? FSRS_W[15] : 1;
  const easyBonus = rating === 4 ? FSRS_W[16] : 1;
  const newS =
    s *
    (1 +
      Math.exp(FSRS_W[8]) *
        (11 - d) *
        Math.pow(s, -FSRS_W[9]) *
        (Math.exp((1 - r) * FSRS_W[10]) - 1) *
        hardPenalty *
        easyBonus);
  return Math.max(0.1, newS);
}

function fsrsRetrievability(s: number, elapsedDays: number): number {
  if (s <= 0) return 0;
  const base = 1 + (FSRS_FACTOR * elapsedDays) / s;
  if (base <= 0) return 0;
  const r = Math.pow(base, FSRS_DECAY);
  return Math.min(1, Math.max(0, r));
}

export function fsrsUpdate(state: FSRSState, rating: number): FSRSState {
  const now = Date.now();
  let { stability, difficulty, reps, lapses } = state;

  const elapsedDays =
    state.lastReviewed > 0
      ? Math.max(0, (now - state.lastReviewed) / (24 * 60 * 60 * 1000))
      : 0;

  if (reps === 0) {
    stability = fsrsInitStability(rating);
    difficulty = fsrsInitDifficulty(rating);
  } else {
    const r = fsrsRetrievability(stability, elapsedDays);
    difficulty = fsrsNextDifficulty(difficulty, rating);
    if (rating === 1) lapses += 1;
    stability = fsrsNextStability(difficulty, stability, r, rating);
  }

  reps += 1;

  // Compute next interval (days) to maintain target retention.
  const nextInterval =
    (stability / FSRS_FACTOR) *
    (Math.pow(FSRS_REQUEST_RETENTION, 1 / FSRS_DECAY) - 1);
  const due = now + Math.max(1, Math.round(nextInterval)) * 24 * 60 * 60 * 1000;

  return { stability, difficulty, reps, lapses, due, lastReviewed: now };
}

export function fsrsIsDue(state: FSRSState, now: number = Date.now()): boolean {
  return state.due <= now;
}

// Map binary correct/incorrect to algorithm quality/rating.
export function correctToSm2Quality(correct: boolean): number {
  return correct ? 5 : 1;
}

export function correctToFsrsRating(correct: boolean): number {
  return correct ? 3 : 1;
}
