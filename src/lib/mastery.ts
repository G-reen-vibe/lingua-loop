import {
  FormatKind,
  FORMAT_DIFFICULTY,
  Lesson,
  WordProgress,
  MASTERY_LEVELUP_STREAK,
  MAX_MASTERY,
  StudyMode,
  AlgorithmKind,
} from "./types";
import { sm2IsDue, fsrsIsDue } from "./algorithms";

// ===== Aspect helpers =====

import { Word, AspectKey, ALL_ASPECT_KEYS, LONG_ASPECT_KEYS } from "./types";

export function getAspect(word: Word, key: AspectKey): string | undefined {
  switch (key) {
    case "word":
      return word.word;
    case "definition":
      return word.definition;
    case "synonym":
      return word.synonym;
    case "translation":
      return word.translation;
    case "explanation":
      return word.explanation;
    case "alt1":
      return word.alt1;
    case "alt2":
      return word.alt2;
    case "alt3":
      return word.alt3;
  }
}

// Returns the synonym without the "=" prefix.
export function cleanSynonym(s: string | undefined): string | undefined {
  if (!s) return undefined;
  return s.startsWith("=") ? s.slice(1) : s;
}

// Returns all available aspects (cleaned) for a word.
export function availableAspects(word: Word): { key: AspectKey; value: string }[] {
  const out: { key: AspectKey; value: string }[] = [];
  for (const key of ALL_ASPECT_KEYS) {
    let v = getAspect(word, key);
    if (key === "synonym") v = cleanSynonym(v);
    if (v && v.trim().length > 0) out.push({ key, value: v });
  }
  return out;
}

// Returns the "word forms" — the word itself plus any alts.
export function wordForms(word: Word): string[] {
  const forms = [word.word];
  if (word.alt1) forms.push(word.alt1);
  if (word.alt2) forms.push(word.alt2);
  if (word.alt3) forms.push(word.alt3);
  return forms;
}

// Returns all aspects excluding long-form (definition/explanation).
export function shortAspects(word: Word): { key: AspectKey; value: string }[] {
  return availableAspects(word).filter((a) => !LONG_ASPECT_KEYS.includes(a.key));
}

// ===== Mastery progression =====

export function recordReview(
  progress: WordProgress,
  correct: boolean,
  format: FormatKind
): WordProgress {
  const next = { ...progress };
  next.correct = progress.correct + (correct ? 1 : 0);
  next.incorrect = progress.incorrect + (correct ? 0 : 1);
  next.seen = true;

  const formatDiff = FORMAT_DIFFICULTY[format];

  // Only update mastery/streak when reviewing at the current level.
  // Mastery = highest difficulty level the user can handle + 1.
  // Format difficulty D can be served when mastery >= D.
  // So if format diff == mastery, advancing is possible.
  if (correct) {
    // Introduction always moves mastery 0 -> 1
    if (format === "introduction" && next.mastery === 0) {
      next.mastery = 1;
      next.streakAtLevel = 0;
    } else if (formatDiff === next.mastery && next.mastery < MAX_MASTERY) {
      next.streakAtLevel = progress.streakAtLevel + 1;
      if (next.streakAtLevel >= MASTERY_LEVELUP_STREAK) {
        next.mastery = next.mastery + 1;
        next.streakAtLevel = 0;
      }
    } else if (formatDiff < next.mastery) {
      // reviewing below level — keep streak, no level up
      // reset streak at level since they're not challenging current level
      // (we keep it as-is to avoid penalizing mixed reviews)
    }
  } else {
    // Incorrect answer resets the streak at the current level.
    next.streakAtLevel = 0;
    // For formats below the word's mastery, do not drop mastery.
    // We only reset streak; mastery only drops on repeated failure at current level.
    // (Keeping it simple: mastery never decreases in this app.)
  }

  return next;
}

// ===== Word eligibility =====

// A word is "due" if its algorithm says it's due, OR it has never been seen.
export function isWordDue(
  progress: WordProgress,
  algorithm: AlgorithmKind,
  now: number = Date.now()
): boolean {
  if (!progress.seen) return true;
  if (algorithm === "sm2") return sm2IsDue(progress.sm2, now);
  return fsrsIsDue(progress.fsrs, now);
}

// Words eligible for introduction: never seen, and the daily new-word budget allows.
export function wordsForIntroduction(
  lesson: Lesson
): WordProgress[] {
  if (lesson.newWordsDate !== todayStrLocal()) {
    lesson.newWordsSeenToday = 0;
    lesson.newWordsDate = todayStrLocal();
  }
  const budget = lesson.settings.maxNewWordsDaily - lesson.newWordsSeenToday;
  if (budget <= 0) return [];
  const neverSeen = lesson.progress.filter((p) => !p.seen);
  // Also require that existing words meet the min-mastery threshold before
  // introducing new ones.
  if (lesson.settings.minMasteryForNewWords > 0) {
    const seen = lesson.progress.filter((p) => p.seen);
    if (seen.length > 0) {
      const avgMastery =
        seen.reduce((s, p) => s + p.mastery, 0) / seen.length;
      if (avgMastery < lesson.settings.minMasteryForNewWords) {
        return [];
      }
    }
  }
  return neverSeen.slice(0, budget);
}

function todayStrLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// Returns words that are due for review (already seen).
export function dueWords(
  lesson: Lesson,
  now: number = Date.now()
): WordProgress[] {
  return lesson.progress.filter(
    (p) => p.seen && isWordDue(p, lesson.settings.algorithm, now)
  );
}

// Returns words eligible for a given format based on mastery.
// NOTE: We do NOT check isWordDue here. Within a study session, any seen word
// whose mastery matches the format's difficulty is eligible. The algorithm's
// due date is used for cross-session scheduling (which words to prioritize at
// the start of a session), not for excluding words mid-session.
export function wordsEligibleForFormat(
  lesson: Lesson,
  format: FormatKind,
  now: number = Date.now()
): WordProgress[] {
  const diff = FORMAT_DIFFICULTY[format];
  if (format === "introduction") {
    return wordsForIntroduction(lesson);
  }
  // Format difficulty D requires word mastery >= D.
  return lesson.progress.filter(
    (p) =>
      p.seen &&
      p.mastery >= diff
  );
}

// ===== Format selection =====

// All formats by difficulty.
const FORMATS_BY_DIFFICULTY: Record<number, FormatKind[]> = {
  0: ["introduction"],
  1: ["pick-answer", "spot-lie"],
  2: ["match-pairs", "word-scramble"],
  3: ["fill-gap", "sentence-comprehension"],
  4: ["shell-game", "memory-grid"],
};

export function allFormatKinds(): FormatKind[] {
  return [
    "introduction",
    "pick-answer",
    "spot-lie",
    "match-pairs",
    "word-scramble",
    "fill-gap",
    "sentence-comprehension",
    "shell-game",
    "memory-grid",
  ];
}

// Picks the next format to serve. Returns null if no format is available.
// Strategy:
//  - If there are never-seen words available (within daily budget), serve Introduction first.
//  - Otherwise, prefer formats at the user's current mastery frontier.
//  - Then fall back to lower-difficulty formats if no frontier format is available.
export function pickNextFormat(
  lesson: Lesson,
  recentFormats: FormatKind[],
  now: number = Date.now()
): FormatKind | null {
  const alg = lesson.settings.algorithm;

  // 1. Introduction — always first priority if there are never-seen words.
  const introWords = wordsForIntroduction(lesson);
  if (introWords.length > 0 && !recentFormats.includes("introduction")) {
    return "introduction";
  }

  // 2. Build a list of eligible formats.
  const eligible: FormatKind[] = [];
  for (const format of allFormatKinds()) {
    if (format === "introduction") continue;
    const words = wordsEligibleForFormat(lesson, format, now);
    if (words.length > 0) eligible.push(format);
  }

  if (eligible.length === 0) {
    // No due words at any difficulty — fall back to any seen word at the
    // lowest difficulty if possible (so the session isn't stuck).
    return null;
  }

  // 3. Prefer formats we haven't served recently (variety).
  // Compute a score: prefer higher difficulty, then less recently used.
  const diffOf = (f: FormatKind) => FORMAT_DIFFICULTY[f];
  const recentIdx = (f: FormatKind) => {
    const i = recentFormats.lastIndexOf(f);
    return i === -1 ? Infinity : recentFormats.length - i;
  };

  // Prefer formats closer to the user's average mastery (frontier),
  // and avoid repeating the most recent format.
  const seenProgress = lesson.progress.filter((p) => p.seen);
  const avgMastery =
    seenProgress.length > 0
      ? seenProgress.reduce((s, p) => s + p.mastery, 0) / seenProgress.length
      : 0;

  const targetDiff = Math.max(1, Math.min(4, Math.round(avgMastery)));

  eligible.sort((a, b) => {
    // Avoid repeating the most recent format at all costs.
    const aRecent = recentFormats[recentFormats.length - 1] === a ? 1 : 0;
    const bRecent = recentFormats[recentFormats.length - 1] === b ? 1 : 0;
    if (aRecent !== bRecent) return aRecent - bRecent;
    // Prefer formats closer to target difficulty.
    const aDist = Math.abs(diffOf(a) - targetDiff);
    const bDist = Math.abs(diffOf(b) - targetDiff);
    if (aDist !== bDist) return aDist - bDist;
    // Then prefer less-recently-used.
    return recentIdx(b) - recentIdx(a);
  });

  return eligible[0];
}

// ===== Session sizing =====

export function sessionGoal(mode: StudyMode): number {
  switch (mode) {
    case "daily":
      return 30;
    case "lesson":
      return 100;
    case "rush":
      return 999; // rush is timed; effectively unlimited questions
  }
}

export function sessionTimeLimitMs(mode: StudyMode): number {
  return mode === "rush" ? 5 * 60 * 1000 : 0;
}

export function sessionLives(mode: StudyMode): number {
  return mode === "rush" ? 3 : 0;
}
