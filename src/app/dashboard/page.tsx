"use client";

import { useMemo } from "react";
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

function computeWeekData(logs: LogEntry[], baseDate: Date): WeekData {
  const byWeekday = new Array(7).fill(0) as number[];
  const start = getStartOfWeek(baseDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  for (const log of logs) {
    const ts = new Date(log.timestamp);
    if (ts >= start && ts < end) {
      const weekday = (ts.getDay() + 6) % 7; // 0..6 Mon..Sun
      byWeekday[weekday] += log.minutes;
    }
  }
  const totalMinutes = byWeekday.reduce((a, b) => a + b, 0);
  return { totalMinutes, byWeekday };
}

export default function DashboardPage() {
  const logs = readLogs();
  const now = new Date();
  const data = useMemo(() => computeWeekData(logs, now), [logs, now]);

  const maxMinutes = Math.max(60, ...data.byWeekday); // ensure visible scale
  const bars = data.byWeekday.map((m) => m / maxMinutes);

  const totalHours = (data.totalMinutes / 60).toFixed(2);
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
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>Weekly Focus</h1>
      <div style={{ color: "#aaa" }}>
        Total hours this week: <strong>{totalHours}</strong>
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
                {Math.round(data.byWeekday[i] / 60)}h
              </text>
            </g>
          );
        })}
        <text x={20} y={20} fill="#888" fontSize={12}>
          Bars scaled to weekly max
        </text>
      </svg>
    </div>
  );
}
