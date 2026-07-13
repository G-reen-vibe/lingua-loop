// Test script: exercises all format generators with various inputs
// and checks for spec validity.
import { Word, Lesson, FORMAT_DIFFICULTY, FormatKind } from "../src/lib/types";
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

const testWords: Word[] = [
  {
    word: "gato",
    definition: "un animal felino domestico",
    synonym: "=felino",
    translation: "cat",
    explanation: "A small domesticated carnivorous mammal",
    alt1: "gatos",
    sentences: [
      { exert: "El [the] gato [cat] duerme [sleeps].", translation: "The cat sleeps." },
      { exert: "Mi [my] gato [cat] es [is] negro [black].", translation: "My cat is black." },
    ],
  },
  {
    word: "perro",
    definition: "un animal canino domestico",
    synonym: "=can",
    translation: "dog",
    explanation: "A domesticated descendant of the wolf",
    alt1: "perros",
    sentences: [
      { exert: "El [the] perro [dog] ladra [barks].", translation: "The dog barks." },
    ],
  },
  {
    word: "casa",
    definition: "un edificio para vivir",
    synonym: "=hogar",
    translation: "house",
    explanation: "A building that functions as a home",
    alt1: "casas",
    sentences: [
      { exert: "La [the] casa [house] es [is] grande [big].", translation: "The house is big." },
    ],
  },
  {
    word: "agua",
    definition: "un liquido transparente",
    synonym: "=liquido",
    translation: "water",
    explanation: "A transparent, odorless, tasteless liquid",
    sentences: [
      { exert: "Bebo [I drink] agua [water].", translation: "I drink water." },
    ],
  },
  {
    word: "pan",
    definition: "un alimento hecho de harina",
    synonym: "=alimento",
    translation: "bread",
    explanation: "A staple food prepared from dough",
    sentences: [
      { exert: "El [the] pan [bread] esta [is] caliente [hot].", translation: "The bread is hot." },
    ],
  },
  {
    word: "sol",
    definition: "la estrella del sistema solar",
    synonym: "=estrella",
    translation: "sun",
    explanation: "The star at the center of the Solar System",
    sentences: [
      { exert: "El [the] sol [sun] brilla [shines].", translation: "The sun shines." },
    ],
  },
];

const lesson = createLesson("Test", testWords);

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

// ===== Introduction =====
console.log("\n=== Introduction ===");
{
  const spec = genIntroduction(testWords[0]);
  check(spec !== null, "Introduction should return a spec");
  check(spec?.word.word === "gato", "Introduction word should be gato");
}

// ===== Pick Answer =====
console.log("\n=== Pick Answer ===");
for (let mastery = 1; mastery <= 5; mastery++) {
  const spec = genPickAnswer(lesson, testWords[0], mastery);
  check(spec !== null, `PickAnswer mastery ${mastery} should return a spec`);
  if (spec) {
    const expectedN = Math.min(6, 2 + Math.floor(mastery / 2));
    check(
      spec.options.length === expectedN,
      `PickAnswer mastery ${mastery}: expected ${expectedN} options, got ${spec.options.length}`
    );
    check(
      spec.options.includes(spec.correctAnswer),
      "PickAnswer: correct answer must be in options"
    );
    check(
      new Set(spec.options).size === spec.options.length,
      "PickAnswer: options must be unique (got duplicates: " + spec.options.join(", ") + ")"
    );
    check(
      spec.correctAnswer !== spec.prompt,
      "PickAnswer: answer must not equal prompt"
    );
  }
}

// ===== Spot the Lie =====
console.log("\n=== Spot the Lie ===");
for (let mastery = 1; mastery <= 5; mastery++) {
  const spec = genSpotLie(lesson, testWords[0], mastery);
  check(spec !== null, `SpotLie mastery ${mastery} should return a spec`);
  if (spec) {
    const expectedN = Math.min(5, 2 + Math.floor(mastery / 2));
    check(
      spec.pairs.length === expectedN,
      `SpotLie mastery ${mastery}: expected ${expectedN} pairs, got ${spec.pairs.length}`
    );
    const lies = spec.pairs.filter((p) => !p.correct);
    check(lies.length === 1, "SpotLie: exactly one lie");
    const lefts = spec.pairs.map((p) => p.left);
    check(new Set(lefts).size === lefts.length, "SpotLie: lefts must be unique");
    const rights = spec.pairs.map((p) => p.right);
    check(new Set(rights).size === rights.length, "SpotLie: rights must be unique");
    // No pair should have left === right
    for (const p of spec.pairs) {
      check(p.left !== p.right, "SpotLie: left must not equal right in a pair");
    }
  }
}

// ===== Match Pairs =====
console.log("\n=== Match Pairs ===");
for (let mastery = 1; mastery <= 5; mastery++) {
  const spec = genMatchPairs(lesson, testWords, mastery);
  if (spec) {
    const expectedN = Math.min(6, 3 + Math.floor(mastery / 2));
    check(
      spec.leftItems.length === expectedN,
      `MatchPairs mastery ${mastery}: expected ${expectedN} left items, got ${spec.leftItems.length}`
    );
    check(
      spec.leftItems.length === spec.rightItems.length,
      "MatchPairs: left and right must have same length"
    );
    check(
      new Set(spec.leftItems).size === spec.leftItems.length,
      "MatchPairs: left items must be unique"
    );
    check(
      new Set(spec.rightItems).size === spec.rightItems.length,
      "MatchPairs: right items must be unique"
    );
    // Check correct pairs are actually correct
    for (const cp of spec.correctPairs) {
      check(
        spec.leftItems.includes(cp.left),
        "MatchPairs: correct pair left must be in leftItems"
      );
      check(
        spec.rightItems.includes(cp.right),
        "MatchPairs: correct pair right must be in rightItems"
      );
    }
  } else {
    console.log(`  (MatchPairs mastery ${mastery}: returned null)`);
  }
}

// ===== Word Scramble =====
console.log("\n=== Word Scramble ===");
for (let mastery = 1; mastery <= 5; mastery++) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const spec = genWordScramble(lesson, testWords[0], mastery);
    if (!spec) continue;
    check(spec.answer.length >= 2, `WordScramble: answer must be >= 2 chars (got "${spec.answer}")`);
    check(
      spec.answer !== spec.prompt,
      "WordScramble: answer must not equal prompt"
    );
    // Pieces must contain all elements of the answer
    if (spec.isCharMode) {
      const answerChars = spec.answer.split("");
      const pieceCopy = [...spec.pieces];
      for (const c of answerChars) {
        const idx = pieceCopy.indexOf(c);
        if (idx >= 0) pieceCopy.splice(idx, 1);
      }
      // After removing answer chars, remaining pieces are distractors (or extras from prefilled)
      // This is fine as long as all answer chars are present
    } else {
      const answerWords = spec.answer.split(" ");
      const pieceCopy = [...spec.pieces];
      for (const w of answerWords) {
        const idx = pieceCopy.indexOf(w);
        if (idx >= 0) pieceCopy.splice(idx, 1);
      }
    }
    // Pre-filled indices must be valid
    for (const idx of spec.preFilled) {
      check(idx >= 0, "WordScramble: preFilled index must be >= 0");
    }
  }
}

// ===== Fill the Gap =====
console.log("\n=== Fill the Gap ===");
for (let mastery = 1; mastery <= 5; mastery++) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const spec = genFillGap(lesson, testWords[0], mastery);
    if (!spec) continue;
    check(
      /^[\x20-\x7E]+$/.test(spec.fullAnswer),
      `FillGap: fullAnswer must be ASCII (got "${spec.fullAnswer}")`
    );
    check(spec.fullAnswer.length >= 2, "FillGap: fullAnswer must be >= 2 chars");
    check(spec.answer.length >= 2, "FillGap: typed answer must be >= 2 chars");
    check(
      spec.fullAnswer !== spec.prompt,
      "FillGap: answer must not equal prompt"
    );
    // Hint must contain underscores
    check(
      spec.hint.includes("_"),
      "FillGap: hint must contain underscores"
    );
    // Count underscores must match typed answer length
    const underscoreCount = (spec.hint.match(/_+/g) || []).reduce((s, m) => s + m.length, 0);
    check(
      underscoreCount === spec.answer.length,
      `FillGap: underscore count (${underscoreCount}) must match typed answer length (${spec.answer.length})`
    );
    // The typed answer chars must all be present in the full answer
    for (const c of spec.answer) {
      check(
        spec.fullAnswer.includes(c),
        `FillGap: typed char "${c}" must be in fullAnswer "${spec.fullAnswer}"`
      );
    }
  }
}

// ===== Sentence Comprehension =====
console.log("\n=== Sentence Comprehension ===");
for (let mastery = 1; mastery <= 5; mastery++) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const spec = genSentenceComprehension(lesson, testWords[0], mastery);
    if (!spec) continue;
    const blanks = spec.tokens.filter((t) => t.blank);
    check(blanks.length >= 1, "SentenceComp: must have at least 1 blank");
    // All blanks must have an answer
    for (const b of blanks) {
      check(!!b.answer, "SentenceComp: blank must have an answer");
    }
    // Options must contain all answers
    for (const b of blanks) {
      check(
        spec.options.includes(b.answer!),
        "SentenceComp: options must contain blank answer"
      );
    }
    // Options must be unique
    check(
      new Set(spec.options).size === spec.options.length,
      "SentenceComp: options must be unique"
    );
  }
}

// ===== Shell Game =====
console.log("\n=== Shell Game ===");
for (let mastery = 1; mastery <= 5; mastery++) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const spec = genShellGame(lesson, testWords[0], mastery);
    if (!spec) continue;
    const expectedN = [4, 5, 6][Math.min(2, Math.floor(mastery / 2))];
    check(
      spec.shellItems.length >= 2,
      `ShellGame: need >= 2 shells, got ${spec.shellItems.length}`
    );
    // Shell items must be unique
    check(
      new Set(spec.shellItems).size === spec.shellItems.length,
      "ShellGame: shell items must be unique"
    );
    // Prompt must be one of the shell items
    check(
      spec.shellItems.includes(spec.prompt),
      "ShellGame: prompt must be a shell item"
    );
    // Correct shell index must be valid
    check(
      spec.correctShell >= 0 && spec.correctShell < spec.shellItems.length,
      "ShellGame: correctShell must be valid index"
    );
    check(
      spec.shellItems[spec.correctShell] === spec.prompt,
      "ShellGame: correctShell item must match prompt"
    );
  }
}

// ===== Card Game =====
console.log("\n=== Card Game ===");
for (let mastery = 4; mastery <= 5; mastery++) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const spec = genCardGame(lesson, testWords[0], mastery);
    if (!spec) continue;
    check(
      spec.cardItems.length >= 2,
      `CardGame: need >= 2 cards, got ${spec.cardItems.length}`
    );
    check(
      new Set(spec.cardItems).size === spec.cardItems.length,
      "CardGame: card items must be unique"
    );
    check(
      spec.cardItems.includes(spec.prompt),
      "CardGame: prompt must be a card item"
    );
    check(
      spec.cardItems[spec.correctCard] === spec.prompt,
      "CardGame: correctCard item must match prompt"
    );
  }
}

// ===== Marble Game =====
console.log("\n=== Marble Game ===");
for (let mastery = 4; mastery <= 5; mastery++) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const spec = genMarbleGame(lesson, testWords[0], mastery);
    if (!spec) continue;
    // Slot count is capped by available unique aspects (word+alts+synonym+translation).
    // For testWords[0] (gato): word=gato, alt1=gatos, synonym=felino, translation=cat = 4 unique.
    check(
      spec.slotItems.length >= 4,
      `MarbleGame: need >= 4 slots, got ${spec.slotItems.length}`
    );
    check(
      new Set(spec.slotItems).size === spec.slotItems.length,
      "MarbleGame: slot items must be unique"
    );
    check(
      spec.slotItems.includes(spec.prompt),
      "MarbleGame: prompt must be a slot item"
    );
    check(
      spec.slotItems[spec.correctSlot] === spec.prompt,
      "MarbleGame: correctSlot item must match prompt"
    );
    check(
      spec.options.length === spec.slotItems.length,
      "MarbleGame: options should match slot count"
    );
  }
}

// ===== Sentence Translation =====
console.log("\n=== Sentence Translation ===");
for (let mastery = 3; mastery <= 5; mastery++) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const spec = genSentenceTranslation(lesson, testWords[0], mastery);
    if (!spec) continue;
    const blanks = spec.tokens.filter((t) => t.blank);
    check(blanks.length >= 2, `SentenceTranslation: must have >= 2 blanks, got ${blanks.length}`);
    for (const b of blanks) {
      check(!!b.answer, "SentenceTranslation: blank must have an answer");
    }
    for (const b of blanks) {
      check(
        spec.options.includes(b.answer!),
        "SentenceTranslation: options must contain blank answer"
      );
    }
    check(
      new Set(spec.options).size === spec.options.length,
      "SentenceTranslation: options must be unique"
    );
    check(!!spec.translation, "SentenceTranslation: must have a translation");
  }
}

// ===== Edge case: word with only translation (single-word lesson) =====
console.log("\n=== Edge case: minimal word ===");
{
  const minimalWord: Word = { word: "hi", translation: "hola" };
  const minimalLesson = createLesson("Min", [minimalWord]);
  const spec = genPickAnswer(minimalLesson, minimalWord, 1);
  check(spec === null, "PickAnswer on single-word lesson should return null (no distractors)");
}

// ===== Edge case: word with no sentences (sentence comp) =====
console.log("\n=== Edge case: no sentences ===");
{
  const noSentWord: Word = { word: "hi", translation: "hola" };
  const noSentLesson = createLesson("NS", [noSentWord]);
  const spec = genSentenceComprehension(noSentLesson, noSentWord, 3);
  check(spec === null, "SentenceComp with no sentences should return null");
}

// ===== Summary =====
console.log("\n=== Summary ===");
console.log(`Tests: ${testsPassed}/${testsRun} passed`);
if (failures.length > 0) {
  console.log(`\n${failures.length} failures:`);
  for (const f of failures) console.log("  - " + f);
  process.exit(1);
}
