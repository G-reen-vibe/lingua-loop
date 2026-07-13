// ===== Core lesson / word types =====

export interface Sentence {
  exert: string;
  translation: string;
}

export interface Word {
  word: string;
  definition?: string;
  synonym?: string; // prefixed with "="
  translation: string;
  explanation?: string;
  alt1?: string;
  alt2?: string;
  alt3?: string;
  sentences?: Sentence[];
}

// All "aspects" of a word — the word itself counts as an aspect.
export type AspectKey =
  | "word"
  | "definition"
  | "synonym"
  | "translation"
  | "explanation"
  | "alt1"
  | "alt2"
  | "alt3";

export const ALL_ASPECT_KEYS: AspectKey[] = [
  "word",
  "definition",
  "synonym",
  "translation",
  "explanation",
  "alt1",
  "alt2",
  "alt3",
];

// Aspects that are long-form and should not be used as "the other side"
// of certain matching/pair formats because they wouldn't fit on screen.
export const LONG_ASPECT_KEYS: AspectKey[] = ["definition", "explanation"];

// ===== Review / progress types =====

export interface ReviewRecord {
  ts: number;
  format: FormatKind;
  correct: boolean;
  mode: StudyMode;
  wordIndex: number;
  lessonId: string;
}

export interface SM2State {
  ease: number; // ease factor
  interval: number; // days
  reps: number; // consecutive correct
  due: number; // timestamp (ms)
  lastReviewed: number; // timestamp (ms)
}

export interface FSRSState {
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  due: number; // timestamp (ms)
  lastReviewed: number; // timestamp (ms)
}

export interface WordProgress {
  wordIndex: number;
  mastery: number; // 0..5
  seen: boolean;
  correct: number;
  incorrect: number;
  streakAtLevel: number; // consecutive correct at current mastery level
  // algorithm state — both kept in sync so user can switch
  sm2: SM2State;
  fsrs: FSRSState;
  history: ReviewRecord[];
}

export type AlgorithmKind = "sm2" | "fsrs";

export interface LessonSettings {
  algorithm: AlgorithmKind;
  maxNewWordsDaily: number;
  minMasteryForNewWords: number; // 0..4
}

export interface Lesson {
  id: string;
  name: string;
  words: Word[];
  progress: WordProgress[];
  history: ReviewRecord[];
  settings: LessonSettings;
  createdAt: number;
  // daily counters
  newWordsSeenToday: number;
  newWordsDate: string; // YYYY-MM-DD
}

export interface UserData {
  version: string;
  lessons: Lesson[];
  exportedAt?: number;
}

// ===== Study modes & formats =====

export type StudyMode = "daily" | "lesson" | "rush";

export type FormatKind =
  | "introduction"
  | "pick-answer"
  | "spot-lie"
  | "match-pairs"
  | "word-scramble"
  | "fill-gap"
  | "sentence-comprehension"
  | "shell-game"
  | "memory-grid";

export const FORMAT_DIFFICULTY: Record<FormatKind, number> = {
  introduction: 0,
  "pick-answer": 1,
  "spot-lie": 1,
  "match-pairs": 2,
  "word-scramble": 2,
  "fill-gap": 3,
  "sentence-comprehension": 3,
  "shell-game": 4,
  "memory-grid": 4,
};

// Mastery thresholds.
// A word with mastery M is eligible for formats with difficulty <= M.
// Introduction (diff 0) is only served once, when mastery is 0.
export const MAX_MASTERY = 5;

// Number of consecutive correct answers at the current mastery level
// required to advance to the next mastery level.
export const MASTERY_LEVELUP_STREAK = 2;
