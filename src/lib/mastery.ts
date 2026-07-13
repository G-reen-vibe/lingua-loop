import {
  FormatKind,
  FORMAT_DIFFICULTY,
  Lesson,
  WordProgress,
  MASTERY_LEVELUP_STREAK,
  MAX_MASTERY,
  StudyMode,
  AlgorithmKind,
  Word,
  AspectKey,
  ALL_ASPECT_KEYS,
  LONG_ASPECT_KEYS,
} from "./types";
import { sm2IsDue, fsrsIsDue } from "./algorithms";

// ===== Aspect helpers =====

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
    }
    // For formats below current mastery, don't change streak (reviewing easier material).
  } else {
    // Incorrect answer: only reset streak if the failure was AT the current level.
    // Failures on below-level formats don't reset the at-level streak.
    if (formatDiff >= next.mastery) {
      next.streakAtLevel = 0;
    }
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

// Pure function: returns the count of new words seen today (resets on date change).
export function getNewWordsSeenToday(lesson: Lesson): number {
  if (lesson.newWordsDate !== todayStrLocal()) {
    return 0;
  }
  return lesson.newWordsSeenToday;
}

export function wordsForIntroduction(lesson: Lesson): WordProgress[] {
  const seenToday = getNewWordsSeenToday(lesson);
  const budget = lesson.settings.maxNewWordsDaily - seenToday;
  if (budget <= 0) return [];
  const neverSeen = lesson.progress.filter((p) => !p.seen);
  if (lesson.settings.minMasteryForNewWords > 0) {
    const seen = lesson.progress.filter((p) => p.seen);
    if (seen.length > 0) {
      const avgMastery = seen.reduce((s, p) => s + p.mastery, 0) / seen.length;
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
// Within a study session, any seen word whose mastery >= format's difficulty
// is eligible. The algorithm's due date is for cross-session scheduling only.
export function wordsEligibleForFormat(
  lesson: Lesson,
  format: FormatKind
): WordProgress[] {
  const diff = FORMAT_DIFFICULTY[format];
  if (format === "introduction") {
    return wordsForIntroduction(lesson);
  }
  return lesson.progress.filter((p) => p.seen && p.mastery >= diff);
}

// ===== Format selection =====

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
export function pickNextFormat(
  lesson: Lesson,
  recentFormats: FormatKind[]
): FormatKind | null {
  // 1. Introduction — serve for never-seen words, but not twice in a row.
  const introWords = wordsForIntroduction(lesson);
  const lastFormat = recentFormats[recentFormats.length - 1];
  if (introWords.length > 0 && lastFormat !== "introduction") {
    return "introduction";
  }

  // 2. Build a list of eligible formats.
  const eligible: FormatKind[] = [];
  for (const format of allFormatKinds()) {
    if (format === "introduction") continue;
    const words = wordsEligibleForFormat(lesson, format);
    if (words.length > 0) eligible.push(format);
  }

  if (eligible.length === 0) return null;

  // 3. Score & sort.
  const diffOf = (f: FormatKind) => FORMAT_DIFFICULTY[f];
  const recentIdx = (f: FormatKind) => {
    const i = recentFormats.lastIndexOf(f);
    return i === -1 ? Infinity : recentFormats.length - i;
  };

  const seenProgress = lesson.progress.filter((p) => p.seen);
  const avgMastery =
    seenProgress.length > 0
      ? seenProgress.reduce((s, p) => s + p.mastery, 0) / seenProgress.length
      : 0;
  const targetDiff = Math.max(1, Math.min(4, Math.round(avgMastery)));

  // Match-pairs: don't serve twice in a row, and cool down for 5 questions.
  const filteredEligible = eligible.filter((f) => {
    if (f !== "match-pairs") return true;
    if (lastFormat === "match-pairs") return false;
    const lastMP = recentFormats.lastIndexOf("match-pairs");
    if (lastMP !== -1 && recentFormats.length - lastMP < 5) return false;
    return true;
  });

  const pool = filteredEligible.length > 0 ? filteredEligible : eligible;

  pool.sort((a, b) => {
    // Avoid repeating the most recent format.
    const aRecent = lastFormat === a ? 1 : 0;
    const bRecent = lastFormat === b ? 1 : 0;
    if (aRecent !== bRecent) return aRecent - bRecent;
    // Prefer formats closer to target difficulty.
    const aDist = Math.abs(diffOf(a) - targetDiff);
    const bDist = Math.abs(diffOf(b) - targetDiff);
    if (aDist !== bDist) return aDist - bDist;
    // Then prefer less-recently-used.
    return recentIdx(b) - recentIdx(a);
  });

  return pool[0];
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

export function sessionLives(mode: StudyMode): number {
  return mode === "rush" ? 3 : 0;
}
