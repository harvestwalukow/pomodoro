"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  POMODORO_SEQUENCE,
  formatMMSS,
  getStep,
  nextIndex,
  Step,
} from "@/app/utils/schedule";
import {
  appendLog,
  readState,
  writeState,
  type PersistedState,
} from "@/app/utils/storage";

function clampToNonNegative(value: number): number {
  return value < 0 ? 0 : value;
}

export default function Timer() {
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    getStep(0).durationMinutes * 60
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const currentStep: Step = useMemo(() => getStep(stepIndex), [stepIndex]);
  const totalSeconds = currentStep.durationMinutes * 60;

  const intervalRef = useRef<number | null>(null);

  // Rehydrate persisted state
  useEffect(() => {
    const persisted = readState();
    if (persisted) {
      setStepIndex(persisted.stepIndex);
      const step = getStep(persisted.stepIndex);
      const defaultRemaining = step.durationMinutes * 60;
      let remaining =
        typeof persisted.remainingSeconds === "number"
          ? persisted.remainingSeconds
          : defaultRemaining;

      if (persisted.isRunning && persisted.lastTickTs) {
        const elapsed = Math.floor((Date.now() - persisted.lastTickTs) / 1000);
        remaining = clampToNonNegative(remaining - elapsed);
      }
      setRemainingSeconds(remaining);
      setIsRunning(persisted.isRunning);
    }
  }, []);

  // Persist on change
  useEffect(() => {
    const state: PersistedState = {
      stepIndex,
      remainingSeconds,
      isRunning,
      lastTickTs: isRunning ? Date.now() : undefined,
    };
    writeState(state);
  }, [stepIndex, remainingSeconds, isRunning]);

  const tick = useCallback(() => {
    setRemainingSeconds((prev) => {
      const next = clampToNonNegative(prev - 1);
      return next;
    });
  }, []);

  // Start/stop interval
  useEffect(() => {
    if (isRunning) {
      if (intervalRef.current != null)
        window.clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(tick, 1000);
      return () => {
        if (intervalRef.current != null)
          window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      };
    } else {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {};
  }, [isRunning, tick]);

  // Handle completion
  useEffect(() => {
    if (remainingSeconds === 0 && isRunning) {
      // Log full duration for this step
      const minutes = currentStep.durationMinutes;
      appendLog({
        timestamp: new Date().toISOString(),
        minutes,
        phase: currentStep.phase,
      });
      // advance
      const ni = nextIndex(stepIndex);
      setStepIndex(ni);
      setRemainingSeconds(getStep(ni).durationMinutes * 60);
      setIsRunning(false);
    }
  }, [remainingSeconds, isRunning, currentStep, stepIndex]);

  const handleStartPause = useCallback(() => {
    setIsRunning((r) => !r);
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setRemainingSeconds(totalSeconds);
  }, [totalSeconds]);

  // Skip behavior: when user skips during focus at e.g. 18 minutes passed, log 17 minutes.
  // That is floor(elapsedMinutes), and move to next step immediately.
  const handleSkip = useCallback(() => {
    const elapsedSeconds = totalSeconds - remainingSeconds;
    const elapsedMinutesFloor = Math.floor(elapsedSeconds / 60);
    if (elapsedMinutesFloor > 0) {
      appendLog({
        timestamp: new Date().toISOString(),
        minutes: elapsedMinutesFloor,
        phase: currentStep.phase,
      });
    }
    const ni = nextIndex(stepIndex);
    setStepIndex(ni);
    setRemainingSeconds(getStep(ni).durationMinutes * 60);
    setIsRunning(false);
  }, [currentStep.phase, remainingSeconds, stepIndex, totalSeconds]);

  const progress = (totalSeconds - remainingSeconds) / totalSeconds;

  return (
    <div style={{ display: "grid", gap: 16, justifyItems: "center" }}>
      <div style={{ display: "flex", gap: 8 }}>
        {POMODORO_SEQUENCE.map((s, i) => (
          <div
            key={i}
            title={`${s.phase} ${s.durationMinutes}m`}
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background:
                i === stepIndex % POMODORO_SEQUENCE.length
                  ? s.phase === "focus"
                    ? "#e74c3c"
                    : "#2ecc71"
                  : "#444",
              opacity: i === stepIndex % POMODORO_SEQUENCE.length ? 1 : 0.4,
            }}
          />
        ))}
      </div>

      <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: 1 }}>
        {formatMMSS(remainingSeconds)}
      </div>
      <div style={{ color: "#aaa", textTransform: "uppercase", fontSize: 12 }}>
        {currentStep.phase === "focus" ? "Focus" : "Break"} ·{" "}
        {currentStep.durationMinutes}m
      </div>

      <div
        style={{
          width: 280,
          height: 8,
          background: "#222",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, progress * 100))}%`,
            height: "100%",
            background: currentStep.phase === "focus" ? "#e74c3c" : "#2ecc71",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleStartPause} style={buttonStyle}>
          {isRunning ? "Pause" : "Start"}
        </button>
        <button onClick={handleReset} style={buttonStyle}>
          Reset
        </button>
        <button onClick={handleSkip} style={buttonStyle}>
          Skip
        </button>
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 6,
  border: "1px solid #333",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
};
