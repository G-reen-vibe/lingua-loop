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

type Phase = "memorize" | "aiming" | "dropping" | "landed" | "result";

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
  const [landedSlot, setLandedSlot] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mutable refs for the animation loop (avoid re-creating effect each tick).
  const cannonAngleRef = useRef(0);
  const cannonDirRef = useRef(1);
  const marbleRef = useRef<MarblePos | null>(null);
  const phaseRef = useRef<Phase>("memorize");
  const landedSlotRef = useRef<number | null>(null);
  const dropStartRef = useRef(0);

  // Layout constants (in canvas coords).
  const WIDTH = 400;
  const HEIGHT = 360;
  const SLOT_HEIGHT = 50;
  const PEG_AREA_TOP = 60;
  const PEG_AREA_BOTTOM = HEIGHT - SLOT_HEIGHT - 10;
  const SLOT_COUNT = spec.slotItems.length;
  const slotWidth = WIDTH / SLOT_COUNT;

  // Generate peg positions — memoized so it's stable per spec.
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

  // Keep phaseRef in sync.
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const getSlotAtX = (x: number) => {
    const idx = Math.floor(x / slotWidth);
    return Math.max(0, Math.min(SLOT_COUNT - 1, idx));
  };

  // Draw the scene on the canvas.
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
    const mp = marbleRef.current;
    if (mp) {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(mp.x, mp.y, MARBLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath();
      ctx.arc(mp.x - 2, mp.y - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw slots at bottom. Labels only shown during memorize and result phases
    // (NOT during aiming/dropping/landed — so the user must remember).
    const showSlotLabels = phaseRef.current === "memorize" || phaseRef.current === "result";
    const ls = landedSlotRef.current;
    for (let i = 0; i < SLOT_COUNT; i++) {
      const sx = i * slotWidth;
      const sy = HEIGHT - SLOT_HEIGHT;
      const isLanded = ls === i;
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
  }, [pegs, slotWidth, SLOT_COUNT, spec.slotItems, WIDTH, HEIGHT, SLOT_HEIGHT]);

  // Single long-lived animation loop: handles cannon rotation, marble physics,
  // and redrawing. Runs for the lifetime of the component.
  useEffect(() => {
    let raf: ReturnType<typeof requestAnimationFrame>;
    let lastTickSound = 0;

    const tick = () => {
      const currentPhase = phaseRef.current;

      // Cannon rotation (during aiming phase, before marble is shot).
      if (currentPhase === "aiming") {
        cannonAngleRef.current += cannonDirRef.current * 0.025;
        const maxAngle = 0.6;
        if (cannonAngleRef.current > maxAngle) {
          cannonAngleRef.current = maxAngle;
          cannonDirRef.current = -1;
        } else if (cannonAngleRef.current < -maxAngle) {
          cannonAngleRef.current = -maxAngle;
          cannonDirRef.current = 1;
        }
      }

      // Marble physics (during dropping phase).
      if (currentPhase === "dropping" && marbleRef.current) {
        let { x, y, vx, vy } = marbleRef.current;
        vy += GRAVITY;
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

        let bounced = false;
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
            if (vy < 0.5) vy = 0.5;
            bounced = true;
          }
        }

        // Throttle tick sound to at most once per 80ms.
        if (bounced && Date.now() - lastTickSound > 80) {
          playSound("tick");
          lastTickSound = Date.now();
        }

        if (y >= PEG_AREA_BOTTOM) {
          const slot = getSlotAtX(x);
          landedSlotRef.current = slot;
          setLandedSlot(slot);
          setPhase("landed");
          phaseRef.current = "landed";
          marbleRef.current = null;
          playSound("drop");
        } else {
          marbleRef.current = { x, y, vx, vy };
        }

        // Safety timeout: force-land after 8 seconds.
        if (Date.now() - dropStartRef.current > 8000) {
          const slot = Math.floor(Math.random() * SLOT_COUNT);
          landedSlotRef.current = slot;
          setLandedSlot(slot);
          setPhase("landed");
          phaseRef.current = "landed";
          marbleRef.current = null;
          playSound("drop");
        }
      }

      drawScene();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [drawScene, pegs, SLOT_COUNT, slotWidth]);

  // Phase transitions: memorize -> aiming -> dropping -> landed -> (user picks) -> result
  useEffect(() => {
    playSound("reveal");
    // memorize for 3s, then aim for 2s, then shoot.
    const t1 = setTimeout(() => {
      setPhase("aiming");
      phaseRef.current = "aiming";
      playSound("shuffle");
    }, 3000);
    const t2 = setTimeout(() => {
      // Shoot the marble from the current cannon angle.
      playSound("drop");
      const angle = cannonAngleRef.current;
      const startX = WIDTH / 2 + Math.sin(angle) * 30;
      const startY = 50;
      const speed = 3;
      marbleRef.current = {
        x: startX,
        y: startY,
        vx: Math.sin(angle) * speed,
        vy: Math.cos(angle) * speed,
      };
      dropStartRef.current = Date.now();
      setPhase("dropping");
      phaseRef.current = "dropping";
    }, 5000); // 3s memorize + 2s aiming
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [spec, WIDTH]);

  const handlePick = (option: string) => {
    if (disabled || phase !== "landed" || pickedOption !== null || landedSlot === null) return;
    setPickedOption(option);
    setPhase("result");
    phaseRef.current = "result";
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
            {phase === "aiming" && "The cannon is aiming..."}
            {phase === "dropping" && "Watch the marble drop..."}
            {phase === "landed" && "The marble landed! Pick the item in the highlighted slot:"}
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
          {phase === "aiming" && "The cannon rotates — the marble will follow its angle."}
        </div>
      </CardContent>
    </Card>
  );
}
