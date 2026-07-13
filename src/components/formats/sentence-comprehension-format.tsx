"use client";

import { useState } from "react";
import { SentenceComprehensionSpec } from "@/lib/formats";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { playSound } from "@/lib/sounds";

interface Props {
  spec: SentenceComprehensionSpec;
  onAnswer: (correct: boolean, message?: string) => void;
  disabled: boolean;
  feedback: null | { correct: boolean; message?: string };
}

export function SentenceComprehensionFormat({ spec, onAnswer, disabled, feedback }: Props) {
  const blankIndices = spec.tokens
    .map((t, i) => (t.blank ? i : -1))
    .filter((i) => i >= 0);

  // Track which option INDEX is placed in which blank INDEX.
  // Using indices avoids ambiguity when duplicate values exist in options.
  const [filled, setFilled] = useState<Record<number, number>>({}); // blankIdx -> optionIdx
  const [usedOptionIndices, setUsedOptionIndices] = useState<Set<number>>(new Set());
  const [activeBlank, setActiveBlank] = useState<number | null>(blankIndices[0] ?? null);

  const handleOptionClick = (optionIdx: number) => {
    if (disabled || usedOptionIndices.has(optionIdx) || activeBlank === null) return;
    playSound("click");
    setFilled((prev) => ({ ...prev, [activeBlank]: optionIdx }));
    setUsedOptionIndices((prev) => new Set(prev).add(optionIdx));
    const nextBlank = blankIndices.find((bi) => !(bi in filled) && bi !== activeBlank);
    setActiveBlank(nextBlank ?? null);
  };

  const handleBlankClick = (blankIdx: number) => {
    if (disabled) return;
    if (blankIdx in filled) {
      playSound("click");
      const optionIdx = filled[blankIdx];
      const newFilled = { ...filled };
      delete newFilled[blankIdx];
      setFilled(newFilled);
      setUsedOptionIndices((prev) => {
        const next = new Set(prev);
        next.delete(optionIdx);
        return next;
      });
    }
    setActiveBlank(blankIdx);
  };

  const allFilled = blankIndices.every((bi) => bi in filled);

  const handleSubmit = () => {
    if (!allFilled || disabled) return;
    let allCorrect = true;
    for (const bi of blankIndices) {
      const token = spec.tokens[bi];
      const optionIdx = filled[bi];
      if (spec.options[optionIdx] !== token.answer) {
        allCorrect = false;
        break;
      }
    }
    playSound(allCorrect ? "correct" : "incorrect");
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
            const optionIdx = filled[i];
            const value = optionIdx !== undefined ? spec.options[optionIdx] : undefined;
            return (
              <button
                key={i}
                onClick={() => handleBlankClick(i)}
                disabled={disabled}
                className={`min-w-[3rem] px-2 py-0.5 rounded border-2 text-base font-medium transition-colors ${
                  value
                    ? "theme-border theme-bg-light"
                    : isActive
                    ? "theme-border theme-bg-light"
                    : "border-dashed border-muted-foreground/40"
                }`}
                style={value || isActive ? { borderColor: "var(--theme-primary)" } : {}}
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
            const isUsed = usedOptionIndices.has(i);
            return (
              <button
                key={i}
                onClick={() => handleOptionClick(i)}
                disabled={disabled || isUsed}
                className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                  isUsed
                    ? "border-muted bg-muted/30 opacity-30"
                    : "theme-border theme-bg-light hover:opacity-80"
                }`}
                style={!isUsed ? { borderColor: "var(--theme-primary)" } : {}}
              >
                {option}
              </button>
            );
          })}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={disabled || !allFilled}
          className="w-full theme-primary theme-primary-hover text-white"
          size="lg"
        >
          <Check className="w-4 h-4 mr-1" /> Submit
        </Button>
      </CardContent>
    </Card>
  );
}
