export type Phase = "focus" | "break";

export interface Step {
  durationMinutes: number;
  phase: Phase;
}

// Sequence: 25, 5, 25, 5, 25, 5, 25, 15 then repeat
export const POMODORO_SEQUENCE: Step[] = [
  { durationMinutes: 25, phase: "focus" },
  { durationMinutes: 5, phase: "break" },
  { durationMinutes: 25, phase: "focus" },
  { durationMinutes: 5, phase: "break" },
  { durationMinutes: 25, phase: "focus" },
  { durationMinutes: 5, phase: "break" },
  { durationMinutes: 25, phase: "focus" },
  { durationMinutes: 15, phase: "break" },
];

export function getStep(index: number): Step {
  const idx =
    ((index % POMODORO_SEQUENCE.length) + POMODORO_SEQUENCE.length) %
    POMODORO_SEQUENCE.length;
  return POMODORO_SEQUENCE[idx];
}

export function nextIndex(index: number): number {
  return index + 1;
}

export function formatMMSS(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}
