"use client";

import { useState, useEffect } from "react";
import { ShellGameSpec } from "@/lib/formats";
import { Card, CardContent } from "@/components/ui/card";
import { Shuffle } from "lucide-react";

interface Props {
  spec: ShellGameSpec;
  onAnswer: (correct: boolean, message?: string) => void;
  disabled: boolean;
  feedback: null | { correct: boolean; message?: string };
}

type Phase = "reveal" | "shuffle" | "pick" | "result";

export function ShellGameFormat({ spec, onAnswer, disabled, feedback }: Props) {
  // Initial state from spec; parent remounts via key when spec changes.
  const [phase, setPhase] = useState<Phase>("reveal");
  const [pickedShell, setPickedShell] = useState<number | null>(null);
  const [shuffledOrder, setShuffledOrder] = useState<number[]>(
    spec.shellItems.map((_, i) => i)
  );

  // Phase 1: reveal items for 2.5s, then shuffle, then allow picking.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const t1 = setTimeout(() => {
      setPhase("shuffle");
      // Animate shuffle: multiple position swaps over ~1s
      let swaps = 0;
      const maxSwaps = 8;
      interval = setInterval(() => {
        setShuffledOrder((prev) => {
          const next = [...prev];
          const a = Math.floor(Math.random() * next.length);
          let b = Math.floor(Math.random() * next.length);
          while (b === a) b = Math.floor(Math.random() * next.length);
          [next[a], next[b]] = [next[b], next[a]];
          return next;
        });
        swaps++;
        if (swaps >= maxSwaps) {
          if (interval) clearInterval(interval);
          setPhase("pick");
        }
      }, 120);
    }, 2500);
    return () => {
      clearTimeout(t1);
      if (interval) clearInterval(interval);
    };
  }, [spec]);

  const handlePick = (shellIdx: number) => {
    if (disabled || phase !== "pick" || pickedShell !== null) return;
    setPickedShell(shellIdx);
    setPhase("result");
    // The correctShell is the index in the ORIGINAL order.
    // After shuffling, the item at position `shellIdx` is shuffledOrder[shellIdx].
    // So the user picked the shell at position `shellIdx`, which contains item
    // spec.shellItems[shuffledOrder[shellIdx]].
    // The correct shell is the one whose shuffledOrder value === spec.correctShell.
    const correctPosition = shuffledOrder.indexOf(spec.correctShell);
    const correct = shellIdx === correctPosition;
    onAnswer(correct, correct ? undefined : `Correct shell was #${correctPosition + 1}`);
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Shell Game
          </div>
          <div className="text-sm text-muted-foreground">
            {phase === "reveal" && "Memorize the items..."}
            {phase === "shuffle" && (
              <span className="flex items-center justify-center gap-1">
                <Shuffle className="w-4 h-4 animate-pulse" /> Shuffling...
              </span>
            )}
            {(phase === "pick" || phase === "result") && (
              <>Find: <span className="font-bold text-emerald-600">{spec.prompt}</span></>
            )}
          </div>
        </div>

        {/* Shells */}
        <div className="flex justify-center gap-2 flex-wrap">
          {spec.shellItems.map((_, positionIdx) => {
            const itemIdx = shuffledOrder[positionIdx];
            const item = spec.shellItems[itemIdx];
            const isRevealed = phase === "reveal" || phase === "result";
            const isPicked = pickedShell === positionIdx;
            const correctPosition = phase === "result" ? shuffledOrder.indexOf(spec.correctShell) : -1;
            const isCorrect = phase === "result" && positionIdx === correctPosition;

            return (
              <button
                key={positionIdx}
                onClick={() => handlePick(positionIdx)}
                disabled={disabled || phase !== "pick"}
                className={`w-20 h-24 rounded-lg border-2 flex flex-col items-center justify-center p-2 transition-all ${
                  isPicked && !isCorrect
                    ? "border-rose-500 bg-rose-50 dark:bg-rose-900/20"
                    : isCorrect
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                    : phase === "pick"
                    ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:border-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 cursor-pointer"
                    : "border-border bg-muted/30"
                }`}
              >
                {isRevealed ? (
                  <span className="text-sm font-medium text-center break-words">{item}</span>
                ) : (
                  <span className="text-2xl">🥚</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-muted-foreground text-center">
          {phase === "pick" && "Click the shell hiding the prompt item."}
          {phase === "result" && (pickedShell !== null ? "Result shown" : "")}
        </div>
      </CardContent>
    </Card>
  );
}
