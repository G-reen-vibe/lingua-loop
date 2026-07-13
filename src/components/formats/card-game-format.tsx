"use client";

import { useState, useEffect } from "react";
import { CardGameSpec } from "@/lib/formats";
import { Card, CardContent } from "@/components/ui/card";
import { playSound } from "@/lib/sounds";

interface Props {
  spec: CardGameSpec;
  onAnswer: (correct: boolean, message?: string) => void;
  disabled: boolean;
  feedback: null | { correct: boolean; message?: string };
}

type Phase = "memorize" | "hidden" | "result";

export function CardGameFormat({ spec, onAnswer, disabled, feedback }: Props) {
  const [phase, setPhase] = useState<Phase>("memorize");
  const [pickedCard, setPickedCard] = useState<number | null>(null);

  useEffect(() => {
    playSound("reveal");
    const t = setTimeout(() => {
      setPhase("hidden");
      playSound("shuffle");
    }, 3500);
    return () => clearTimeout(t);
  }, [spec]);

  const handlePick = (cardIdx: number) => {
    if (disabled || phase !== "hidden" || pickedCard !== null) return;
    setPickedCard(cardIdx);
    setPhase("result");
    const correct = cardIdx === spec.correctCard;
    playSound(correct ? "correct" : "incorrect");
    onAnswer(correct, correct ? undefined : `Correct card was #${spec.correctCard + 1}`);
  };

  // Grid columns based on card count
  const cols = spec.cardItems.length === 4 ? 2 : 3;

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Card Game
          </div>
          <div className="text-sm text-muted-foreground">
            {phase === "memorize" && "Memorize the cards..."}
            {(phase === "hidden" || phase === "result") && (
              <>Find: <span className="font-bold theme-text">{spec.prompt}</span></>
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
                    ? "theme-border theme-bg-light"
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
