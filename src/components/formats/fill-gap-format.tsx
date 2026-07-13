"use client";

import { useState, useRef, useEffect } from "react";
import { FillGapSpec } from "@/lib/formats";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";

interface Props {
  spec: FillGapSpec;
  onAnswer: (correct: boolean, message?: string) => void;
  disabled: boolean;
  feedback: null | { correct: boolean; message?: string };
}

export function FillGapFormat({ spec, onAnswer, disabled, feedback }: Props) {
  // Extract the gap characters from the hint (the underscores).
  // The hint looks like: "g__t_" or "the ___ cat"
  // We need to find consecutive underscores and let the user fill them.
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, [spec]);

  const [value, setValue] = useState("");

  // Count underscores in the hint
  const underscoreCount = (spec.hint.match(/_+/g) || []).reduce((s, m) => s + m.length, 0);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (disabled || value.trim() === "") return;
    const correct = value.trim().toLowerCase() === spec.answer.trim().toLowerCase();
    onAnswer(correct, correct ? undefined : `Correct: ${spec.answer}`);
  };

  // Split hint into parts: before underscores, underscores, after underscores
  const parts = (() => {
    const match = spec.hint.match(/^(.*?)_+(.*)$/s);
    if (!match) return { before: spec.hint, after: "" };
    return { before: match[1], after: match[2] };
  })();

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Fill the Gap
          </div>
          <div className="text-xl font-semibold mt-2">{spec.prompt}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-center gap-1 text-2xl font-mono flex-wrap">
            {parts.before && <span>{parts.before}</span>}
            <Input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={disabled}
              maxLength={underscoreCount}
              className="w-32 h-12 text-center text-lg font-bold border-2 border-emerald-400 focus:border-emerald-600"
              placeholder={"•".repeat(underscoreCount)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {parts.after && <span>{parts.after}</span>}
          </div>

          <Button
            type="submit"
            disabled={disabled || value.trim() === ""}
            className="w-full bg-emerald-500 hover:bg-emerald-600"
            size="lg"
          >
            <Check className="w-4 h-4 mr-1" /> Submit
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
