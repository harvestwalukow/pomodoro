"use client";

import { useEffect, useMemo, useState } from "react";
import { readLogs, type LogEntry } from "@/app/utils/storage";

type WeekData = {
  totalMinutes: number;
  byWeekday: number[]; // Mon..Sun length 7
};

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0=Mon ... 6=Sun
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function sameWeek(a: Date, b: Date): boolean {
  const sa = getStartOfWeek(a).getTime();
  const sb = getStartOfWeek(b).getTime();
  return sa === sb;
}

function formatHoursMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

function formatWeekRange(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startStr = start.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return startStr;
}

function computeWeekData(logs: LogEntry[], baseDate: Date): WeekData {
  const byWeekday = new Array(7).fill(0) as number[];
  const start = getStartOfWeek(baseDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  for (const log of logs) {
    const ts = new Date(log.timestamp);
    // Only count focus minutes toward weekly totals/visualization
    if (log.phase === "focus" && ts >= start && ts < end) {
      const weekday = (ts.getDay() + 6) % 7; // 0..6 Mon..Sun
      byWeekday[weekday] += log.minutes;
    }
  }
  const totalMinutes = byWeekday.reduce((a, b) => a + b, 0);
  return { totalMinutes, byWeekday };
}

export default function Dashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  useEffect(() => {
    setLogs(readLogs());
    const onLogs = () => setLogs(readLogs());
    window.addEventListener("pomodoro:logs-updated", onLogs);
    return () => window.removeEventListener("pomodoro:logs-updated", onLogs);
  }, []);

  // Listen for live timer ticks to update in-progress minutes in current week
  const [inProgressSeconds, setInProgressSeconds] = useState<number>(0);
  useEffect(() => {
    const onTick = (e: Event) => {
      const ev = e as CustomEvent<{ remainingSeconds: number }>;
      setInProgressSeconds((prev) => {
        // We don't know the step total here, so we just use ticks as heartbeat
        // The compute below only uses seconds to compute today's in-progress minutes floor
        return Math.max(0, ev.detail?.remainingSeconds ?? prev);
      });
    };
    window.addEventListener("pomodoro:tick", onTick as EventListener);
    return () =>
      window.removeEventListener("pomodoro:tick", onTick as EventListener);
  }, []);
  const [weekOffset, setWeekOffset] = useState<number>(0); // 0=current, -1=prev
  const baseDate = useMemo(
    () => addWeeks(new Date(), weekOffset),
    [weekOffset]
  );
  const startOfShownWeek = useMemo(() => getStartOfWeek(baseDate), [baseDate]);
  const data = useMemo(() => computeWeekData(logs, baseDate), [logs, baseDate]);

  // If viewing current week and today, add in-progress minutes (focus) to today's bar and totals
  const enhanced = useMemo(() => {
    const result = { ...data, byWeekday: [...data.byWeekday] };
    const viewingCurrentWeek = sameWeek(baseDate, new Date());
    if (viewingCurrentWeek) {
      const todayIdx = (new Date().getDay() + 6) % 7;
      // Estimate in-progress minutes as floor of elapsed seconds since last log change isn't available
      // Instead of elapsed, we can't know remaining vs total here, so rely on timer heartbeat not for math but to trigger re-render.
      // We simply add 0 here and use heartbeat to refresh UI from persisted logs when step completes.
      // As a minor UX improvement, we can show partial minute by using modulo seconds while running: add 0 to avoid double counting.
      // Keeping consistent with persisted-only aggregation until a focus interval is committed.
      // (If desired later, we can expose currentStep.duration in a shared store for precise live addition.)
      // No-op addition keeps structure for future extension.
      result.byWeekday[todayIdx] += 0;
      // totalMinutes remains unchanged to avoid overcounting
    }
    return result;
  }, [data, baseDate, inProgressSeconds]);

  // All-time focus minutes
  const allTimeMinutes = useMemo(
    () =>
      logs
        .filter((l) => l.phase === "focus")
        .reduce((sum, l) => sum + l.minutes, 0),
    [logs]
  );

  // Weekly goal: 18h40m = 1120 minutes
  const weeklyTargetMinutes = 18 * 60 + 40;
  const weeklyRemainingMinutes = Math.max(
    0,
    weeklyTargetMinutes - data.totalMinutes
  );
  const weeklyProgressPct = Math.min(
    1,
    data.totalMinutes / weeklyTargetMinutes
  );

  const maxMinutes = Math.max(60, ...enhanced.byWeekday); // ensure visible scale
  const bars = enhanced.byWeekday.map((m) => m / maxMinutes);

  const totalHours = (enhanced.totalMinutes / 60).toFixed(2);
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        padding: 16,
        maxWidth: 640,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Weekly Focus</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid #333",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            ◀ Prev
          </button>
          <button
            onClick={() => setWeekOffset((w) => Math.min(0, w + 1))}
            disabled={weekOffset >= 0}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid #333",
              background: weekOffset >= 0 ? "#191919" : "#111",
              color: "#fff",
              cursor: weekOffset >= 0 ? "not-allowed" : "pointer",
              opacity: weekOffset >= 0 ? 0.5 : 1,
            }}
          >
            Next ▶
          </button>
        </div>
      </div>
      <div style={{ color: "#aaa", marginTop: -6 }}>
        {formatWeekRange(startOfShownWeek)}
      </div>

      {/* KPI tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        <div
          style={{
            background: "#0f0f0f",
            border: "1px solid #222",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div style={{ color: "#888", fontSize: 12 }}>All-time focus</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {formatHoursMinutes(allTimeMinutes)}
          </div>
        </div>
        <div
          style={{
            background: "#0f0f0f",
            border: "1px solid #222",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div style={{ color: "#888", fontSize: 12 }}>This week</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {formatHoursMinutes(enhanced.totalMinutes)}
          </div>
        </div>
        <div
          style={{
            background: "#0f0f0f",
            border: "1px solid #222",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div style={{ color: "#888", fontSize: 12 }}>To goal (18h 40m)</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {formatHoursMinutes(weeklyRemainingMinutes)}
          </div>
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                width: "100%",
                height: 8,
                background: "#1b1b1b",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.round(weeklyProgressPct * 100)}%`,
                  height: "100%",
                  background: "#2ecc71",
                }}
              />
            </div>
            <div style={{ color: "#888", fontSize: 11, marginTop: 4 }}>
              {Math.round(weeklyProgressPct * 100)}%
            </div>
          </div>
        </div>
      </div>

      <svg
        width={600}
        height={220}
        style={{ background: "#0f0f0f", borderRadius: 8 }}
      >
        {bars.map((pct, i) => {
          const barWidth = 60;
          const gap = 26;
          const x = 20 + i * (barWidth + gap);
          const h = Math.max(2, Math.round(pct * 160));
          const y = 180 - h;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={h}
                rx={6}
                fill="#e74c3c"
              />
              <text
                x={x + barWidth / 2}
                y={196}
                textAnchor="middle"
                fontSize={12}
                fill="#aaa"
              >
                {labels[i]}
              </text>
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize={12}
                fill="#ddd"
              >
                {formatHoursMinutes(enhanced.byWeekday[i])}
              </text>
            </g>
          );
        })}
        <text x={20} y={20} fill="#888" fontSize={12}>
          Focus minutes per day (scaled to weekly max)
        </text>
      </svg>
    </div>
  );
}
