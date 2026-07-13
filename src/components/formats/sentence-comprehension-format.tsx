"use client";

import { useState } from "react";
import { SentenceComprehensionSpec } from "@/lib/formats";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface Props {
  spec: SentenceComprehensionSpec;
  onAnswer: (correct: boolean, message?: string) => void;
  disabled: boolean;
  feedback: null | { correct: boolean; message?: string };
}

export function SentenceComprehensionFormat({ spec, onAnswer, disabled, feedback }: Props) {
  // Track which blank is filled with which option.
  // blanks: array of { idx, answer, filled }
  const blankIndices = spec.tokens
    .map((t, i) => (t.blank ? i : -1))
    .filter((i) => i >= 0);

  const [filled, setFilled] = useState<Record<number, string>>({});
  const [usedOptions, setUsedOptions] = useState<Set<string>>(new Set());
  const [activeBlank, setActiveBlank] = useState<number | null>(blankIndices[0] ?? null);

  const handleOptionClick = (option: string) => {
    if (disabled || usedOptions.has(option) || activeBlank === null) return;
    setFilled((prev) => ({ ...prev, [activeBlank]: option }));
    setUsedOptions((prev) => new Set(prev).add(option));
    // Move to next unfilled blank
    const nextBlank = blankIndices.find((bi) => !filled[bi] && bi !== activeBlank);
    setActiveBlank(nextBlank ?? null);
  };

  const handleBlankClick = (blankIdx: number) => {
    if (disabled) return;
    if (filled[blankIdx]) {
      // Remove the option from this blank
      const option = filled[blankIdx];
      const newFilled = { ...filled };
      delete newFilled[blankIdx];
      setFilled(newFilled);
      setUsedOptions((prev) => {
        const next = new Set(prev);
        next.delete(option);
        return next;
      });
    }
    setActiveBlank(blankIdx);
  };

  const allFilled = blankIndices.every((bi) => filled[bi]);

  const handleSubmit = () => {
    if (!allFilled || disabled) return;
    let allCorrect = true;
    for (const bi of blankIndices) {
      const token = spec.tokens[bi];
      if (filled[bi] !== token.answer) {
        allCorrect = false;
        break;
      }
    }
    onAnswer(
      allCorrect,
      allCorrect
        ? undefined
        : `Correct: ${blankIndices.map((bi) => spec.tokens[bi].answer).join(", ")}`
    );
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Sentence Comprehension
          </div>
          <div className="text-sm text-muted-foreground">Fill in the blanks</div>
        </div>

        {/* Sentence */}
        <div className="bg-muted/30 rounded-lg p-4 text-lg leading-relaxed flex flex-wrap gap-1 items-center">
          {spec.tokens.map((token, i) => {
            if (!token.blank) {
              return (
                <span key={i} className="relative">
                  {token.text}
                  {token.translation && (
                    <sup className="ml-0.5 text-xs text-muted-foreground">[{token.translation}]</sup>
                  )}
                </span>
              );
            }
            const isActive = activeBlank === i;
            const value = filled[i];
            return (
              <button
                key={i}
                onClick={() => handleBlankClick(i)}
                disabled={disabled}
                className={`min-w-[3rem] px-2 py-0.5 rounded border-2 text-base font-medium transition-colors ${
                  value
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                    : isActive
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10"
                    : "border-dashed border-muted-foreground/40"
                }`}
              >
                {value || "___"}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-muted-foreground text-center italic">
          {spec.translation}
        </div>

        {/* Options */}
        <div className="flex flex-wrap justify-center gap-2">
          {spec.options.map((option, i) => {
            const isUsed = usedOptions.has(option);
            return (
              <button
                key={i}
                onClick={() => handleOptionClick(option)}
                disabled={disabled || isUsed}
                className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                  isUsed
                    ? "border-muted bg-muted/30 opacity-30"
                    : "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:border-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={disabled || !allFilled}
          className="w-full bg-emerald-500 hover:bg-emerald-600"
          size="lg"
        >
          <Check className="w-4 h-4 mr-1" /> Submit
        </Button>
      </CardContent>
    </Card>
  );
}
