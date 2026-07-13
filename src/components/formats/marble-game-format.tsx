"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MarbleGameSpec } from "@/lib/formats";
import { Card, CardContent } from "@/components/ui/card";
import { playSound } from "@/lib/sounds";

interface Props {
  spec: MarbleGameSpec;
  onAnswer: (correct: boolean, message?: string) => void;
  disabled: boolean;
  feedback: null | { correct: boolean; message?: string };
}

type Phase = "memorize" | "dropping" | "landed" | "result";

interface MarblePos {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// Physics constants for the marble drop.
const GRAVITY = 0.15;
const PEG_BOUNCE = 0.5;
const PEG_RADIUS = 4;
const MARBLE_RADIUS = 6;
const WALL_BOUNCE = 0.6;

export function MarbleGameFormat({ spec, onAnswer, disabled, feedback }: Props) {
  const [phase, setPhase] = useState<Phase>("memorize");
  const [pickedOption, setPickedOption] = useState<string | null>(null);
  const [marblePos, setMarblePos] = useState<MarblePos | null>(null);
  const [landedSlot, setLandedSlot] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cannonAngleRef = useRef(0);
  const cannonDirRef = useRef(1);

  // Layout constants (in canvas coords).
  const WIDTH = 400;
  const HEIGHT = 360;
  const SLOT_HEIGHT = 50;
  const PEG_AREA_TOP = 60;
  const PEG_AREA_BOTTOM = HEIGHT - SLOT_HEIGHT - 10;
  const SLOT_COUNT = spec.slotItems.length;
  const slotWidth = WIDTH / SLOT_COUNT;

  // Generate peg positions (grid of pegs) — memoized so it's stable per spec.
  const pegs = useMemo(() => {
    const rows = 6;
    const pegSpacingX = WIDTH / (Math.ceil(SLOT_COUNT / 2) + 1);
    const pegSpacingY = (PEG_AREA_BOTTOM - PEG_AREA_TOP) / (rows + 1);
    const result: { x: number; y: number }[] = [];
    for (let r = 0; r < rows; r++) {
      const offset = r % 2 === 0 ? 0 : pegSpacingX / 2;
      const cols = Math.ceil(SLOT_COUNT / 2) + (r % 2 === 0 ? 1 : 0);
      for (let c = 0; c < cols; c++) {
        const x = offset + pegSpacingX * (c + 0.5);
        const y = PEG_AREA_TOP + pegSpacingY * (r + 1);
        if (x > 10 && x < WIDTH - 10) {
          result.push({ x, y });
        }
      }
    }
    return result;
  }, [SLOT_COUNT, WIDTH, PEG_AREA_TOP, PEG_AREA_BOTTOM]);

  const getSlotAtX = (x: number) => {
    const idx = Math.floor(x / slotWidth);
    return Math.max(0, Math.min(SLOT_COUNT - 1, idx));
  };

  // Draw the scene on the canvas. Must be declared before useEffects that use it.
  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    const themeColor =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--theme-primary")
        .trim() || "#10b981";

    // Draw pegs.
    ctx.fillStyle = "#94a3b8";
    for (const peg of pegs) {
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, PEG_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw cannon at top.
    const cx = WIDTH / 2;
    const cy = 35;
    const angle = cannonAngleRef.current;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = themeColor;
    ctx.fillRect(-8, 0, 16, 25);
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw marble if it exists.
    if (marblePos) {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(marblePos.x, marblePos.y, MARBLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath();
      ctx.arc(marblePos.x - 2, marblePos.y - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw slots at bottom.
    const showSlotLabels = phase === "memorize" || phase === "landed" || phase === "result";
    for (let i = 0; i < SLOT_COUNT; i++) {
      const sx = i * slotWidth;
      const sy = HEIGHT - SLOT_HEIGHT;
      const isLanded = landedSlot === i;
      ctx.strokeStyle = isLanded ? themeColor : "#cbd5e1";
      ctx.lineWidth = isLanded ? 3 : 1;
      ctx.strokeRect(sx + 2, sy, slotWidth - 4, SLOT_HEIGHT - 5);
      if (showSlotLabels) {
        ctx.fillStyle = isLanded ? themeColor : "#64748b";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        const label = spec.slotItems[i];
        const displayLabel = label.length > 12 ? label.slice(0, 10) + "…" : label;
        ctx.fillText(displayLabel, sx + slotWidth / 2, sy + SLOT_HEIGHT / 2 + 4);
      }
    }
  }, [marblePos, phase, landedSlot, slotWidth, SLOT_COUNT, spec.slotItems, WIDTH, HEIGHT, SLOT_HEIGHT, pegs]);

  const shootMarble = useCallback(() => {
    playSound("drop");
    const angle = cannonAngleRef.current;
    const startX = WIDTH / 2 + Math.sin(angle) * 30;
    const startY = 50;
    const speed = 3;
    setMarblePos({
      x: startX,
      y: startY,
      vx: Math.sin(angle) * speed,
      vy: Math.cos(angle) * speed,
    });
  }, [WIDTH]);

  // Phase 1: memorize slots for 3s, then start dropping.
  // State is initialized from the spec; the parent remounts this component
  // (via key) whenever a new spec arrives, so initializers run fresh.
  useEffect(() => {
    playSound("reveal");
    const t = setTimeout(() => {
      setPhase("dropping");
      shootMarble();
    }, 3000);
    return () => clearTimeout(t);
  }, [spec, shootMarble]);

  // Cannon rotation animation (only during dropping phase, before marble exists).
  useEffect(() => {
    if (phase !== "dropping" || marblePos) return;
    let raf: ReturnType<typeof requestAnimationFrame>;
    const tick = () => {
      cannonAngleRef.current += cannonDirRef.current * 0.02;
      const maxAngle = 0.5;
      if (cannonAngleRef.current > maxAngle) {
        cannonAngleRef.current = maxAngle;
        cannonDirRef.current = -1;
      } else if (cannonAngleRef.current < -maxAngle) {
        cannonAngleRef.current = -maxAngle;
        cannonDirRef.current = 1;
      }
      drawScene();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, marblePos, drawScene]);

  // Physics simulation loop.
  useEffect(() => {
    if (!marblePos || phase !== "dropping") return;

    const startTime = Date.now();
    const step = () => {
      // Safety: if marble has been dropping for > 8 seconds, force-land it.
      if (Date.now() - startTime > 8000) {
        const slot = Math.floor(Math.random() * SLOT_COUNT);
        setLandedSlot(slot);
        setPhase("landed");
        playSound("drop");
        return;
      }
      setMarblePos((prev) => {
        if (!prev) return null;
        let { x, y, vx, vy } = prev;
        vy += GRAVITY;
        // Cap velocity to prevent runaway.
        const maxV = 6;
        vx = Math.max(-maxV, Math.min(maxV, vx));
        vy = Math.max(-maxV, Math.min(maxV, vy));
        x += vx;
        y += vy;

        if (x < MARBLE_RADIUS) {
          x = MARBLE_RADIUS;
          vx = -vx * WALL_BOUNCE;
        }
        if (x > WIDTH - MARBLE_RADIUS) {
          x = WIDTH - MARBLE_RADIUS;
          vx = -vx * WALL_BOUNCE;
        }

        for (const peg of pegs) {
          const dx = x - peg.x;
          const dy = y - peg.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = MARBLE_RADIUS + PEG_RADIUS;
          if (dist < minDist && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;
            x = peg.x + nx * minDist;
            y = peg.y + ny * minDist;
            const dot = vx * nx + vy * ny;
            vx = (vx - 2 * dot * nx) * PEG_BOUNCE;
            vy = (vy - 2 * dot * ny) * PEG_BOUNCE;
            // Ensure minimum downward velocity so the marble always progresses.
            if (vy < 0.5) vy = 0.5;
            playSound("tick");
          }
        }

        if (y >= PEG_AREA_BOTTOM) {
          const slot = getSlotAtX(x);
          setLandedSlot(slot);
          setPhase("landed");
          playSound("drop");
          return null;
        }

        return { x, y, vx, vy };
      });
    };

    const interval = setInterval(step, 16);
    return () => clearInterval(interval);
  }, [marblePos, phase, SLOT_COUNT]);

  // Redraw on every relevant state change.
  useEffect(() => {
    drawScene();
  }, [drawScene]);

  const handlePick = (option: string) => {
    if (disabled || phase !== "landed" || pickedOption !== null || landedSlot === null) return;
    setPickedOption(option);
    setPhase("result");
    const correctAnswer = spec.slotItems[landedSlot];
    const correct = option === correctAnswer;
    playSound(correct ? "correct" : "incorrect");
    onAnswer(correct, correct ? undefined : `Correct: ${correctAnswer}`);
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Marble Game
          </div>
          <div className="text-sm text-muted-foreground">
            {phase === "memorize" && "Memorize the slots..."}
            {phase === "dropping" && "Watch the marble drop..."}
            {phase === "landed" && "The marble landed on a slot. Pick the matching aspect:"}
            {phase === "result" && "Result shown"}
          </div>
        </div>

        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={WIDTH}
            height={HEIGHT}
            className="rounded-lg border bg-white dark:bg-slate-900 max-w-full"
            style={{ maxHeight: "360px" }}
          />
        </div>

        {phase === "landed" && (
          <div className="flex flex-wrap justify-center gap-2">
            {spec.options.map((option, i) => {
              const isPicked = pickedOption === option;
              const isCorrect = option === (landedSlot !== null ? spec.slotItems[landedSlot] : "");
              const showResult = pickedOption !== null;
              return (
                <button
                  key={i}
                  onClick={() => handlePick(option)}
                  disabled={disabled || pickedOption !== null}
                  className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                    showResult && isCorrect
                      ? "theme-border theme-bg-light"
                      : showResult && isPicked && !isCorrect
                      ? "border-rose-500 bg-rose-50 dark:bg-rose-900/20"
                      : "border-border theme-border-hover hover:bg-muted/30"
                  }`}
                  style={showResult && isCorrect ? { borderColor: "var(--theme-primary)" } : {}}
                >
                  {option}
                </button>
              );
            })}
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center">
          {phase === "memorize" && "Slots will hide when the marble drops."}
        </div>
      </CardContent>
    </Card>
  );
}
