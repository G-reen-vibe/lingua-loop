"use client";

import { useState, useMemo } from "react";
import { WordScrambleSpec } from "@/lib/formats";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eraser, Check } from "lucide-react";
import { playSound } from "@/lib/sounds";

interface Props {
  spec: WordScrambleSpec;
  onAnswer: (correct: boolean, message?: string) => void;
  disabled: boolean;
  feedback: null | { correct: boolean; message?: string };
}

// Helper: compute which piece indices are consumed by the given slot values
// (plus pre-filled slots).
function computeUsedPieces(
  spec: WordScrambleSpec,
  elements: string[],
  slots: (string | null)[]
): Set<number> {
  const used = new Set<number>();
  const available = spec.pieces.map((p, i) => ({ p, i }));

  // First, mark pieces consumed by pre-filled slots.
  for (const idx of spec.preFilled) {
    const target = elements[idx];
    const found = available.find((a) => !used.has(a.i) && a.p === target);
    if (found) used.add(found.i);
  }

  // Then, mark pieces consumed by user-filled slots.
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] === null || spec.preFilled.includes(i)) continue;
    const found = available.find((a) => !used.has(a.i) && a.p === slots[i]);
    if (found) used.add(found.i);
  }

  return used;
}

export function WordScrambleFormat({ spec, onAnswer, disabled, feedback }: Props) {
  const elements = useMemo(() => {
    return spec.isCharMode
      ? spec.answer.split("")
      : spec.answer.split(" ").filter((w) => w.length > 0);
  }, [spec]);

  const [slots, setSlots] = useState<(string | null)[]>(
    () => elements.map((_, i) => (spec.preFilled.includes(i) ? elements[i] : null))
  );
  const [usedPieces, setUsedPieces] = useState<Set<number>>(() =>
    computeUsedPieces(spec, elements, elements.map((_, i) => (spec.preFilled.includes(i) ? elements[i] : null)))
  );

  const handlePieceClick = (pieceIdx: number) => {
    if (disabled || usedPieces.has(pieceIdx)) return;
    const emptyIdx = slots.findIndex((s, i) => s === null && !spec.preFilled.includes(i));
    if (emptyIdx === -1) return;
    playSound("click");
    const newSlots = [...slots];
    newSlots[emptyIdx] = spec.pieces[pieceIdx];
    setSlots(newSlots);
    setUsedPieces(computeUsedPieces(spec, elements, newSlots));
  };

  const handleSlotClick = (slotIdx: number) => {
    if (disabled || spec.preFilled.includes(slotIdx) || slots[slotIdx] === null) return;
    playSound("click");
    const newSlots = [...slots];
    newSlots[slotIdx] = null;
    setSlots(newSlots);
    setUsedPieces(computeUsedPieces(spec, elements, newSlots));
  };

  const handleClear = () => {
    if (disabled) return;
    playSound("click");
    const cleared = elements.map((_, i) => (spec.preFilled.includes(i) ? elements[i] : null));
    setSlots(cleared);
    setUsedPieces(computeUsedPieces(spec, elements, cleared));
  };

  const isComplete = slots.every((s) => s !== null);

  const handleSubmit = () => {
    if (!isComplete || disabled) return;
    const userAnswer = slots.join(spec.isCharMode ? "" : " ");
    const correct = userAnswer === spec.answer;
    playSound(correct ? "correct" : "incorrect");
    onAnswer(correct, correct ? undefined : `Correct: ${spec.answer}`);
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Word Scramble
          </div>
          <div className="text-sm text-muted-foreground">Arrange the pieces to match:</div>
          <div className="text-xl font-semibold mt-2">{spec.prompt}</div>
        </div>

        {/* Slots */}
        <div className="flex flex-wrap justify-center gap-1.5 min-h-[3rem] p-2 bg-muted/30 rounded-lg">
          {slots.map((slot, i) => {
            const isPreFilled = spec.preFilled.includes(i);
            return (
              <button
                key={i}
                onClick={() => handleSlotClick(i)}
                disabled={disabled || isPreFilled || slot === null}
                className={`min-w-[2rem] h-10 px-1 rounded border-2 flex items-center justify-center font-medium text-sm transition-colors ${
                  isPreFilled
                    ? "border-muted bg-muted/50 text-muted-foreground"
                    : slot
                    ? "theme-border theme-bg-light hover:border-rose-400"
                    : "border-dashed border-muted-foreground/30"
                }`}
                style={slot && !isPreFilled ? { borderColor: "var(--theme-primary)" } : {}}
              >
                {slot || (spec.isCharMode ? "·" : "—")}
              </button>
            );
          })}
        </div>

        {/* Pieces */}
        <div className="flex flex-wrap justify-center gap-1.5">
          {spec.pieces.map((piece, i) => {
            const isUsed = usedPieces.has(i);
            return (
              <button
                key={i}
                onClick={() => handlePieceClick(i)}
                disabled={disabled || isUsed}
                className={`min-w-[2rem] h-10 px-1 rounded border-2 flex items-center justify-center font-medium text-sm transition-colors ${
                  isUsed
                    ? "border-muted bg-muted/30 opacity-30"
                    : "theme-border theme-bg-light hover:opacity-80"
                }`}
                style={!isUsed ? { borderColor: "var(--theme-primary)" } : {}}
              >
                {piece}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClear} disabled={disabled} className="flex-1">
            <Eraser className="w-4 h-4 mr-1" /> Clear
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={disabled || !isComplete}
            className="flex-1 theme-primary theme-primary-hover text-white"
          >
            <Check className="w-4 h-4 mr-1" /> Submit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
