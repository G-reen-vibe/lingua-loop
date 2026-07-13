"use client";

import { useState, useMemo } from "react";
import { WordScrambleSpec } from "@/lib/formats";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eraser, Check } from "lucide-react";

interface Props {
  spec: WordScrambleSpec;
  onAnswer: (correct: boolean, message?: string) => void;
  disabled: boolean;
  feedback: null | { correct: boolean; message?: string };
}

export function WordScrambleFormat({ spec, onAnswer, disabled, feedback }: Props) {
  // For char mode: answer is split into chars.
  // For word mode: answer is split into words.
  const elements = useMemo(() => {
    return spec.isCharMode
      ? spec.answer.split("")
      : spec.answer.split(" ").filter((w) => w.length > 0);
  }, [spec]);

  // Slots: what the user has placed in each position.
  // null = empty (or pre-filled if in preFilled).
  const [slots, setSlots] = useState<(string | null)[]>(
    () =>
      elements.map((_, i) =>
        spec.preFilled.includes(i) ? elements[i] : null
      )
  );

  // Track which piece indices are used. We track by piece value + a unique id
  // because there can be duplicate values.
  const [usedPieces, setUsedPieces] = useState<Set<number>>(() => {
    // Pre-fill: consume pieces matching the pre-filled elements.
    const used = new Set<number>();
    const available = spec.pieces.map((p, i) => ({ p, i }));
    for (const idx of spec.preFilled) {
      const target = elements[idx];
      const found = available.find((a) => !used.has(a.i) && a.p === target);
      if (found) used.add(found.i);
    }
    return used;
  });

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const handlePieceClick = (pieceIdx: number) => {
    if (disabled || usedPieces.has(pieceIdx)) return;
    // Find next empty slot (not pre-filled).
    const emptyIdx = slots.findIndex((s, i) => s === null && !spec.preFilled.includes(i));
    if (emptyIdx === -1) return;
    const newSlots = [...slots];
    newSlots[emptyIdx] = spec.pieces[pieceIdx];
    setSlots(newSlots);
    setUsedPieces((prev) => new Set(prev).add(pieceIdx));
  };

  const handleSlotClick = (slotIdx: number) => {
    if (disabled || spec.preFilled.includes(slotIdx)) return;
    if (slots[slotIdx] === null) return;
    // Remove the piece from this slot.
    const pieceValue = slots[slotIdx];
    const newSlots = [...slots];
    newSlots[slotIdx] = null;
    setSlots(newSlots);
    // Recompute usedPieces from the current slots + pre-filled pieces.
    const preFilledPieces = new Set<number>();
    const available = spec.pieces.map((p, i) => ({ p, i }));
    for (const idx of spec.preFilled) {
      const target = elements[idx];
      const found = available.find((a) => !preFilledPieces.has(a.i) && a.p === target);
      if (found) preFilledPieces.add(found.i);
    }
    const usedSet = new Set<number>(preFilledPieces);
    const remainingPieces = available.filter((a) => !preFilledPieces.has(a.i));
    const slotValues = newSlots.filter((s, i) => s !== null && !spec.preFilled.includes(i));
    for (const sv of slotValues) {
      const found = remainingPieces.find((a) => !usedSet.has(a.i) && a.p === sv);
      if (found) usedSet.add(found.i);
    }
    setUsedPieces(usedSet);
  };

  const handleClear = () => {
    if (disabled) return;
    setSlots(elements.map((_, i) => (spec.preFilled.includes(i) ? elements[i] : null)));
    // Rebuild usedPieces: only pre-filled.
    const used = new Set<number>();
    const available = spec.pieces.map((p, i) => ({ p, i }));
    for (const idx of spec.preFilled) {
      const target = elements[idx];
      const found = available.find((a) => !used.has(a.i) && a.p === target);
      if (found) used.add(found.i);
    }
    setUsedPieces(used);
  };

  const isComplete = slots.every((s) => s !== null);

  const handleSubmit = () => {
    if (!isComplete || disabled) return;
    const userAnswer = slots.join(spec.isCharMode ? "" : " ");
    const correct = userAnswer === spec.answer;
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
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 hover:border-rose-400"
                    : "border-dashed border-muted-foreground/30"
                }`}
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
                    : "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:border-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                }`}
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
            className="flex-1 bg-emerald-500 hover:bg-emerald-600"
          >
            <Check className="w-4 h-4 mr-1" /> Submit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
