"use client";

import { useState } from "react";
import { MatchPairsSpec } from "@/lib/formats";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";
import { playSound } from "@/lib/sounds";

interface Props {
  spec: MatchPairsSpec;
  onAnswer: (correct: boolean, message?: string) => void;
  disabled: boolean;
  feedback: null | { correct: boolean; message?: string };
}

export function MatchPairsFormat({ spec, onAnswer, disabled, feedback }: Props) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState(0);
  const [wrongPair, setWrongPair] = useState<{ left: string; right: string } | null>(null);

  const correctMap: Record<string, string> = {};
  for (const p of spec.correctPairs) {
    correctMap[p.left] = p.right;
  }

  const handleClickLeft = (item: string) => {
    if (disabled || matched[item]) return;
    playSound("click");
    setSelectedLeft(item);
    if (selectedRight) tryMatch(item, selectedRight);
  };

  const handleClickRight = (item: string) => {
    if (disabled || Object.values(matched).includes(item)) return;
    playSound("click");
    setSelectedRight(item);
    if (selectedLeft) tryMatch(selectedLeft, item);
  };

  const tryMatch = (left: string, right: string) => {
    if (correctMap[left] === right) {
      playSound("correct");
      const newMatched = { ...matched, [left]: right };
      setMatched(newMatched);
      setSelectedLeft(null);
      setSelectedRight(null);
      if (Object.keys(newMatched).length === spec.correctPairs.length) {
        const correct = errors === 0;
        onAnswer(correct, correct ? undefined : `${errors} mistake(s)`);
      }
    } else {
      playSound("incorrect");
      setErrors((e) => e + 1);
      setWrongPair({ left, right });
      setTimeout(() => {
        setWrongPair(null);
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 600);
    }
  };

  const matchedStyle = "theme-border theme-bg-light opacity-60";

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Match Pairs
          </div>
          <div className="text-sm text-muted-foreground">
            Click a word, then its matching translation. {errors > 0 && `(Mistakes: ${errors})`}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            {spec.leftItems.map((item, i) => {
              const isMatched = !!matched[item];
              const isSelected = selectedLeft === item;
              const isWrong = wrongPair?.left === item;
              return (
                <button
                  key={i}
                  onClick={() => handleClickLeft(item)}
                  disabled={disabled || isMatched}
                  className={`w-full p-3 rounded-lg border-2 text-center font-medium transition-colors ${
                    isMatched
                      ? matchedStyle
                      : isWrong
                      ? "border-rose-500 bg-rose-50 dark:bg-rose-900/20"
                      : isSelected
                      ? "theme-border theme-bg-light"
                      : "border-border theme-border-hover hover:bg-muted/30"
                  }`}
                  style={isMatched || isSelected ? { borderColor: "var(--theme-primary)" } : {}}
                >
                  <div className="flex items-center justify-center gap-2">
                    {item}
                    {isMatched && <Check className="w-4 h-4" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            {spec.rightItems.map((item, i) => {
              const isMatched = Object.values(matched).includes(item);
              const isSelected = selectedRight === item;
              const isWrong = wrongPair?.right === item;
              return (
                <button
                  key={i}
                  onClick={() => handleClickRight(item)}
                  disabled={disabled || isMatched}
                  className={`w-full p-3 rounded-lg border-2 text-center text-sm transition-colors ${
                    isMatched
                      ? matchedStyle
                      : isWrong
                      ? "border-rose-500 bg-rose-50 dark:bg-rose-900/20"
                      : isSelected
                      ? "theme-border theme-bg-light"
                      : "border-border theme-border-hover hover:bg-muted/30"
                  }`}
                  style={isMatched || isSelected ? { borderColor: "var(--theme-primary)" } : {}}
                >
                  <div className="flex items-center justify-center gap-2">
                    {item}
                    {isMatched && <Check className="w-4 h-4" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
