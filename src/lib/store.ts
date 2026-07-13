"use client";

import { create } from "zustand";
import {
  Lesson,
  UserData,
  Word,
  StudyMode,
  FormatKind,
  ReviewRecord,
  WordProgress,
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

interface AppState {
  data: UserData;
  view: AppView;
  // session
  sessionQuestionsServed: number;
  sessionCorrect: number;
  sessionIncorrect: number;
  sessionLives: number;
  sessionStart: number;
  sessionEndAt: number;
  sessionRecentFormats: FormatKind[];
  sessionRecords: ReviewRecord[];
  sessionActive: boolean;
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

export const useAppStore = create<AppState>((set, get) => ({
  data: { version: "1", lessons: [] },
  view: { kind: "home" },
  sessionQuestionsServed: 0,
  sessionCorrect: 0,
  sessionIncorrect: 0,
  sessionLives: 0,
  sessionStart: 0,
  sessionEndAt: 0,
  sessionRecentFormats: [],
  sessionRecords: [],
  sessionActive: false,

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
    const data = { ...get().data };
    const lesson = data.lessons.find((l) => l.id === id);
    if (!lesson) return;
    lesson.progress = lesson.words.map((_, i) => ({
      wordIndex: i,
      mastery: 0,
      seen: false,
      correct: 0,
      incorrect: 0,
      streakAtLevel: 0,
      sm2: { ease: 2.5, interval: 0, reps: 0, due: Date.now(), lastReviewed: 0 },
      fsrs: { stability: 0, difficulty: 0, reps: 0, lapses: 0, due: Date.now(), lastReviewed: 0 },
      history: [],
    }));
    lesson.history = [];
    lesson.newWordsSeenToday = 0;
    lesson.newWordsDate = todayStr();
    persist(data);
    set({ data });
  },

  updateLessonSettings: (id, settings) => {
    const data = { ...get().data };
    const lesson = data.lessons.find((l) => l.id === id);
    if (!lesson) return;
    lesson.settings = { ...lesson.settings, ...settings };
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
      sessionQuestionsServed: 0,
      sessionCorrect: 0,
      sessionIncorrect: 0,
      sessionLives: mode === "rush" ? 3 : 0,
      sessionStart: Date.now(),
      sessionEndAt: mode === "rush" ? Date.now() + 5 * 60 * 1000 : 0,
      sessionRecentFormats: [],
      sessionRecords: [],
      sessionActive: true,
      view: { kind: "study", lessonId, mode },
    });
  },

  endSession: () => {
    set({
      sessionActive: false,
      sessionQuestionsServed: 0,
      sessionCorrect: 0,
      sessionIncorrect: 0,
      sessionLives: 0,
      sessionRecentFormats: [],
      sessionRecords: [],
    });
  },

  pickSessionFormat: (lessonId) => {
    const data = get().data;
    const lesson = data.lessons.find((l) => l.id === lessonId);
    if (!lesson) return null;
    return pickNextFormat(lesson, get().sessionRecentFormats);
  },

  recordAnswer: (lessonId, wordIndex, format, correct, allWordIndices) => {
    const oldData = get().data;
    const lessonIdx = oldData.lessons.findIndex((l) => l.id === lessonId);
    if (lessonIdx === -1) return { done: true, goal: 0, served: 0 };
    const lesson = oldData.lessons[lessonIdx];

    // Determine which word indices to update. For match-pairs, update ALL pairs.
    const indicesToUpdate = allWordIndices && allWordIndices.length > 0
      ? allWordIndices
      : [wordIndex];

    // Deep-clone the lesson to avoid mutating shared references.
    const newLesson: Lesson = JSON.parse(JSON.stringify(lesson));
    const now = Date.now();

    // Update each word's progress.
    for (const idx of indicesToUpdate) {
      const oldProgress = newLesson.progress[idx];
      if (!oldProgress) continue;
      const newProgress = recordReview(oldProgress, correct, format);
      if (correct) {
        newProgress.sm2 = sm2Update(oldProgress.sm2, correctToSm2Quality(true));
        newProgress.fsrs = fsrsUpdate(oldProgress.fsrs, correctToFsrsRating(true));
      } else {
        newProgress.sm2 = sm2Update(oldProgress.sm2, correctToSm2Quality(false));
        newProgress.fsrs = fsrsUpdate(oldProgress.fsrs, correctToFsrsRating(false));
      }
      if (format === "introduction" && !oldProgress.seen) {
        if (newLesson.newWordsDate !== todayStr()) {
          newLesson.newWordsSeenToday = 0;
          newLesson.newWordsDate = todayStr();
        }
        newLesson.newWordsSeenToday += 1;
      }
      newLesson.progress[idx] = newProgress;
    }

    // Record history (one record for the primary word).
    const mode = get().view.kind === "study" ? (get().view as { mode: StudyMode }).mode : "daily";
    const record: ReviewRecord = {
      ts: now,
      format,
      correct,
      mode,
      wordIndex,
      lessonId,
    };
    newLesson.history.push(record);

    // Build new data immutably.
    const newLessons = [...oldData.lessons];
    newLessons[lessonIdx] = newLesson;
    const newData = { ...oldData, lessons: newLessons };
    persist(newData);

    // Update session state.
    const served = get().sessionQuestionsServed + 1;
    const sessCorrect = get().sessionCorrect + (correct ? 1 : 0);
    const sessIncorrect = get().sessionIncorrect + (correct ? 0 : 1);
    const lives = get().sessionLives - (correct ? 0 : 1);
    const recent = [...get().sessionRecentFormats, format].slice(-8);
    const records = [...get().sessionRecords, record];

    const goal = sessionGoal(mode);
    const done =
      served >= goal ||
      (mode === "rush" && lives <= 0) ||
      (mode === "rush" && Date.now() >= get().sessionEndAt);

    set({
      data: newData,
      sessionQuestionsServed: served,
      sessionCorrect: sessCorrect,
      sessionIncorrect: sessIncorrect,
      sessionLives: lives,
      sessionRecentFormats: recent,
      sessionRecords: records,
    });

    return { done, goal, served };
  },
}));
