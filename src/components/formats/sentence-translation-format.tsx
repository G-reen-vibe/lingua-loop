"use client";

import { useState } from "react";
import { SentenceTranslationSpec } from "@/lib/formats";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { playSound } from "@/lib/sounds";

interface Props {
  spec: SentenceTranslationSpec;
  onAnswer: (correct: boolean, message?: string) => void;
  disabled: boolean;
  feedback: null | { correct: boolean; message?: string };
}

export function SentenceTranslationFormat({ spec, onAnswer, disabled, feedback }: Props) {
  const blankIndices = spec.tokens
    .map((t, i) => (t.blank ? i : -1))
    .filter((i) => i >= 0);

  const [filled, setFilled] = useState<Record<number, string>>({});
  const [usedOptions, setUsedOptions] = useState<Set<string>>(new Set());
  const [activeBlank, setActiveBlank] = useState<number | null>(blankIndices[0] ?? null);

  const handleOptionClick = (option: string) => {
    if (disabled || usedOptions.has(option) || activeBlank === null) return;
    playSound("click");
    setFilled((prev) => ({ ...prev, [activeBlank]: option }));
    setUsedOptions((prev) => new Set(prev).add(option));
    const nextBlank = blankIndices.find((bi) => !filled[bi] && bi !== activeBlank);
    setActiveBlank(nextBlank ?? null);
  };

  const handleBlankClick = (blankIdx: number) => {
    if (disabled) return;
    if (filled[blankIdx]) {
      playSound("click");
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
            Sentence Translation
          </div>
          <div className="text-sm text-muted-foreground">Translate to the target language:</div>
          <div className="text-lg font-semibold mt-2 italic">{spec.translation}</div>
        </div>

        {/* Sentence with blanks */}
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
                    ? "theme-border theme-bg-light"
                    : isActive
                    ? "theme-border theme-bg-light"
                    : "border-dashed border-muted-foreground/40"
                }`}
              >
                {value || "___"}
              </button>
            );
          })}
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
                    : "theme-border-hover border-theme-primary theme-bg-light hover:opacity-80"
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
