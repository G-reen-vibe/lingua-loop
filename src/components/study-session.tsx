"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { StudyMode, FormatKind, Lesson } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Heart, Clock, CheckCircle2, XCircle } from "lucide-react";
import { sessionGoal, sessionLives } from "@/lib/mastery";
import { IntroductionFormat } from "./formats/introduction-format";
import { PickAnswerFormat } from "./formats/pick-answer-format";
import { SpotLieFormat } from "./formats/spot-lie-format";
import { MatchPairsFormat } from "./formats/match-pairs-format";
import { WordScrambleFormat } from "./formats/word-scramble-format";
import { FillGapFormat } from "./formats/fill-gap-format";
import { SentenceComprehensionFormat } from "./formats/sentence-comprehension-format";
import { ShellGameFormat } from "./formats/shell-game-format";
import { MemoryGridFormat } from "./formats/memory-grid-format";
import {
  QuestionSpec,
  genIntroduction,
  genPickAnswer,
  genSpotLie,
  genMatchPairs,
  genWordScramble,
  genFillGap,
  genSentenceComprehension,
  genShellGame,
  genMemoryGrid,
} from "@/lib/formats";
import { wordsEligibleForFormat, allFormatKinds } from "@/lib/mastery";
import { FORMAT_DIFFICULTY, WordProgress } from "@/lib/types";

interface ActiveFormat {
  kind: FormatKind;
  spec: QuestionSpec;
  wordIndex: number;
  subQuestionIndex: number;
  totalSubQuestions: number;
}

// Tries to generate a spec for a single format + word.
function tryGenerate(
  lesson: Lesson,
  format: FormatKind,
  wordProgress: WordProgress
): QuestionSpec | null {
  const word = lesson.words[wordProgress.wordIndex];
  if (!word) return null;
  const mastery = wordProgress.mastery;
  switch (format) {
    case "introduction":
      return genIntroduction(word);
    case "pick-answer":
      return genPickAnswer(lesson, word, mastery);
    case "spot-lie":
      return genSpotLie(lesson, word, mastery);
    case "word-scramble":
      return genWordScramble(lesson, word, mastery);
    case "fill-gap":
      return genFillGap(lesson, word, mastery);
    case "sentence-comprehension":
      return genSentenceComprehension(lesson, word, mastery);
    case "shell-game":
      return genShellGame(lesson, word, mastery);
    case "memory-grid":
      return genMemoryGrid(lesson, word, mastery);
    case "match-pairs":
      return null; // handled separately (needs multiple words)
  }
}

// Builds the next active format. Tries the store-suggested format first;
// if its generator fails, falls back to other eligible formats.
function buildActiveFormat(
  lesson: Lesson,
  lessonId: string,
  pickSessionFormat: (lessonId: string) => FormatKind | null,
  recentFormats: FormatKind[]
): ActiveFormat | null {
  const suggested = pickSessionFormat(lessonId);

  // Build a list of formats to try, suggested first, then all others.
  const formatsToTry: FormatKind[] = [];
  if (suggested) formatsToTry.push(suggested);
  for (const f of allFormatKinds()) {
    if (f === "introduction") continue;
    if (!formatsToTry.includes(f)) formatsToTry.push(f);
  }

  for (const format of formatsToTry) {
    // Match-pairs needs multiple words — handle specially.
    if (format === "match-pairs") {
      const eligible = wordsEligibleForFormat(lesson, format);
      if (eligible.length < 3) continue;
      const matchWords = eligible
        .map((wp) => lesson.words[wp.wordIndex])
        .filter(Boolean);
      const spec = genMatchPairs(lesson, matchWords, eligible[0].mastery);
      if (spec) {
        return {
          kind: format,
          spec,
          wordIndex: eligible[0].wordIndex,
          subQuestionIndex: 0,
          totalSubQuestions: 1,
        };
      }
      continue;
    }

    let words = wordsEligibleForFormat(lesson, format);
    if (words.length === 0) {
      if (format === "introduction") continue;
      const diff = FORMAT_DIFFICULTY[format];
      words = lesson.progress.filter((p) => p.seen && p.mastery >= diff);
      if (words.length === 0) continue;
    }

    // Try up to 5 random words from the eligible pool.
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    for (const wp of shuffled.slice(0, 5)) {
      const spec = tryGenerate(lesson, format, wp);
      if (spec) {
        return {
          kind: format,
          spec,
          wordIndex: wp.wordIndex,
          subQuestionIndex: 0,
          totalSubQuestions: format === "shell-game" ? 3 : 1,
        };
      }
    }
  }

  return null;
}

export function StudySession({ lessonId, mode }: { lessonId: string; mode: StudyMode }) {
  const data = useAppStore((s) => s.data);
  const setView = useAppStore((s) => s.setView);
  const endSession = useAppStore((s) => s.endSession);
  const pickSessionFormat = useAppStore((s) => s.pickSessionFormat);
  const recordAnswer = useAppStore((s) => s.recordAnswer);
  const session = useAppStore((s) => s.session);

  const lesson = data.lessons.find((l) => l.id === lessonId);

  const [active, setActive] = useState<ActiveFormat | null>(null);
  const [feedback, setFeedback] = useState<null | { correct: boolean; message?: string }>(null);
  const [timeLeft, setTimeLeft] = useState(mode === "rush" ? 300 : 0);
  const [sessionDone, setSessionDone] = useState(false);
  const [initTried, setInitTried] = useState(false);

  const goal = sessionGoal(mode);
  const livesStart = sessionLives(mode);
  const sessionQuestionsServed = session?.questionsServed ?? 0;
  const sessionCorrect = session?.correct ?? 0;
  const sessionIncorrect = session?.incorrect ?? 0;
  const sessionLivesLeft = session?.lives ?? 0;
  const sessionEndAt = session?.endAt ?? 0;
  const sessionRecentFormats = session?.recentFormats ?? [];

  // Build the next format spec.
  const buildNext = useCallback((): ActiveFormat | null => {
    if (!lesson) return null;
    return buildActiveFormat(lesson, lessonId, pickSessionFormat, sessionRecentFormats);
  }, [lesson, lessonId, pickSessionFormat, sessionRecentFormats]);

  // Initialize the first format.
  if (!active && !sessionDone && !feedback && !initTried && lesson) {
    setInitTried(true);
    const next = buildNext();
    if (!next) setSessionDone(true);
    else setActive(next);
  }

  // Keep a ref to the latest buildNext so setTimeout callbacks avoid stale closures.
  const buildNextRef = useRef(buildNext);
  useEffect(() => {
    buildNextRef.current = buildNext;
  }, [buildNext]);

  // Timer for rush mode
  useEffect(() => {
    if (mode !== "rush" || sessionDone) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((sessionEndAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setSessionDone(true);
        clearInterval(interval);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [mode, sessionEndAt, sessionDone]);

  const advance = useCallback(
    (currentActive: ActiveFormat | null, resultDone: boolean) => {
      if (resultDone) {
        setSessionDone(true);
        return;
      }
      // Shell game: advance sub-question or move to next format
      if (
        currentActive &&
        currentActive.kind === "shell-game" &&
        currentActive.subQuestionIndex + 1 < currentActive.totalSubQuestions
      ) {
        setActive({
          ...currentActive,
          subQuestionIndex: currentActive.subQuestionIndex + 1,
          spec: regenerateShellPrompt(currentActive.spec),
        });
        return;
      }
      const next = buildNextRef.current();
      if (!next) setSessionDone(true);
      else setActive(next);
    },
    []
  );

  const handleAnswer = useCallback(
    (correct: boolean, message?: string) => {
      if (!active || feedback) return;

      // For match-pairs, pass all word indices so mastery is updated for all pairs.
      const allIndices =
        active.kind === "match-pairs" && active.spec.format === "match-pairs"
          ? (active.spec as Extract<QuestionSpec, { format: "match-pairs" }>).wordIndices
          : undefined;

      const result = recordAnswer(lessonId, active.wordIndex, active.kind, correct, allIndices);
      const currentActive = active;

      setFeedback({ correct, message });

      setTimeout(() => {
        setFeedback(null);
        advance(currentActive, result.done);
      }, 1200);
    },
    [active, feedback, recordAnswer, lessonId, advance]
  );

  if (!lesson) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Lesson not found.</p>
        <Button onClick={() => setView({ kind: "home" })}>Back</Button>
      </div>
    );
  }

  if (sessionDone) {
    return (
      <SessionSummary
        mode={mode}
        served={sessionQuestionsServed}
        correct={sessionCorrect}
        incorrect={sessionIncorrect}
        onExit={() => {
          endSession();
          setView({ kind: "lesson", lessonId });
        }}
      />
    );
  }

  const progressPct = (sessionQuestionsServed / goal) * 100;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background">
      <header className="border-b bg-white/80 dark:bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm("Quit this session? Progress will be saved.")) {
                endSession();
                setView({ kind: "lesson", lessonId });
              }
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Quit
          </Button>

          <div className="flex-1 max-w-md">
            <Progress value={progressPct} className="h-2" />
            <div className="text-xs text-center text-muted-foreground mt-1">
              {sessionQuestionsServed} / {mode === "rush" ? "∞" : goal} questions
            </div>
          </div>

          <div className="flex items-center gap-3">
            {mode === "rush" && (
              <div className="flex items-center gap-1 text-sm font-mono">
                <Clock className="w-4 h-4" />
                {mins}:{String(secs).padStart(2, "0")}
              </div>
            )}
            {mode === "rush" && (
              <div className="flex gap-0.5">
                {Array.from({ length: livesStart }).map((_, i) => (
                  <Heart
                    key={i}
                    className={`w-4 h-4 ${i < sessionLivesLeft ? "text-rose-500 fill-rose-500" : "text-muted-foreground"}`}
                  />
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> {sessionCorrect}
              </span>
              <span className="text-rose-600 flex items-center gap-1">
                <XCircle className="w-4 h-4" /> {sessionIncorrect}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1 flex items-center justify-center">
        <div className="w-full max-w-3xl">
          {active && (
            <>
              <div className="mb-4 flex items-center justify-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {active.kind.replace(/-/g, " ")}
                </Badge>
                {active.totalSubQuestions > 1 && (
                  <Badge variant="outline">
                    Round {active.subQuestionIndex + 1}/{active.totalSubQuestions}
                  </Badge>
                )}
              </div>

              <FormatRenderer
                key={`${active.kind}-${active.subQuestionIndex}-${sessionQuestionsServed}`}
                active={active}
                onAnswer={handleAnswer}
                feedback={feedback}
              />
            </>
          )}

          {feedback && (
            <div
              className={`mt-4 p-4 rounded-lg text-center font-medium ${
                feedback.correct
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
              }`}
            >
              {feedback.correct ? "Correct!" : "Incorrect"}
              {feedback.message && <div className="text-sm font-normal mt-1">{feedback.message}</div>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function FormatRenderer({
  active,
  onAnswer,
  feedback,
}: {
  active: ActiveFormat;
  onAnswer: (correct: boolean, message?: string) => void;
  feedback: null | { correct: boolean; message?: string };
}) {
  const spec = active.spec;
  const disabled = feedback !== null;

  switch (spec.format) {
    case "introduction":
      return <IntroductionFormat spec={spec} onAnswer={onAnswer} disabled={disabled} />;
    case "pick-answer":
      return <PickAnswerFormat spec={spec} onAnswer={onAnswer} disabled={disabled} feedback={feedback} />;
    case "spot-lie":
      return <SpotLieFormat spec={spec} onAnswer={onAnswer} disabled={disabled} feedback={feedback} />;
    case "match-pairs":
      return <MatchPairsFormat spec={spec} onAnswer={onAnswer} disabled={disabled} />;
    case "word-scramble":
      return <WordScrambleFormat spec={spec} onAnswer={onAnswer} disabled={disabled} feedback={feedback} />;
    case "fill-gap":
      return <FillGapFormat spec={spec} onAnswer={onAnswer} disabled={disabled} feedback={feedback} />;
    case "sentence-comprehension":
      return <SentenceComprehensionFormat spec={spec} onAnswer={onAnswer} disabled={disabled} feedback={feedback} />;
    case "shell-game":
      return <ShellGameFormat spec={spec} onAnswer={onAnswer} disabled={disabled} feedback={feedback} />;
    case "memory-grid":
      return <MemoryGridFormat spec={spec} onAnswer={onAnswer} disabled={disabled} feedback={feedback} />;
  }
}

// Regenerate the prompt for a shell game sub-question (same shells, new prompt).
// Avoids repeating the same target as the previous sub-question.
function regenerateShellPrompt(spec: Extract<QuestionSpec, { format: "shell-game" }>): typeof spec {
  let newTarget = Math.floor(Math.random() * spec.shellItems.length);
  if (spec.shellItems.length > 1) {
    while (newTarget === spec.correctShell) {
      newTarget = Math.floor(Math.random() * spec.shellItems.length);
    }
  }
  return {
    ...spec,
    prompt: spec.shellItems[newTarget],
    promptKey: spec.shellKeys[newTarget],
    correctShell: newTarget,
    shuffleOrder: spec.shuffleOrder,
  };
}

function SessionSummary({
  mode,
  served,
  correct,
  incorrect,
  onExit,
}: {
  mode: StudyMode;
  served: number;
  correct: number;
  incorrect: number;
  onExit: () => void;
}) {
  const accuracy = served > 0 ? (correct / served) * 100 : 0;
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Session Complete!</h2>
            <p className="text-muted-foreground capitalize">{mode} mode</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold">{served}</div>
              <div className="text-xs text-muted-foreground">Questions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-600">{correct}</div>
              <div className="text-xs text-muted-foreground">Correct</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-rose-600">{incorrect}</div>
              <div className="text-xs text-muted-foreground">Incorrect</div>
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Accuracy</div>
            <Progress value={accuracy} className="h-3" />
            <div className="text-lg font-bold mt-1">{accuracy.toFixed(0)}%</div>
          </div>
          <Button onClick={onExit} className="w-full bg-emerald-500 hover:bg-emerald-600">
            Back to Lesson
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
