import { Lesson, UserData, WordProgress, Word } from "./types";

const STORAGE_KEY = "lingua-loop-data-v1";

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
  );
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function emptyProgress(wordIndex: number): WordProgress {
  const now = Date.now();
  return {
    wordIndex,
    mastery: 0,
    seen: false,
    correct: 0,
    incorrect: 0,
    streakAtLevel: 0,
    sm2: {
      ease: 2.5,
      interval: 0,
      reps: 0,
      due: now,
      lastReviewed: 0,
    },
    fsrs: {
      stability: 0,
      difficulty: 0,
      reps: 0,
      lapses: 0,
      due: now,
      lastReviewed: 0,
    },
    history: [],
  };
}

export function createLesson(name: string, words: Word[]): Lesson {
  return {
    id: uid(),
    name,
    words,
    progress: words.map((_, i) => emptyProgress(i)),
    history: [],
    settings: {
      algorithm: "sm2",
      maxNewWordsDaily: 10,
      minMasteryForNewWords: 2,
    },
    createdAt: Date.now(),
    newWordsSeenToday: 0,
    newWordsDate: todayStr(),
  };
}

export function loadUserData(): UserData {
  if (typeof window === "undefined") return { version: "1", lessons: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: "1", lessons: [] };
    const data = JSON.parse(raw) as UserData;
    if (!data.lessons) data.lessons = [];
    // Migrate: ensure each lesson has required fields
    for (const lesson of data.lessons) {
      if (!lesson.settings) {
        lesson.settings = {
          algorithm: "sm2",
          maxNewWordsDaily: 10,
          minMasteryForNewWords: 2,
        };
      }
      if (lesson.newWordsDate !== todayStr()) {
        lesson.newWordsSeenToday = 0;
        lesson.newWordsDate = todayStr();
      }
      if (!lesson.progress) {
        lesson.progress = lesson.words.map((_, i) => emptyProgress(i));
      }
    }
    return data;
  } catch {
    return { version: "1", lessons: [] };
  }
}

export function saveUserData(data: UserData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save user data", e);
  }
}

export function exportUserData(): string {
  const data = loadUserData();
  data.exportedAt = Date.now();
  return JSON.stringify(data, null, 2);
}

export function importUserData(json: string): UserData {
  const parsed = JSON.parse(json) as UserData;
  if (!parsed.lessons) throw new Error("Invalid user data: missing lessons");
  // Validate & migrate
  for (const lesson of parsed.lessons) {
    if (!lesson.words || !Array.isArray(lesson.words))
      throw new Error("Invalid lesson: missing words");
    if (!lesson.progress) {
      lesson.progress = lesson.words.map((_, i) => emptyProgress(i));
    }
    if (!lesson.settings) {
      lesson.settings = {
        algorithm: "sm2",
        maxNewWordsDaily: 10,
        minMasteryForNewWords: 2,
      };
    }
    if (!lesson.history) lesson.history = [];
  }
  saveUserData(parsed);
  return parsed;
}
