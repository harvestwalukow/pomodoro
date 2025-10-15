export type LogEntry = {
  timestamp: string; // ISO string
  minutes: number; // whole minutes, floor
  phase: "focus" | "break";
};

const LOGS_KEY = "pomodoro.logs.v1";
const STATE_KEY = "pomodoro.state.v1";

export type PersistedState = {
  stepIndex: number;
  remainingSeconds: number;
  isRunning: boolean;
  lastTickTs?: number; // ms epoch when last tick happened
};

export function readLogs(): LogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendLog(entry: LogEntry): void {
  if (typeof window === "undefined") return;
  const logs = readLogs();
  logs.push(entry);
  window.localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  try {
    window.dispatchEvent(new CustomEvent("pomodoro:logs-updated"));
  } catch {}
}

export function clearLogs(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOGS_KEY);
  try {
    window.dispatchEvent(new CustomEvent("pomodoro:logs-updated"));
  } catch {}
}

export function readState(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

export function writeState(state: PersistedState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STATE_KEY);
}
