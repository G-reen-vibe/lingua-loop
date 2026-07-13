"use client";

import { useState, useCallback } from "react";
import { Lesson, FormatKind, FORMAT_DIFFICULTY, Word } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bug, RefreshCw, Check, X } from "lucide-react";
import { playSound } from "@/lib/sounds";
import {
  QuestionSpec,
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
} from "@/lib/formats";
import { wordsEligibleForFormat } from "@/lib/mastery";
import { IntroductionFormat } from "./formats/introduction-format";
import { PickAnswerFormat } from "./formats/pick-answer-format";
import { SpotLieFormat } from "./formats/spot-lie-format";
import { MatchPairsFormat } from "./formats/match-pairs-format";
import { WordScrambleFormat } from "./formats/word-scramble-format";
import { FillGapFormat } from "./formats/fill-gap-format";
import { SentenceComprehensionFormat } from "./formats/sentence-comprehension-format";
import { SentenceTranslationFormat } from "./formats/sentence-translation-format";
import { ShellGameFormat } from "./formats/shell-game-format";
import { CardGameFormat } from "./formats/card-game-format";
import { MarbleGameFormat } from "./formats/marble-game-format";

interface Props {
  lesson: Lesson;
}

const ALL_FORMATS: { kind: FormatKind; label: string; difficulty: number }[] = [
  { kind: "introduction", label: "Introduction", difficulty: 0 },
  { kind: "pick-answer", label: "Pick the Answer", difficulty: 1 },
  { kind: "spot-lie", label: "Spot the Lie", difficulty: 1 },
  { kind: "match-pairs", label: "Match Pairs", difficulty: 2 },
  { kind: "word-scramble", label: "Word Scramble", difficulty: 2 },
  { kind: "fill-gap", label: "Fill the Gap", difficulty: 3 },
  { kind: "sentence-comprehension", label: "Sentence Comprehension", difficulty: 3 },
  { kind: "sentence-translation", label: "Sentence Translation", difficulty: 3 },
  { kind: "shell-game", label: "Shell Game", difficulty: 4 },
  { kind: "card-game", label: "Card Game", difficulty: 4 },
  { kind: "marble-game", label: "Marble Game", difficulty: 4 },
];

export function DebugGameTester({ lesson }: Props) {
  const [selectedFormat, setSelectedFormat] = useState<FormatKind>("pick-answer");
  const [selectedWordIdx, setSelectedWordIdx] = useState<number>(0);
  const [spec, setSpec] = useState<QuestionSpec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renderKey, setRenderKey] = useState(0);
  const [lastResult, setLastResult] = useState<boolean | null>(null);

  const word = lesson.words[selectedWordIdx];
  const wordProgress = lesson.progress[selectedWordIdx];

  const generateSpec = useCallback(() => {
    setError(null);
    setLastResult(null);
    if (!word || !wordProgress) {
      setError("No word selected");
      setSpec(null);
      return;
    }

    // Use a mastery high enough for the format to work.
    const formatDiff = FORMAT_DIFFICULTY[selectedFormat];
    const effectiveMastery = Math.max(wordProgress.mastery, formatDiff);

    let generated: QuestionSpec | null = null;
    try {
      switch (selectedFormat) {
        case "introduction":
          generated = genIntroduction(word);
          break;
        case "pick-answer":
          generated = genPickAnswer(lesson, word, effectiveMastery);
          break;
        case "spot-lie":
          generated = genSpotLie(lesson, word, effectiveMastery);
          break;
        case "match-pairs": {
          // For match-pairs, use all eligible words.
          const eligible = lesson.progress.filter((p) => p.seen && p.mastery >= formatDiff);
          const matchWords = eligible.length >= 3
            ? eligible.map((wp) => lesson.words[wp.wordIndex]).filter(Boolean)
            : lesson.words; // fallback: use all words
          generated = genMatchPairs(lesson, matchWords, effectiveMastery);
          break;
        }
        case "word-scramble":
          generated = genWordScramble(lesson, word, effectiveMastery);
          break;
        case "fill-gap":
          generated = genFillGap(lesson, word, effectiveMastery);
          break;
        case "sentence-comprehension":
          generated = genSentenceComprehension(lesson, word, effectiveMastery);
          break;
        case "sentence-translation":
          generated = genSentenceTranslation(lesson, word, effectiveMastery);
          break;
        case "shell-game":
          generated = genShellGame(lesson, word, effectiveMastery);
          break;
        case "card-game":
          generated = genCardGame(lesson, word, effectiveMastery);
          break;
        case "marble-game":
          generated = genMarbleGame(lesson, word, effectiveMastery);
          break;
      }
    } catch (e) {
      setError(`Generator threw: ${(e as Error).message}`);
      setSpec(null);
      return;
    }

    if (!generated) {
      setError(
        `Generator returned null. This format may require more word aspects or sentences. ` +
        `Word "${word.word}" has ${countAspects(word)} aspects.` +
        (selectedFormat === "match-pairs" ? " Match Pairs needs >= 3 eligible words." : "")
      );
      setSpec(null);
    } else {
      setSpec(generated);
      setRenderKey((k) => k + 1);
    }
  }, [lesson, word, wordProgress, selectedFormat]);

  const handleAnswer = (correct: boolean, message?: string) => {
    setLastResult(correct);
    playSound(correct ? "correct" : "incorrect");
    // Don't record the answer — this is just for debugging.
  };

  const handleNext = () => {
    generateSpec();
  };

  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Bug className="w-4 h-4" /> Debug: Game Mode Tester
            </CardTitle>
            <CardDescription>
              Test any format with any word. Answers are not recorded.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Format</Label>
            <Select value={selectedFormat} onValueChange={(v) => { setSelectedFormat(v as FormatKind); setSpec(null); setError(null); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_FORMATS.map((f) => (
                  <SelectItem key={f.kind} value={f.kind}>
                    {f.label} (Diff {f.difficulty})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Word</Label>
            <Select value={String(selectedWordIdx)} onValueChange={(v) => { setSelectedWordIdx(Number(v)); setSpec(null); setError(null); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {lesson.words.map((w, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {w.word} ({w.translation}) — {countAspects(w)} aspects
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button onClick={generateSpec} className="w-full theme-primary theme-primary-hover text-white">
              <RefreshCw className="w-4 h-4 mr-1" /> Generate
            </Button>
          </div>
        </div>

        {/* Word info */}
        {word && (
          <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
            <Badge variant="outline">Mastery: {wordProgress?.mastery ?? 0}</Badge>
            <Badge variant="outline">Aspects: {countAspects(word)}</Badge>
            {word.sentences && <Badge variant="outline">Sentences: {word.sentences.length}</Badge>}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm">
            {error}
          </div>
        )}

        {/* Rendered format */}
        {spec && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{selectedFormat}</Badge>
              <div className="flex gap-2">
                {lastResult !== null && (
                  <Badge variant={lastResult ? "default" : "destructive"} className={lastResult ? "theme-primary" : ""}>
                    {lastResult ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                    {lastResult ? "Correct" : "Incorrect"}
                  </Badge>
                )}
                <Button size="sm" variant="outline" onClick={handleNext}>
                  <RefreshCw className="w-3 h-3 mr-1" /> New Question
                </Button>
              </div>
            </div>
            <div key={renderKey}>
              <DebugFormatRenderer spec={spec} onAnswer={handleAnswer} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DebugFormatRenderer({
  spec,
  onAnswer,
}: {
  spec: QuestionSpec;
  onAnswer: (correct: boolean, message?: string) => void;
}) {
  // The debug renderer manages its own feedback state so we can dismiss and regenerate.
  const [feedback, setFeedback] = useState<null | { correct: boolean; message?: string }>(null);

  const handleAnswer = (correct: boolean, message?: string) => {
    setFeedback({ correct, message });
    onAnswer(correct, message);
  };

  switch (spec.format) {
    case "introduction":
      return <IntroductionFormat spec={spec} onAnswer={handleAnswer} disabled={feedback !== null} />;
    case "pick-answer":
      return <PickAnswerFormat spec={spec} onAnswer={handleAnswer} disabled={feedback !== null} feedback={feedback} />;
    case "spot-lie":
      return <SpotLieFormat spec={spec} onAnswer={handleAnswer} disabled={feedback !== null} feedback={feedback} />;
    case "match-pairs":
      return <MatchPairsFormat spec={spec} onAnswer={handleAnswer} disabled={feedback !== null} feedback={feedback} />;
    case "word-scramble":
      return <WordScrambleFormat spec={spec} onAnswer={handleAnswer} disabled={feedback !== null} feedback={feedback} />;
    case "fill-gap":
      return <FillGapFormat spec={spec} onAnswer={handleAnswer} disabled={feedback !== null} feedback={feedback} />;
    case "sentence-comprehension":
      return <SentenceComprehensionFormat spec={spec} onAnswer={handleAnswer} disabled={feedback !== null} feedback={feedback} />;
    case "sentence-translation":
      return <SentenceTranslationFormat spec={spec} onAnswer={handleAnswer} disabled={feedback !== null} feedback={feedback} />;
    case "shell-game":
      return <ShellGameFormat spec={spec} onAnswer={handleAnswer} disabled={feedback !== null} feedback={feedback} />;
    case "card-game":
      return <CardGameFormat spec={spec} onAnswer={handleAnswer} disabled={feedback !== null} feedback={feedback} />;
    case "marble-game":
      return <MarbleGameFormat spec={spec} onAnswer={handleAnswer} disabled={feedback !== null} feedback={feedback} />;
  }
}

// Count how many non-empty aspects a word has.
function countAspects(word: Word): number {
  let count = 1; // word itself
  if (word.translation) count++;
  if (word.definition) count++;
  if (word.synonym) count++;
  if (word.explanation) count++;
  if (word.alt1) count++;
  if (word.alt2) count++;
  if (word.alt3) count++;
  return count;
}
