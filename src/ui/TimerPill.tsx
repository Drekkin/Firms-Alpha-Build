export default function TimerPill({ endsAt, active, label }: { endsAt: number; active: boolean; label: string }) {
  const ms = Math.max(0, endsAt - Date.now());
  const s = Math.ceil(ms / 1000);
  return (
    <div style={{ padding: "6px 10px", border: "1px solid #2a2d35", borderRadius: 12, background: "#15171d", minWidth: 120 }}>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 900 }}>{active ? `${s}s` : "—"}</div>
    </div>
  );
}
