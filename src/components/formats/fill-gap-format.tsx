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
    onAnswer(correct, correct ? undefined : `Correct: ${spec.fullAnswer}`);
  };

  // Split hint into segments: text and underscore groups.
  // We render the underscores as a single input that spans all gap positions.
  // For simplicity, if there are multiple gap groups, we join them visually
  // by replacing each underscore group with a single input-sized placeholder.
  // But since the user types characters in order across all gaps, we use
  // a single input field and display the hint with the first gap replaced
  // by the input, and subsequent gaps shown as underscores (filled by the
  // remaining typed chars).
  //
  // Actually, the cleanest UX: show the hint with ALL underscores, and have
  // a single input field below where the user types the missing chars in order.

  // Parse hint into segments
  const segments = spec.hint.split(/(_+)/);

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
          {/* Display the hint with underscores, and an input field below */}
          <div className="text-2xl font-mono text-center leading-relaxed min-h-[3rem] flex items-center justify-center flex-wrap gap-0.5">
            {segments.map((seg, i) => {
              if (/^_+$/.test(seg)) {
                // Render underscores as highlighted
                return (
                  <span key={i} className="text-emerald-600 font-bold tracking-wider">
                    {seg.split("").map((_, j) => (
                      <span key={j}>_</span>
                    ))}
                  </span>
                );
              }
              return <span key={i}>{seg}</span>;
            })}
          </div>

          <div className="text-center text-sm text-muted-foreground">
            Type the missing letters ({underscoreCount} total):
          </div>

          <div className="flex justify-center">
            <Input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={disabled}
              maxLength={underscoreCount}
              className="w-48 h-12 text-center text-lg font-bold border-2 border-emerald-400 focus:border-emerald-600"
              placeholder={"•".repeat(underscoreCount)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
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
