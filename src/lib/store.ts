"use client";

import { create } from "zustand";
import {
  Lesson,
  UserData,
  Word,
  StudyMode,
  FormatKind,
  ReviewRecord,
} from "./types";
import {
  loadUserData,
  saveUserData,
  createLesson as createLessonFn,
  importUserData as importUserDataFn,
  exportUserData as exportUserDataFn,
  todayStr,
} from "./storage";
import { recordReview, pickNextFormat, sessionGoal } from "./mastery";
import { sm2Update, fsrsUpdate, correctToSm2Quality, correctToFsrsRating } from "./algorithms";

export type AppView =
  | { kind: "home" }
  | { kind: "lesson"; lessonId: string }
  | { kind: "study"; lessonId: string; mode: StudyMode };

interface SessionStats {
  questionsServed: number;
  correct: number;
  incorrect: number;
  lives: number;
  endAt: number;
  recentFormats: FormatKind[];
}

interface AppState {
  data: UserData;
  view: AppView;
  // session
  session: SessionStats | null;
  // actions
  init: () => void;
  setView: (v: AppView) => void;
  addLesson: (name: string, words: Word[]) => void;
  deleteLesson: (id: string) => void;
  resetLessonProgress: (id: string) => void;
  updateLessonSettings: (id: string, settings: Partial<Lesson["settings"]>) => void;
  exportData: () => string;
  importData: (json: string) => void;
  startSession: (lessonId: string, mode: StudyMode) => void;
  endSession: () => void;
  recordAnswer: (
    lessonId: string,
    wordIndex: number,
    format: FormatKind,
    correct: boolean,
    allWordIndices?: number[]
  ) => { done: boolean; goal: number; served: number };
  pickSessionFormat: (lessonId: string) => FormatKind | null;
}

function persist(data: UserData) {
  saveUserData(data);
}

function withUpdatedLesson(data: UserData, lessonId: string, updater: (lesson: Lesson) => Lesson): UserData {
  const idx = data.lessons.findIndex((l) => l.id === lessonId);
  if (idx === -1) return data;
  const newLessons = [...data.lessons];
  newLessons[idx] = updater(data.lessons[idx]);
  return { ...data, lessons: newLessons };
}

export const useAppStore = create<AppState>((set, get) => ({
  data: { version: "1", lessons: [] },
  view: { kind: "home" },
  session: null,

  init: () => {
    const data = loadUserData();
    set({ data });
  },

  setView: (v) => set({ view: v }),

  addLesson: (name, words) => {
    const lesson = createLessonFn(name, words);
    const data = { ...get().data, lessons: [...get().data.lessons, lesson] };
    persist(data);
    set({ data });
  },

  deleteLesson: (id) => {
    const data = {
      ...get().data,
      lessons: get().data.lessons.filter((l) => l.id !== id),
    };
    persist(data);
    set({ data, view: { kind: "home" } });
  },

  resetLessonProgress: (id) => {
    const data = withUpdatedLesson(get().data, id, (lesson) => ({
      ...lesson,
      progress: lesson.words.map((_, i) => ({
        wordIndex: i,
        mastery: 0,
        seen: false,
        correct: 0,
        incorrect: 0,
        streakAtLevel: 0,
        sm2: { ease: 2.5, interval: 0, reps: 0, due: Date.now(), lastReviewed: 0 },
        fsrs: { stability: 0, difficulty: 0, reps: 0, lapses: 0, due: Date.now(), lastReviewed: 0 },
        history: [],
      })),
      history: [],
      newWordsSeenToday: 0,
      newWordsDate: todayStr(),
    }));
    persist(data);
    set({ data });
  },

  updateLessonSettings: (id, settings) => {
    const data = withUpdatedLesson(get().data, id, (lesson) => ({
      ...lesson,
      settings: { ...lesson.settings, ...settings },
    }));
    persist(data);
    set({ data });
  },

  exportData: () => exportUserDataFn(),
  importData: (json) => {
    const data = importUserDataFn(json);
    set({ data, view: { kind: "home" } });
  },

  startSession: (lessonId, mode) => {
    set({
      session: {
        questionsServed: 0,
        correct: 0,
        incorrect: 0,
        lives: mode === "rush" ? 3 : 0,
        endAt: mode === "rush" ? Date.now() + 5 * 60 * 1000 : 0,
        recentFormats: [],
      },
      view: { kind: "study", lessonId, mode },
    });
  },

  endSession: () => {
    set({ session: null });
  },

  pickSessionFormat: (lessonId) => {
    const data = get().data;
    const lesson = data.lessons.find((l) => l.id === lessonId);
    if (!lesson) return null;
    return pickNextFormat(lesson, get().session?.recentFormats ?? []);
  },

  recordAnswer: (lessonId, wordIndex, format, correct, allWordIndices) => {
    const oldData = get().data;
    const oldSession = get().session;
    if (!oldSession) return { done: true, goal: 0, served: 0 };

    // Determine which word indices to update. For match-pairs, update ALL pairs.
    const indicesToUpdate = allWordIndices && allWordIndices.length > 0
      ? allWordIndices
      : [wordIndex];

    const now = Date.now();

    const newData = withUpdatedLesson(oldData, lessonId, (lesson) => {
      // Deep-clone progress array entries we'll modify.
      const newProgress = [...lesson.progress];
      for (const idx of indicesToUpdate) {
        const oldProgress = newProgress[idx];
        if (!oldProgress) continue;
        const newProgressEntry = recordReview(oldProgress, correct, format);
        if (correct) {
          newProgressEntry.sm2 = sm2Update(oldProgress.sm2, correctToSm2Quality(true));
          newProgressEntry.fsrs = fsrsUpdate(oldProgress.fsrs, correctToFsrsRating(true));
        } else {
          newProgressEntry.sm2 = sm2Update(oldProgress.sm2, correctToSm2Quality(false));
          newProgressEntry.fsrs = fsrsUpdate(oldProgress.fsrs, correctToFsrsRating(false));
        }
        newProgress[idx] = newProgressEntry;
      }

      const record: ReviewRecord = {
        ts: now,
        format,
        correct,
        mode: oldSession ? (get().view as { mode: StudyMode }).mode : "daily",
        wordIndex,
        lessonId,
      };

      // Update daily new-word counter.
      let newWordsSeenToday = lesson.newWordsSeenToday;
      let newWordsDate = lesson.newWordsDate;
      if (format === "introduction" && indicesToUpdate.some((idx) => !lesson.progress[idx]?.seen)) {
        if (newWordsDate !== todayStr()) {
          newWordsSeenToday = 0;
          newWordsDate = todayStr();
        }
        newWordsSeenToday += 1;
      }

      return {
        ...lesson,
        progress: newProgress,
        history: [...lesson.history, record],
        newWordsSeenToday,
        newWordsDate,
      };
    });

    persist(newData);

    // Update session state.
    const served = oldSession.questionsServed + 1;
    const sessCorrect = oldSession.correct + (correct ? 1 : 0);
    const sessIncorrect = oldSession.incorrect + (correct ? 0 : 1);
    const lives = oldSession.lives - (correct ? 0 : 1);
    const recent = [...oldSession.recentFormats, format].slice(-8);

    const mode = (get().view as { mode: StudyMode }).mode;
    const goal = sessionGoal(mode);
    const done =
      served >= goal ||
      (mode === "rush" && lives <= 0) ||
      (mode === "rush" && Date.now() >= oldSession.endAt);

    set({
      data: newData,
      session: {
        ...oldSession,
        questionsServed: served,
        correct: sessCorrect,
        incorrect: sessIncorrect,
        lives,
        recentFormats: recent,
      },
    });

    return { done, goal, served };
  },
}));
