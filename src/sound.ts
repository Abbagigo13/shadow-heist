type SoundName =
  | "connect"
  | "vault"
  | "opponent"
  | "seal"
  | "tick"
  | "resolve"
  | "win"
  | "lose"
  | "draw"
  | "error";

let audioContext: AudioContext | null = null;
let muted = false;

export function setSoundMuted(value: boolean) {
  muted = value;
}

export function isSoundMuted() {
  return muted;
}

function getContext() {
  if (typeof window === "undefined" || muted) return null;
  audioContext ??= new AudioContext();
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

function tone(
  context: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine",
  slideTo?: number,
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export function playSound(name: SoundName) {
  const context = getContext();
  if (!context) return;
  const now = context.currentTime;

  switch (name) {
    case "connect":
      tone(context, 440, now, 0.09, 0.035, "triangle");
      tone(context, 660, now + 0.08, 0.16, 0.04, "triangle");
      break;
    case "vault":
      tone(context, 110, now, 0.16, 0.055, "sine", 78);
      tone(context, 220, now + 0.12, 0.24, 0.035, "triangle", 330);
      break;
    case "opponent":
      tone(context, 330, now, 0.1, 0.035, "square");
      tone(context, 494, now + 0.08, 0.18, 0.04, "triangle");
      break;
    case "seal":
      tone(context, 180, now, 0.2, 0.04, "sine", 110);
      tone(context, 720, now + 0.08, 0.12, 0.025, "triangle", 420);
      break;
    case "tick":
      tone(context, 560, now, 0.055, 0.022, "square", 420);
      break;
    case "resolve":
      tone(context, 260, now, 0.11, 0.03, "triangle");
      tone(context, 390, now + 0.09, 0.11, 0.035, "triangle");
      tone(context, 620, now + 0.18, 0.26, 0.04, "triangle");
      break;
    case "win":
      tone(context, 392, now, 0.1, 0.035, "triangle");
      tone(context, 523, now + 0.09, 0.1, 0.04, "triangle");
      tone(context, 784, now + 0.18, 0.28, 0.045, "triangle");
      break;
    case "lose":
      tone(context, 260, now, 0.13, 0.035, "sine", 210);
      tone(context, 180, now + 0.12, 0.27, 0.04, "sine", 120);
      break;
    case "draw":
      tone(context, 330, now, 0.14, 0.035, "triangle");
      tone(context, 330, now + 0.16, 0.2, 0.03, "triangle");
      break;
    case "error":
      tone(context, 130, now, 0.16, 0.045, "sawtooth", 95);
      break;
  }
}
