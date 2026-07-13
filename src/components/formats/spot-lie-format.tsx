"use client";

import { useState } from "react";
import { SpotLieSpec } from "@/lib/formats";
import { Card, CardContent } from "@/components/ui/card";
import { X, Check } from "lucide-react";

interface Props {
  spec: SpotLieSpec;
  onAnswer: (correct: boolean, message?: string) => void;
  disabled: boolean;
  feedback: null | { correct: boolean; message?: string };
}

export function SpotLieFormat({ spec, onAnswer, disabled, feedback }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  const handleClick = (idx: number) => {
    if (disabled || selected !== null) return;
    setSelected(idx);
    const pair = spec.pairs[idx];
    // Correct = user picked the INCORRECT pair (the lie).
    const correct = !pair.correct;
    onAnswer(correct, correct ? undefined : `The lie was: ${pair.left} — ${pair.right}`);
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Spot the Lie
          </div>
          <div className="text-sm text-muted-foreground">
            Which pair is incorrect?
          </div>
        </div>

        <div className="space-y-2">
          {spec.pairs.map((pair, i) => {
            const isSelected = selected === i;
            const showResult = selected !== null;
            const isLie = !pair.correct;
            return (
              <button
                key={i}
                onClick={() => handleClick(i)}
                disabled={disabled || selected !== null}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                  showResult && isLie
                    ? "border-rose-500 bg-rose-50 dark:bg-rose-900/20"
                    : showResult && isSelected && !isLie
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                    : showResult && !isLie
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                    : "border-border hover:border-emerald-300 hover:bg-muted/30"
                }`}
              >
                <div className="flex-1 flex items-center justify-center gap-3">
                  <span className="font-medium text-base">{pair.left}</span>
                  <span className="text-muted-foreground">—</span>
                  <span className="text-base text-muted-foreground">{pair.right}</span>
                </div>
                {showResult && isLie && <X className="w-5 h-5 text-rose-500" />}
                {showResult && !isLie && isSelected && <X className="w-5 h-5 text-amber-500" />}
                {showResult && !isLie && !isSelected && <Check className="w-5 h-5 text-emerald-500" />}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
