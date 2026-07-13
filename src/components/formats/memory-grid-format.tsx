"use client";

import { useState, useEffect } from "react";
import { MemoryGridSpec } from "@/lib/formats";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  spec: MemoryGridSpec;
  onAnswer: (correct: boolean, message?: string) => void;
  disabled: boolean;
  feedback: null | { correct: boolean; message?: string };
}

type Phase = "memorize" | "hidden" | "result";

export function MemoryGridFormat({ spec, onAnswer, disabled, feedback }: Props) {
  // Initialize state from the spec; the parent remounts this component
  // (via key) whenever a new spec arrives, so this initializer runs fresh.
  const [phase, setPhase] = useState<Phase>("memorize");
  const [pickedCard, setPickedCard] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setPhase("hidden"), 3500);
    return () => clearTimeout(t);
  }, [spec]);

  const handlePick = (cardIdx: number) => {
    if (disabled || phase !== "hidden" || pickedCard !== null) return;
    setPickedCard(cardIdx);
    setPhase("result");
    const correct = cardIdx === spec.correctCard;
    onAnswer(correct, correct ? undefined : `Correct card was #${spec.correctCard + 1}`);
  };

  // Grid columns based on card count
  const cols = spec.cardItems.length === 4 ? 2 : spec.cardItems.length === 6 ? 3 : 3;

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Memory Grid
          </div>
          <div className="text-sm text-muted-foreground">
            {phase === "memorize" && "Memorize the cards..."}
            {(phase === "hidden" || phase === "result") && (
              <>Find: <span className="font-bold text-emerald-600">{spec.prompt}</span></>
            )}
          </div>
        </div>

        <div
          className="grid gap-2 mx-auto"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, maxWidth: "28rem" }}
        >
          {spec.cardItems.map((item, i) => {
            const isRevealed = phase === "memorize" || phase === "result";
            const isPicked = pickedCard === i;
            const isCorrect = phase === "result" && i === spec.correctCard;
            return (
              <button
                key={i}
                onClick={() => handlePick(i)}
                disabled={disabled || phase !== "hidden"}
                className={`aspect-square rounded-lg border-2 flex items-center justify-center p-2 text-center transition-all ${
                  isPicked && !isCorrect
                    ? "border-rose-500 bg-rose-50 dark:bg-rose-900/20"
                    : isCorrect
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                    : phase === "hidden"
                    ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:border-amber-600 cursor-pointer"
                    : "border-border bg-muted/30"
                }`}
              >
                {isRevealed ? (
                  <span className="text-sm font-medium break-words">{item}</span>
                ) : (
                  <span className="text-3xl">?</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-muted-foreground text-center">
          {phase === "memorize" && "Cards will hide in a moment..."}
          {phase === "hidden" && "Click the card with the prompt item."}
        </div>
      </CardContent>
    </Card>
  );
}
