// Sound effects using the Web Audio API. No external files needed.
// All sounds are synthesized procedurally.

type SoundName =
  | "click"
  | "correct"
  | "incorrect"
  | "complete"
  | "shuffle"
  | "drop"
  | "reveal"
  | "tick";

let audioCtx: AudioContext | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  // Resume if suspended (browsers require user gesture).
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

export function isSoundEnabled(): boolean {
  return enabled;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  gain: number = 0.15,
  startOffset: number = 0
) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const start = ctx.currentTime + startOffset;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration);
}

function playNoise(
  duration: number,
  gain: number = 0.08,
  filterFreq: number = 1000,
  startOffset: number = 0
) {
  const ctx = getCtx();
  if (!ctx) return;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = filterFreq;
  const g = ctx.createGain();
  const start = ctx.currentTime + startOffset;
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + duration);
  noise.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  noise.start(start);
  noise.stop(start + duration);
}

export function playSound(name: SoundName) {
  if (!enabled) return;
  const ctx = getCtx();
  if (!ctx) return;

  switch (name) {
    case "click":
      playTone(600, 0.05, "sine", 0.08);
      break;
    case "correct":
      // Pleasant ascending arpeggio: C-E-G
      playTone(523.25, 0.12, "sine", 0.12, 0);
      playTone(659.25, 0.12, "sine", 0.12, 0.08);
      playTone(783.99, 0.2, "sine", 0.12, 0.16);
      break;
    case "incorrect":
      // Descending buzz
      playTone(220, 0.15, "sawtooth", 0.1, 0);
      playTone(180, 0.2, "sawtooth", 0.1, 0.1);
      break;
    case "complete":
      // Fanfare: C-E-G-C
      playTone(523.25, 0.15, "sine", 0.12, 0);
      playTone(659.25, 0.15, "sine", 0.12, 0.12);
      playTone(783.99, 0.15, "sine", 0.12, 0.24);
      playTone(1046.5, 0.3, "sine", 0.14, 0.36);
      break;
    case "shuffle":
      // Whoosh: filtered noise sweep
      playNoise(0.4, 0.06, 2000);
      break;
    case "drop":
      // Marble/plink drop
      playTone(800, 0.06, "sine", 0.1);
      playTone(400, 0.1, "sine", 0.08, 0.05);
      break;
    case "reveal":
      // Soft reveal chime
      playTone(440, 0.08, "sine", 0.06);
      playTone(550, 0.08, "sine", 0.06, 0.05);
      break;
    case "tick":
      // Short tick
      playTone(1200, 0.02, "square", 0.04);
      break;
  }
}
