import Link from "next/link";
import Timer from "@/app/components/Timer";

export default function Home() {
  return (
    <div
      style={{ display: "grid", gap: 16, justifyItems: "center", padding: 16 }}
    >
      <header
        style={{
          width: "100%",
          maxWidth: 640,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontWeight: 700 }}>Pomodoro</div>
        <nav style={{ display: "flex", gap: 12 }}>
          <Link href="/">Timer</Link>
          <Link href="/dashboard">Dashboard</Link>
        </nav>
      </header>
      <main
        style={{
          width: "100%",
          maxWidth: 640,
          display: "grid",
          justifyItems: "center",
          gap: 16,
        }}
      >
        <Timer />
      </main>
    </div>
  );
}
