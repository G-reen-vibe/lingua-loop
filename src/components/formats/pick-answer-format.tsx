"use client";

import { useState } from "react";
import { PickAnswerSpec } from "@/lib/formats";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  spec: PickAnswerSpec;
  onAnswer: (correct: boolean, message?: string) => void;
  disabled: boolean;
  feedback: null | { correct: boolean; message?: string };
}

export function PickAnswerFormat({ spec, onAnswer, disabled, feedback }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleClick = (option: string) => {
    if (disabled || selected) return;
    setSelected(option);
    const correct = option === spec.correctAnswer;
    onAnswer(correct, correct ? undefined : `Correct answer: ${spec.correctAnswer}`);
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
            What does this mean?
          </div>
          <div className="text-3xl font-bold">{spec.prompt}</div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {spec.options.map((option, i) => {
            const isSelected = selected === option;
            const isCorrect = option === spec.correctAnswer;
            const showResult = selected !== null;
            return (
              <Button
                key={i}
                variant="outline"
                onClick={() => handleClick(option)}
                disabled={disabled || selected !== null}
                className={`justify-start text-left h-auto py-3 px-4 ${
                  showResult && isCorrect
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                    : showResult && isSelected && !isCorrect
                    ? "border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300"
                    : "hover:border-emerald-300"
                }`}
              >
                <span className="text-base">{option}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
