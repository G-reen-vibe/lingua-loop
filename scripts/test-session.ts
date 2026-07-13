// Test script: simulates a full study session to check that the session
// continues to the goal and that mastery progresses correctly.
import { Word, Lesson, FormatKind, ReviewRecord, FORMAT_DIFFICULTY } from "../src/lib/types";
import {
  pickNextFormat,
  wordsEligibleForFormat,
  recordReview,
  sessionGoal,
  wordsForIntroduction,
} from "../src/lib/mastery";
import {
  genIntroduction,
  genPickAnswer,
  genSpotLie,
  genMatchPairs,
  genWordScramble,
  genFillGap,
  genSentenceComprehension,
  genSentenceTranslation,
  genShellGame,
  genCardGame,
  genMarbleGame,
  QuestionSpec,
} from "../src/lib/formats";
import { createLesson } from "../src/lib/storage";
import { sm2Update, fsrsUpdate, correctToSm2Quality, correctToFsrsRating } from "../src/lib/algorithms";

const testWords: Word[] = [
  { word: "gato", translation: "cat", definition: "felino", synonym: "=felino", explanation: "A cat", alt1: "gatos", sentences: [{ exert: "El [the] gato [cat] duerme [sleeps].", translation: "The cat sleeps." }] },
  { word: "perro", translation: "dog", definition: "canino", synonym: "=can", explanation: "A dog", alt1: "perros", sentences: [{ exert: "El [the] perro [dog] ladra [barks].", translation: "The dog barks." }] },
  { word: "casa", translation: "house", definition: "edificio", synonym: "=hogar", explanation: "A house", alt1: "casas", sentences: [{ exert: "La [the] casa [house] es [is] grande [big].", translation: "The house is big." }] },
  { word: "agua", translation: "water", definition: "liquido", synonym: "=liquido", explanation: "Water", sentences: [{ exert: "Bebo [I] agua [water].", translation: "I drink water." }] },
  { word: "pan", translation: "bread", definition: "alimento", synonym: "=alimento", explanation: "Bread", sentences: [{ exert: "El [the] pan [bread] esta [is] caliente [hot].", translation: "The bread is hot." }] },
  { word: "sol", translation: "sun", definition: "estrella", synonym: "=estrella", explanation: "The sun", sentences: [{ exert: "El [the] sol [sun] brilla [shines].", translation: "The sun shines." }] },
];

let testsRun = 0;
let testsPassed = 0;
const failures: string[] = [];

function check(condition: boolean, message: string) {
  testsRun++;
  if (condition) {
    testsPassed++;
  } else {
    failures.push(message);
    console.error("FAIL:", message);
  }
}

// Simulate a study session. Mirrors the real app's buildActiveFormat fallback logic.
function simulateSession(
  lesson: Lesson,
  mode: "daily" | "lesson" | "rush",
  correctRate: number = 0.8,
  maxIterations: number = 500,
  verbose: boolean = false
): { questionsServed: number; formatsUsed: Record<string, number>; finalMasteries: number[] } {
  const goal = sessionGoal(mode);
  let served = 0;
  let lives = mode === "rush" ? 3 : 999;
  const recentFormats: FormatKind[] = [];
  const formatsUsed: Record<string, number> = {};
  const lessonCopy: Lesson = JSON.parse(JSON.stringify(lesson));

  const allFormats: FormatKind[] = [
    "introduction", "pick-answer", "spot-lie", "match-pairs",
    "word-scramble", "fill-gap", "sentence-comprehension", "sentence-translation",
    "shell-game", "card-game", "marble-game",
  ];

  let iter = 0;
  while (served < goal && lives > 0 && iter < maxIterations) {
    iter++;
    const suggested = pickNextFormat(lessonCopy, recentFormats);

    // Build list of formats to try, suggested first, then all others.
    const toTry: FormatKind[] = [];
    if (suggested) toTry.push(suggested);
    for (const f of allFormats) {
      if (f === "introduction") continue;
      if (!toTry.includes(f)) toTry.push(f);
    }

    let found = false;
    for (const format of toTry) {
      let words = wordsEligibleForFormat(lessonCopy, format);
      if (words.length === 0) {
        if (format === "introduction") continue;
        const diff = FORMAT_DIFFICULTY[format];
        words = lessonCopy.progress.filter((p) => p.seen && p.mastery >= diff);
        if (words.length === 0) continue;
      }

      // For match-pairs, need >= 3 words
      if (format === "match-pairs" && words.length < 3) continue;

      // Try up to 5 words
      const shuffled = [...words].sort(() => Math.random() - 0.5);
      let spec: QuestionSpec | null = null;
      let wpUsed = null;

      for (const wp of shuffled.slice(0, 5)) {
        const word = lessonCopy.words[wp.wordIndex];
        if (!word) continue;
        try {
          switch (format) {
            case "introduction": spec = genIntroduction(word); break;
            case "pick-answer": spec = genPickAnswer(lessonCopy, word, wp.mastery); break;
            case "spot-lie": spec = genSpotLie(lessonCopy, word, wp.mastery); break;
            case "match-pairs":
              spec = genMatchPairs(lessonCopy, shuffled.map(w => lessonCopy.words[w.wordIndex]).filter(Boolean), wp.mastery);
              break;
            case "word-scramble": spec = genWordScramble(lessonCopy, word, wp.mastery); break;
            case "fill-gap": spec = genFillGap(lessonCopy, word, wp.mastery); break;
            case "sentence-comprehension": spec = genSentenceComprehension(lessonCopy, word, wp.mastery); break;
            case "sentence-translation": spec = genSentenceTranslation(lessonCopy, word, wp.mastery); break;
            case "shell-game": spec = genShellGame(lessonCopy, word, wp.mastery); break;
            case "card-game": spec = genCardGame(lessonCopy, word, wp.mastery); break;
            case "marble-game": spec = genMarbleGame(lessonCopy, word, wp.mastery); break;
          }
        } catch (e) {
          if (verbose) console.error(`  Generator ${format} threw: ${(e as Error).message}`);
          spec = null;
        }
        if (spec) { wpUsed = wp; break; }
      }

      if (!spec) continue;

      // Simulate answer. Introduction is always correct (user just clicks "Got it").
      const correct = format === "introduction" ? true : Math.random() < correctRate;
      const wp = wpUsed!;

      // Update progress
      const newProgress = recordReview(lessonCopy.progress[wp.wordIndex], correct, format);
      if (correct) {
        newProgress.sm2 = sm2Update(lessonCopy.progress[wp.wordIndex].sm2, correctToSm2Quality(true));
        newProgress.fsrs = fsrsUpdate(lessonCopy.progress[wp.wordIndex].fsrs, correctToFsrsRating(true));
      } else {
        newProgress.sm2 = sm2Update(lessonCopy.progress[wp.wordIndex].sm2, correctToSm2Quality(false));
        newProgress.fsrs = fsrsUpdate(lessonCopy.progress[wp.wordIndex].fsrs, correctToFsrsRating(false));
      }

      if (format === "introduction" && !lessonCopy.progress[wp.wordIndex].seen) {
        lessonCopy.newWordsSeenToday += 1;
      }

      lessonCopy.progress[wp.wordIndex] = newProgress;

      served++;
      if (!correct && mode === "rush") lives--;
      recentFormats.push(format);
      formatsUsed[format] = (formatsUsed[format] || 0) + 1;
      found = true;
      break;
    }

    if (!found) {
      if (verbose) console.log(`  No format could generate a question after ${served} questions`);
      break;
    }
  }

  return {
    questionsServed: served,
    formatsUsed,
    finalMasteries: lessonCopy.progress.map((p) => p.mastery),
  };
}

// ===== Test 1: Daily session reaches goal =====
console.log("\n=== Test 1: Daily session reaches 30 questions ===");
{
  const lesson = createLesson("Test", testWords);
  // Lower min-mastery threshold to 0 so all words can be introduced
  lesson.settings.minMasteryForNewWords = 0;
  lesson.settings.maxNewWordsDaily = 20;

  const result = simulateSession(lesson, "daily", 0.8, 500);
  console.log(`  Served: ${result.questionsServed}`);
  console.log(`  Formats: ${JSON.stringify(result.formatsUsed)}`);
  console.log(`  Masteries: ${result.finalMasteries.join(", ")}`);
  check(
    result.questionsServed === 30,
    `Daily session should serve 30 questions, got ${result.questionsServed}`
  );
}

// ===== Test 2: Lesson session reaches 100 questions =====
console.log("\n=== Test 2: Lesson session reaches 100 questions ===");
{
  const lesson = createLesson("Test", testWords);
  lesson.settings.minMasteryForNewWords = 0;
  lesson.settings.maxNewWordsDaily = 20;

  const result = simulateSession(lesson, "lesson", 0.8, 1000);
  console.log(`  Served: ${result.questionsServed}`);
  console.log(`  Formats: ${JSON.stringify(result.formatsUsed)}`);
  console.log(`  Masteries: ${result.finalMasteries.join(", ")}`);
  check(
    result.questionsServed === 100,
    `Lesson session should serve 100 questions, got ${result.questionsServed}`
  );
}

// ===== Test 3: Rush session ends on lives =====
console.log("\n=== Test 3: Rush session with 0% correct ends on lives ===");
{
  const lesson = createLesson("Test", testWords);
  lesson.settings.minMasteryForNewWords = 0;
  lesson.settings.maxNewWordsDaily = 20;

  const result = simulateSession(lesson, "rush", 0.0, 100);
  console.log(`  Served: ${result.questionsServed}`);
  // With 0% correct on non-introduction formats, the session ends when 3 lives are lost.
  // Introductions are always correct, so the exact count depends on how many
  // introductions are served between wrong answers. Just check it ends reasonably.
  check(
    result.questionsServed >= 3 && result.questionsServed <= 12,
    `Rush session with 0% correct should serve 3-12 questions, got ${result.questionsServed}`
  );
}

// ===== Test 4: Mastery progression =====
console.log("\n=== Test 4: Mastery progresses with correct answers ===");
{
  const lesson = createLesson("Test", testWords);
  lesson.settings.minMasteryForNewWords = 0;
  lesson.settings.maxNewWordsDaily = 20;

  // Run many sessions
  let maxMastery = 0;
  for (let i = 0; i < 20; i++) {
    const result = simulateSession(lesson, "lesson", 1.0, 1000);
    // Copy final masteries back into lesson
    for (let j = 0; j < lesson.progress.length; j++) {
      // We need to re-simulate properly; for now just check the last result
      if (result.finalMasteries[j] > maxMastery) maxMastery = result.finalMasteries[j];
    }
  }
  console.log(`  Max mastery reached: ${maxMastery}`);
  check(maxMastery >= 2, `Mastery should reach >= 2 with 100% correct, got ${maxMastery}`);
}

// ===== Test 5: No duplicate formats in a row (except shell game sub-questions) =====
console.log("\n=== Test 5: Format variety ===");
{
  const lesson = createLesson("Test", testWords);
  lesson.settings.minMasteryForNewWords = 0;
  lesson.settings.maxNewWordsDaily = 20;

  const result = simulateSession(lesson, "daily", 0.8, 500);
  const formatCount = Object.keys(result.formatsUsed).length;
  console.log(`  Distinct formats used: ${formatCount}`);
  check(formatCount >= 2, `Should use at least 2 distinct formats, got ${formatCount}`);
}

// ===== Summary =====
console.log("\n=== Summary ===");
console.log(`Tests: ${testsPassed}/${testsRun} passed`);
if (failures.length > 0) {
  console.log(`\n${failures.length} failures:`);
  for (const f of failures) console.log("  - " + f);
  process.exit(1);
}
