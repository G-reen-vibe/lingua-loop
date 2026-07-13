import { Word, AspectKey, Lesson } from "./types";
import { LONG_ASPECT_KEYS } from "./types";
import {
  getAspect,
  cleanSynonym,
  availableAspects,
  wordForms,
  shortAspects,
} from "./mastery";

// ===== RNG helpers =====

// Seeded RNG for reproducibility (optional). Default Math.random.
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function sample<T>(arr: T[], n: number, rng: () => number = Math.random): T[] {
  return shuffle(arr, rng).slice(0, n);
}

export function randomItem<T>(arr: T[], rng: () => number = Math.random): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ===== Generic aspect helpers =====

// Pick a "prompt" aspect and a distinct "answer" aspect for a word.
// Avoids returning the same aspect twice, and avoids empty aspects.
export function pickTwoAspects(
  word: Word,
  opts: { excludeKeys?: AspectKey[]; rng?: () => number } = {}
): { promptKey: AspectKey; promptValue: string; answerKey: AspectKey; answerValue: string } | null {
  const rng = opts.rng ?? Math.random;
  const exclude = opts.excludeKeys ?? [];
  const aspects = availableAspects(word).filter((a) => !exclude.includes(a.key));
  if (aspects.length < 2) return null;
  const shuffled = shuffle(aspects, rng);
  const prompt = shuffled[0];
  const answer = shuffled[1];
  return {
    promptKey: prompt.key,
    promptValue: prompt.value,
    answerKey: answer.key,
    answerValue: answer.value,
  };
}

// Get a word form (word/alt) at random.
export function pickWordForm(word: Word, rng: () => number = Math.random): string {
  const forms = wordForms(word);
  return forms[Math.floor(rng() * forms.length)];
}

// ===== Distractor generation =====
// Generates distractor aspect values from OTHER words in the lesson,
// ensuring they're distinct from the correct answer.

export function generateDistractors(
  lesson: Lesson,
  correctValue: string,
  count: number,
  opts: { fromKey?: AspectKey; rng?: () => number } = {}
): string[] {
  const rng = opts.rng ?? Math.random;
  const pool: string[] = [];
  for (const w of lesson.words) {
    if (opts.fromKey) {
      let v = getAspect(w, opts.fromKey);
      if (opts.fromKey === "synonym") v = cleanSynonym(v);
      if (v && v.trim() && v !== correctValue) pool.push(v);
    } else {
      for (const a of availableAspects(w)) {
        if (a.value !== correctValue && !LONG_ASPECT_KEYS.includes(a.key)) {
          pool.push(a.value);
        }
      }
    }
  }
  // Deduplicate
  const unique = Array.from(new Set(pool));
  return sample(unique, count, rng);
}

// ===== Per-format question generation =====

// Each "question spec" is a serializable description of what the UI should render.
// The UI components consume these specs.

export interface IntroductionSpec {
  format: "introduction";
  word: Word;
}

export interface PickAnswerSpec {
  format: "pick-answer";
  prompt: string; // the word or alt form shown
  promptKey: AspectKey;
  correctAnswer: string;
  correctKey: AspectKey;
  options: string[]; // includes correct answer, shuffled
}

export interface SpotLieSpec {
  format: "spot-lie";
  pairs: { left: string; right: string; correct: boolean }[];
}

export interface MatchPairsSpec {
  format: "match-pairs";
  leftItems: string[]; // word forms
  rightItems: string[]; // aspects (shuffled, aligned with leftItems as correct)
  correctPairs: { left: string; right: string }[];
  wordIndices: number[]; // indices of the words used (for mastery updates)
}

export interface WordScrambleSpec {
  format: "word-scramble";
  prompt: string;
  promptKey: AspectKey;
  answer: string; // the target answer (may be multi-word)
  pieces: string[]; // shuffled pieces (chars or words) + distractors
  isCharMode: boolean; // true = char-level, false = word-level
  preFilled: number[]; // indices into answer (chars or words) that are pre-filled
  // For char mode, answer is split into chars; for word mode, split by spaces.
}

export interface FillGapSpec {
  format: "fill-gap";
  prompt: string;
  promptKey: AspectKey;
  answer: string; // what the user types (the blanked-out portion only)
  fullAnswer: string; // the complete answer (for feedback display)
  hint: string; // partial hint with underscores for missing chars
  answerKey: AspectKey;
}

export interface SentenceComprehensionSpec {
  format: "sentence-comprehension";
  tokens: { text: string; clean: string; translation?: string; blank: boolean; answer?: string }[];
  options: string[]; // answer choices, including correct ones + distractors
  translation: string;
}

export interface ShellGameSpec {
  format: "shell-game";
  shellItems: string[]; // what's hidden under each shell
  shellKeys: AspectKey[]; // the key type of each shell item
  prompt: string; // an aspect shown to the user
  promptKey: AspectKey;
  correctShell: number; // index of the shell containing the matching item
  shuffleOrder: number[]; // final positions after shuffle
}

export interface MemoryGridSpec {
  format: "memory-grid";
  cardItems: string[]; // what's on each card
  cardKeys: AspectKey[];
  prompt: string;
  promptKey: AspectKey;
  correctCard: number;
}

export type QuestionSpec =
  | IntroductionSpec
  | PickAnswerSpec
  | SpotLieSpec
  | MatchPairsSpec
  | WordScrambleSpec
  | FillGapSpec
  | SentenceComprehensionSpec
  | ShellGameSpec
  | MemoryGridSpec;

// ===== Introduction =====

export function genIntroduction(word: Word): IntroductionSpec {
  return { format: "introduction", word };
}

// ===== Pick the Answer =====
// Given a word (or alt), present N answer choices where each is a random aspect
// of the word or another word. N starts at 2 and increases with mastery.

export function genPickAnswer(
  lesson: Lesson,
  word: Word,
  mastery: number,
  rng: () => number = Math.random
): PickAnswerSpec | null {
  // Pick a word form (word or alt) as the prompt. Track which alt key it came from.
  const forms = wordForms(word);
  const promptForm = forms[Math.floor(rng() * forms.length)];
  // Determine the promptKey: "word" if it's the main word, otherwise alt1/alt2/alt3.
  let promptKey: AspectKey = "word";
  if (promptForm !== word.word) {
    if (word.alt1 && promptForm === word.alt1) promptKey = "alt1";
    else if (word.alt2 && promptForm === word.alt2) promptKey = "alt2";
    else if (word.alt3 && promptForm === word.alt3) promptKey = "alt3";
  }

  // The correct answer is a random aspect of the word (not the word itself
  // or another alt, since those would be ambiguous).
  const possibleAnswerKeys: AspectKey[] = [
    "definition",
    "synonym",
    "translation",
    "explanation",
  ];
  const validKeys = possibleAnswerKeys.filter((k) => {
    let v = getAspect(word, k);
    if (k === "synonym") v = cleanSynonym(v);
    return v && v.trim();
  });
  if (validKeys.length === 0) return null;

  const answerKey = randomItem(validKeys, rng);
  let answerValue = getAspect(word, answerKey)!;
  if (answerKey === "synonym") answerValue = cleanSynonym(answerValue)!;

  // N starts at 2 and increases with mastery.
  const N = Math.min(6, 2 + Math.floor(mastery / 2));

  // Distractors: same aspect key from other words. Spec requires same-type options.
  const distractors = generateDistractors(lesson, answerValue, N - 1, {
    fromKey: answerKey,
    rng,
  });

  // If not enough same-key distractors, reduce N to available options.
  // We do NOT mix aspect types (spec: each choice is a random aspect, but
  // mixing types makes the correct answer obvious).
  const availableOptions = 1 + distractors.length;
  if (availableOptions < 2) return null; // need at least 2 options

  const options = shuffle([answerValue, ...distractors], rng);
  return {
    format: "pick-answer",
    prompt: promptForm,
    promptKey,
    correctAnswer: answerValue,
    correctKey: answerKey,
    options,
  };
}

// ===== Spot the Lie =====
// N pairs: one side is word/alt, other is a non-definition/explanation aspect.
// One pair is incorrect.

export function genSpotLie(
  lesson: Lesson,
  word: Word,
  mastery: number,
  rng: () => number = Math.random
): SpotLieSpec | null {
  const N = Math.min(5, 2 + Math.floor(mastery / 2));

  // Build correct pairs from this word and other words.
  // Each pair: left = word/alt form, right = a short aspect (not def/explanation).
  const buildCorrectPair = (w: Word): { left: string; right: string } | null => {
    const left = pickWordForm(w, rng);
    const shorts = shortAspects(w).filter(
      (a) => a.key !== "word" && a.value !== left
    );
    if (shorts.length === 0) return null;
    const right = randomItem(shorts, rng).value;
    return { left, right };
  };

  // We need N-1 correct pairs + 1 incorrect pair.
  // Use the target word for one of them, and pull others from the lesson.
  const otherWords = lesson.words.filter((w) => w.word !== word.word);
  const shuffledOthers = shuffle(otherWords, rng);

  const pairs: { left: string; right: string; correct: boolean }[] = [];
  const usedLefts = new Set<string>();
  const usedRights = new Set<string>();

  // Add the target word's pair (correct) first.
  const targetPair = buildCorrectPair(word);
  if (targetPair) {
    pairs.push({ ...targetPair, correct: true });
    usedLefts.add(targetPair.left);
    usedRights.add(targetPair.right);
  }

  // Add correct pairs from other words.
  for (const w of shuffledOthers) {
    if (pairs.length >= N - 1) break;
    const p = buildCorrectPair(w);
    if (!p) continue;
    if (usedLefts.has(p.left) || usedRights.has(p.right)) continue;
    pairs.push({ ...p, correct: true });
    usedLefts.add(p.left);
    usedRights.add(p.right);
  }

  if (pairs.length < N - 1) return null;

  // Build the incorrect pair: take a word form from another word and pair it
  // with a mismatched aspect.
  const lieWordPool = shuffledOthers.filter((w) => !usedLefts.has(w.word));
  let liePair: { left: string; right: string } | null = null;
  for (const w of lieWordPool) {
    const left = pickWordForm(w, rng);
    if (usedLefts.has(left)) continue;
    // Pick a right that does NOT belong to this word.
    const otherRights: string[] = [];
    for (const ow of lesson.words) {
      if (ow.word === w.word) continue;
      for (const a of shortAspects(ow)) {
        if (!usedRights.has(a.value) && a.value !== left) otherRights.push(a.value);
      }
    }
    if (otherRights.length === 0) continue;
    const right = randomItem(otherRights, rng);
    liePair = { left, right };
    break;
  }
  if (!liePair) return null;

  pairs.push({ ...liePair, correct: false });

  return { format: "spot-lie", pairs: shuffle(pairs, rng) };
}

// ===== Match Pairs =====
// Generic matching: left = word/alt, right = a single type of short aspect.
// Served once, affects mastery for all pairs.

export function genMatchPairs(
  lesson: Lesson,
  words: Word[],
  mastery: number,
  rng: () => number = Math.random,
  wordIndices?: number[]
): MatchPairsSpec | null {
  // Number of pairs scales with mastery: 3 -> 4 -> 5 -> 6
  const N = Math.min(6, 3 + Math.floor(mastery / 2));

  // Pick N words that have at least one short aspect besides the word.
  const eligible = words.filter((w) => {
    const s = shortAspects(w).filter((a) => a.key !== "word");
    return s.length > 0;
  });
  if (eligible.length < N) return null;

  // Map eligible words to their indices in the lesson.
  const eligibleWithIdx = eligible.map((w) => {
    const idx = wordIndices
      ? wordIndices[words.indexOf(w)]
      : lesson.words.indexOf(w);
    return { word: w, idx };
  });

  // Choose a single aspect type for the right column.
  const candidateKeys: AspectKey[] = ["translation", "synonym", "alt1", "alt2", "alt3"];
  let chosenKey: AspectKey | null = null;
  let chosenPairs: { word: Word; idx: number }[] = [];

  for (const key of shuffle(candidateKeys, rng)) {
    const withKey = eligibleWithIdx.filter((p) => {
      let v = getAspect(p.word, key);
      if (key === "synonym") v = cleanSynonym(v);
      return v && v.trim();
    });
    if (withKey.length >= N) {
      const unique = Array.from(new Set(withKey.map((p) => p.word.word))).map((s) =>
        withKey.find((p) => p.word.word === s)!
      );
      if (unique.length >= N) {
        chosenKey = key;
        chosenPairs = sample(unique, N, rng);
        break;
      }
    }
  }
  if (!chosenKey || chosenPairs.length === 0) {
    const withTrans = eligibleWithIdx.filter((p) => p.word.translation && p.word.translation.trim());
    if (withTrans.length >= N) {
      chosenKey = "translation";
      chosenPairs = sample(withTrans, N, rng);
    } else {
      return null;
    }
  }

  const leftItems = chosenPairs.map((p) => p.word.word);
  const rightValues = chosenPairs.map((p) => {
    let v = getAspect(p.word, chosenKey!)!;
    if (chosenKey === "synonym") v = cleanSynonym(v)!;
    return v;
  });

  // Ensure rights are unique.
  if (new Set(rightValues).size !== rightValues.length) return null;

  const correctPairs = leftItems.map((left, i) => ({ left, right: rightValues[i] }));
  const shuffledRights = shuffle(rightValues, rng);

  return {
    format: "match-pairs",
    leftItems,
    rightItems: shuffledRights,
    correctPairs,
    wordIndices: chosenPairs.map((p) => p.idx),
  };
}

// ===== Word Scramble =====
// One aspect is presented, the other is to be filled.
// If multi-word, each word is an element; if single word, each char is an element.
// Some irrelevant pieces added; some hints prefilled for long answers.

export function genWordScramble(
  lesson: Lesson,
  word: Word,
  mastery: number,
  rng: () => number = Math.random
): WordScrambleSpec | null {
  // Pick prompt & answer aspects. Answer must not be definition/explanation.
  // Prompt can be any aspect (including def/explanation).
  const pair = pickTwoAspects(word, { rng });
  if (!pair) return null;

  // Decide which is prompt and which is answer.
  // Answer cannot be def/explanation; also cannot be unicode (must be typable-ish, but
  // scramble doesn't require typing so we allow any non-def/explanation).
  let promptKey = pair.promptKey;
  let promptValue = pair.promptValue;
  let answerKey = pair.answerKey;
  let answerValue = pair.answerValue;
  if (answerKey === "definition" || answerKey === "explanation") {
    // Swap
    [promptKey, answerKey] = [answerKey, promptKey];
    [promptValue, answerValue] = [answerValue, promptValue];
  }
  // If after swap the answer is still def/explanation (both were), bail.
  if (answerKey === "definition" || answerKey === "explanation") return null;
  // Ensure answer is at least 2 chars.
  if (answerValue.trim().length < 2) return null;

  const isMultiWord = answerValue.includes(" ");
  const isCharMode = !isMultiWord;
  const elements = isCharMode
    ? answerValue.split("")
    : answerValue.split(" ").filter((w) => w.length > 0);

  if (elements.length < 2) return null;

  // Number of distractors scales with mastery.
  const distractorCount = Math.min(6, 1 + Math.floor(mastery / 2));
  // Generate distractor elements.
  const distractors: string[] = [];
  if (isCharMode) {
    // Char distractors from other words' chars.
    const charPool = new Set<string>();
    for (const w of lesson.words) {
      if (w.word === word.word) continue;
      for (const c of w.word) charPool.add(c);
    }
    const poolArr = Array.from(charPool).filter((c) => !elements.includes(c));
    for (const d of sample(poolArr, distractorCount, rng)) distractors.push(d);
  } else {
    // Word distractors from other words' translations/synonyms split by space.
    const wordPool = new Set<string>();
    for (const w of lesson.words) {
      if (w.word === word.word) continue;
      for (const a of shortAspects(w)) {
        if (a.value.includes(" ")) {
          for (const part of a.value.split(" ")) {
            if (part && !elements.includes(part)) wordPool.add(part);
          }
        }
      }
    }
    const poolArr = Array.from(wordPool);
    for (const d of sample(poolArr, distractorCount, rng)) distractors.push(d);
  }

  // Hints: prefill some elements if the answer is long.
  // Number of hints decreases with mastery. For short answers (<=4 elements), no hints.
  const totalLen = elements.length;
  let preFilledCount = 0;
  if (totalLen > 4) {
    const maxHints = Math.floor(totalLen / 2);
    preFilledCount = Math.max(0, maxHints - mastery);
  }
  // Choose which indices to prefill (not the last one, to leave something to solve).
  const indices = elements.map((_, i) => i).filter((i) => i < elements.length - 1);
  const preFilled = sample(indices, preFilledCount, rng);

  const allPieces = [...elements, ...distractors];
  const pieces = shuffle(allPieces, rng);

  return {
    format: "word-scramble",
    prompt: promptValue,
    promptKey,
    answer: answerValue,
    pieces,
    isCharMode,
    preFilled,
  };
}

// ===== Fill the Gap =====
// Like word scramble but typed. Answer must be typeable (no unicode/def/explanation).
// Most of the answer is given as hints.

export function genFillGap(
  lesson: Lesson,
  word: Word,
  mastery: number,
  rng: () => number = Math.random
): FillGapSpec | null {
  // Pick two aspects; answer must be a typeable short aspect.
  const pair = pickTwoAspects(word, { rng });
  if (!pair) return null;
  let promptKey = pair.promptKey;
  let promptValue = pair.promptValue;
  let answerKey = pair.answerKey;
  let answerValue = pair.answerValue;
  // Answer cannot be def/explanation.
  if (answerKey === "definition" || answerKey === "explanation") {
    [promptKey, answerKey] = [answerKey, promptKey];
    [promptValue, answerValue] = [answerValue, promptValue];
  }
  if (answerKey === "definition" || answerKey === "explanation") return null;
  // Answer must be typeable: only ASCII (standard qwerty).
  if (!/^[\x20-\x7E]+$/.test(answerValue)) return null;
  if (answerValue.trim().length < 2) return null;

  // Build hint: show most of the answer, leave a small gap.
  // "should not be expected to type anything longer than maybe 1 word"
  // So if multi-word, only keep one word as the gap, show the rest.
  let answerToType = answerValue;
  let shownPrefix = "";
  let shownSuffix = "";

  if (answerValue.includes(" ")) {
    const parts = answerValue.split(" ").filter((p) => p.length > 0);
    if (parts.length >= 2) {
      // Pick one part to be the gap (prefer a non-first part).
      const gapIdx = Math.min(parts.length - 1, 1 + Math.floor(rng() * (parts.length - 1)));
      answerToType = parts[gapIdx];
      shownPrefix = parts.slice(0, gapIdx).join(" ") + (gapIdx > 0 ? " " : "");
      shownSuffix = gapIdx < parts.length - 1 ? " " + parts.slice(gapIdx + 1).join(" ") : "";
    }
  }

  // Within answerToType, show MOST chars as hints, leave a small gap to fill.
  // Spec: "most of it will be given as hints, the user should not be expected
  // to type anything longer than maybe 1 word."
  // So the gap should be at most ~half the chars, and at least 2.
  const chars = answerToType.split("");
  if (chars.length < 2) return null;
  // Gap = max(2, floor(len / 3)), capped at 4. This ensures "most" are hints.
  const gapCount = Math.min(4, Math.max(2, Math.floor(chars.length / 3)));
  // Choose gap positions.
  const positions = chars.map((_, i) => i);
  const gapPositions = new Set(sample(positions, gapCount, rng));
  const hintChars = chars.map((c, i) => (gapPositions.has(i) ? "_" : c));
  const hint = shownPrefix + hintChars.join("") + shownSuffix;

  // The user only types the blanked-out chars, in order.
  const typedAnswer = chars
    .filter((_, i) => gapPositions.has(i))
    .join("");

  return {
    format: "fill-gap",
    prompt: promptValue,
    promptKey,
    answer: typedAnswer,
    fullAnswer: answerValue,
    hint,
    answerKey,
  };
}

// ===== Sentence Comprehension =====
// Choose a sentence, blank out N words. Words with mastery >= 3 have bracket
// translations removed; below that, kept.

export function parseSentence(exert: string): { text: string; clean: string; translation?: string }[] {
  // exert format: "El [the] gato [cat] duerme [sleeps]."
  // Tokens separated by spaces. Each token is either a word or "[translation]".
  // The bracket immediately follows the word it translates.
  // Punctuation may be attached to the closing bracket (e.g. "[big].").
  const rawTokens = exert.split(/\s+/).filter((t) => t.length > 0);
  const tokens: { text: string; clean: string; translation?: string }[] = [];
  for (const t of rawTokens) {
    // Check if this token is a translation bracket: starts with "[", contains
    // a closing "]", and everything before the "]" is the translation.
    // Trailing punctuation after "]" is allowed (e.g. "[big].").
    const bracketMatch = t.match(/^\[([^\]]+)\](.*)$/);
    if (bracketMatch) {
      // This is a translation bracket for the previous token.
      const translation = bracketMatch[1];
      const trailingPunct = bracketMatch[2];
      if (tokens.length > 0) {
        tokens[tokens.length - 1].translation = translation;
        // Attach trailing punctuation to the previous token's display text.
        if (trailingPunct) {
          tokens[tokens.length - 1].text += trailingPunct;
        }
      }
    } else {
      // Regular word token.
      const clean = t.replace(/[^\p{L}\p{N}]/gu, "");
      tokens.push({ text: t, clean });
    }
  }
  return tokens;
}

export function genSentenceComprehension(
  lesson: Lesson,
  word: Word,
  mastery: number,
  rng: () => number = Math.random
): SentenceComprehensionSpec | null {
  if (!word.sentences || word.sentences.length === 0) return null;
  const sentence = randomItem(word.sentences, rng);
  const parsed = parseSentence(sentence.exert);
  if (parsed.length < 3) return null;

  // Number of blanks: 1 + floor(mastery / 3), capped.
  const blankCount = Math.min(3, 1 + Math.floor(mastery / 3));
  // Number of distractors: 1 + floor(mastery / 2).
  const distractorCount = Math.min(4, 1 + Math.floor(mastery / 2));

  // Eligible to blank: tokens that have a translation bracket (so we know the answer).
  const blankableIndices = parsed
    .map((t, i) => (t.translation && t.clean ? i : -1))
    .filter((i) => i >= 0);
  if (blankableIndices.length < blankCount) return null;

  const blankIndices = new Set(sample(blankableIndices, blankCount, rng));
  // Use clean text (punctuation stripped) as the answer.
  const answers = Array.from(blankIndices).map((i) => parsed[i].clean);

  // Distractors: other word forms from the lesson.
  const distractorPool = new Set<string>();
  for (const w of lesson.words) {
    for (const f of wordForms(w)) {
      if (!answers.includes(f)) distractorPool.add(f);
    }
  }
  const distractors = sample(Array.from(distractorPool), distractorCount, rng);

  // Build tokens, removing bracket translations for words with mastery >= 3.
  // Use clean text for mastery lookups (handles punctuation).
  const wordMastery = new Map<string, number>();
  for (let i = 0; i < lesson.words.length; i++) {
    const w = lesson.words[i];
    const p = lesson.progress[i];
    const forms = wordForms(w);
    for (const f of forms) wordMastery.set(f, p?.mastery ?? 0);
  }

  const tokens = parsed.map((t, i) => {
    const isBlank = blankIndices.has(i);
    if (isBlank) {
      return { text: "___", clean: t.clean, blank: true, answer: t.clean };
    }
    // Decide whether to show the bracket translation.
    const m = wordMastery.get(t.clean) ?? -1;
    const showTranslation = m >= 0 && m < 3;
    return {
      text: t.text,
      clean: t.clean,
      translation: showTranslation ? t.translation : undefined,
      blank: false,
    };
  });

  const options = shuffle([...answers, ...distractors], rng);

  return {
    format: "sentence-comprehension",
    tokens,
    options,
    translation: sentence.translation,
  };
}

// ===== Shell Game =====
// N items (word/alt/synonym/translation) are hidden under shells.
// User is shown an aspect and must pick the right shell.
// {4, 5, 6} shells based on mastery.

export function genShellGame(
  lesson: Lesson,
  word: Word,
  mastery: number,
  rng: () => number = Math.random
): ShellGameSpec | null {
  // ShellGame is at difficulty 4, so mastery >= 4.
  // Scale: mastery 4 -> 4 shells, mastery 5 -> 5 shells, mastery 6+ -> 6 shells.
  const shellCounts = [4, 5, 6];
  const idx = Math.min(shellCounts.length - 1, Math.max(0, mastery - 4));
  const N = shellCounts[idx];

  // Gather shell item candidates from THIS word only.
  // Spec: "N of the word, any of its alt forms, its synonym, or direct translation".
  const candidates: { value: string; key: AspectKey }[] = [];
  for (const f of wordForms(word)) candidates.push({ value: f, key: "word" });
  if (word.synonym) {
    const s = cleanSynonym(word.synonym);
    if (s) candidates.push({ value: s, key: "synonym" });
  }
  if (word.translation)
    candidates.push({ value: word.translation, key: "translation" });

  if (candidates.length < 2) return null;

  // Deduplicate by value. Only use spec-allowed aspects (word/alt/synonym/translation).
  const unique = new Map<string, { value: string; key: AspectKey }>();
  for (const c of candidates) {
    if (!unique.has(c.value)) unique.set(c.value, c);
  }
  const uniqueArr = Array.from(unique.values());
  if (uniqueArr.length < 2) return null;

  // Use as many shells as we have unique items, capped at N.
  const shellCandidates = sample(uniqueArr, Math.min(N, uniqueArr.length), rng);
  // Pick a target shell — the prompt is the target shell item's own value.
  // The challenge is remembering positions after shuffling, not aspect mapping.
  const targetIdx = Math.floor(rng() * shellCandidates.length);
  const targetShell = shellCandidates[targetIdx];

  return {
    format: "shell-game",
    shellItems: shellCandidates.map((s) => s.value),
    shellKeys: shellCandidates.map((s) => s.key),
    prompt: targetShell.value,
    promptKey: targetShell.key,
    correctShell: targetIdx,
    // shuffleOrder is provided for reference; the UI does its own shuffle animation.
    shuffleOrder: shuffle(shellCandidates.map((_, i) => i), rng),
  };
}

// ===== Memory Grid =====
// Like shell game but with cards the user can rearrange.
// {4, 6, 9} cards based on mastery.

export function genMemoryGrid(
  lesson: Lesson,
  word: Word,
  mastery: number,
  rng: () => number = Math.random
): MemoryGridSpec | null {
  // MemoryGrid is at difficulty 4, so mastery >= 4.
  // Scale: mastery 4 -> 4 cards, mastery 5 -> 6 cards, mastery 6+ -> 9 cards.
  const cardCounts = [4, 6, 9];
  const idx = Math.min(cardCounts.length - 1, Math.max(0, mastery - 4));
  const N = cardCounts[idx];

  // Same as shell game: gather candidates from the word.
  const candidates: { value: string; key: AspectKey }[] = [];
  for (const f of wordForms(word)) candidates.push({ value: f, key: "word" });
  if (word.synonym) {
    const s = cleanSynonym(word.synonym);
    if (s) candidates.push({ value: s, key: "synonym" });
  }
  if (word.translation)
    candidates.push({ value: word.translation, key: "translation" });
  if (word.definition)
    candidates.push({ value: word.definition, key: "definition" });
  if (word.explanation)
    candidates.push({ value: word.explanation, key: "explanation" });
  if (word.alt1) candidates.push({ value: word.alt1, key: "alt1" });
  if (word.alt2) candidates.push({ value: word.alt2, key: "alt2" });
  if (word.alt3) candidates.push({ value: word.alt3, key: "alt3" });

  // Deduplicate by value.
  const unique = new Map<string, { value: string; key: AspectKey }>();
  for (const c of candidates) {
    if (!unique.has(c.value)) unique.set(c.value, c);
  }
  const uniqueArr = Array.from(unique.values());
  if (uniqueArr.length < 2) return null;

  const cardCandidates = sample(uniqueArr, Math.min(N, uniqueArr.length), rng);

  const targetIdx = Math.floor(rng() * cardCandidates.length);
  const targetCard = cardCandidates[targetIdx];

  return {
    format: "memory-grid",
    cardItems: cardCandidates.map((c) => c.value),
    cardKeys: cardCandidates.map((c) => c.key),
    prompt: targetCard.value,
    promptKey: targetCard.key,
    correctCard: targetIdx,
  };
}
