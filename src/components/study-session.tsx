"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { StudyMode, FormatKind, Lesson } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Heart, Clock, CheckCircle2, XCircle } from "lucide-react";
import { sessionGoal, sessionTimeLimitMs, sessionLives } from "@/lib/mastery";
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
import { wordsEligibleForFormat, wordsForIntroduction } from "@/lib/mastery";
import { randomItem } from "@/lib/formats";

interface ActiveFormat {
  kind: FormatKind;
  spec: QuestionSpec;
  wordIndex: number;
  // For formats that serve multiple sub-questions (shell game), track sub-index.
  subQuestionIndex: number;
  totalSubQuestions: number;
}

// Module-level helper: builds the next active format from the lesson + store picker.
function buildActiveFormat(
  lesson: Lesson,
  lessonId: string,
  pickSessionFormat: (lessonId: string) => FormatKind | null
): ActiveFormat | null {
  const format = pickSessionFormat(lessonId);
  if (!format) return null;

  let words = wordsEligibleForFormat(lesson, format);
  if (words.length === 0) {
    if (format === "introduction") return null;
    words = lesson.progress.filter((p) => p.seen);
    if (words.length === 0) return null;
  }

  const wordProgress = randomItem(words);
  const word = lesson.words[wordProgress.wordIndex];
  if (!word) return null;

  let spec: QuestionSpec | null = null;
  const mastery = wordProgress.mastery;

  switch (format) {
    case "introduction":
      spec = genIntroduction(word);
      break;
    case "pick-answer":
      spec = genPickAnswer(lesson, word, mastery);
      break;
    case "spot-lie":
      spec = genSpotLie(lesson, word, mastery);
      break;
    case "match-pairs": {
      const matchWords = words.map((wp) => lesson.words[wp.wordIndex]).filter(Boolean);
      spec = genMatchPairs(lesson, matchWords, mastery);
      break;
    }
    case "word-scramble":
      spec = genWordScramble(lesson, word, mastery);
      break;
    case "fill-gap":
      spec = genFillGap(lesson, word, mastery);
      break;
    case "sentence-comprehension":
      spec = genSentenceComprehension(lesson, word, mastery);
      break;
    case "shell-game":
      spec = genShellGame(lesson, word, mastery);
      break;
    case "memory-grid":
      spec = genMemoryGrid(lesson, word, mastery);
      break;
  }

  if (!spec) return null;

  let totalSub = 1;
  if (format === "shell-game") {
    totalSub = 3;
  }

  return {
    kind: format,
    spec,
    wordIndex: wordProgress.wordIndex,
    subQuestionIndex: 0,
    totalSubQuestions: totalSub,
  };
}

export function StudySession({ lessonId, mode }: { lessonId: string; mode: StudyMode }) {
  const data = useAppStore((s) => s.data);
  const setView = useAppStore((s) => s.setView);
  const endSession = useAppStore((s) => s.endSession);
  const pickSessionFormat = useAppStore((s) => s.pickSessionFormat);
  const recordAnswer = useAppStore((s) => s.recordAnswer);

  const sessionQuestionsServed = useAppStore((s) => s.sessionQuestionsServed);
  const sessionCorrect = useAppStore((s) => s.sessionCorrect);
  const sessionIncorrect = useAppStore((s) => s.sessionIncorrect);
  const sessionLivesLeft = useAppStore((s) => s.sessionLives);
  const sessionEndAt = useAppStore((s) => s.sessionEndAt);

  const lesson = data.lessons.find((l) => l.id === lessonId);

  // Build the initial active format lazily so we don't need an effect for it.
  const buildInitial = useCallback((): ActiveFormat | null => {
    if (!lesson) return null;
    return buildActiveFormat(lesson, lessonId, pickSessionFormat);
  }, [lesson, lessonId, pickSessionFormat]);

  const [active, setActive] = useState<ActiveFormat | null>(null);
  const [feedback, setFeedback] = useState<null | { correct: boolean; message?: string }>(null);
  const [timeLeft, setTimeLeft] = useState(mode === "rush" ? 300 : 0);
  const [sessionDone, setSessionDone] = useState(false);
  const [initTried, setInitTried] = useState(false);
  const goal = sessionGoal(mode);
  const livesStart = sessionLives(mode);

  // If we haven't initialized yet and lesson is available, do it now.
  // This is done during render (not in an effect) to avoid cascading renders.
  if (!active && !sessionDone && !feedback && !initTried && lesson) {
    setInitTried(true);
    const next = buildInitial();
    if (!next) {
      setSessionDone(true);
    } else {
      setActive(next);
    }
  }

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

  // Build the next format spec
  const buildNext = useCallback((): ActiveFormat | null => {
    if (!lesson) return null;
    return buildActiveFormat(lesson, lessonId, pickSessionFormat);
  }, [lesson, lessonId, pickSessionFormat]);

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
      const next = buildNext();
      if (!next) {
        setSessionDone(true);
      } else {
        setActive(next);
      }
    },
    [buildNext]
  );

  const handleAnswer = useCallback(
    (correct: boolean, message?: string) => {
      if (!active || feedback) return;

      const result = recordAnswer(lessonId, active.wordIndex, active.kind, correct);
      const currentActive = active;

      setFeedback({ correct, message });

      // After feedback, advance
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

  // Session summary screen
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
                lesson={lesson}
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
  lesson,
  onAnswer,
  feedback,
}: {
  active: ActiveFormat;
  lesson: Lesson;
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
function regenerateShellPrompt(spec: Extract<QuestionSpec, { format: "shell-game" }>): typeof spec {
  // Pick a new random shell as the target.
  const newTarget = Math.floor(Math.random() * spec.shellItems.length);
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
