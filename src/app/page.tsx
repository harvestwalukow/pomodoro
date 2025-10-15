import Timer from "@/app/components/Timer";
import Dashboard from "@/app/components/Dashboard";

export default function Home() {
  return (
    <div
      style={{ display: "grid", gap: 16, justifyItems: "center", padding: 16 }}
    >
      <header style={{ width: "100%", maxWidth: 640 }}>
        <div style={{ fontWeight: 700 }}>Pomodoro</div>
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
        <div style={{ height: 8 }} />
        <Dashboard />
      </main>
    </div>
  );
}
