import { GameState } from "../game/types";

export default function SettingsModal({ state, onClose }: { state: GameState; onClose: () => void }) {
  if (!state.ui.settingsOpen) return null;
  const v = state.visibility;
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}
      onMouseDown={onClose}
    >
      <div
        style={{ width: 560, background: "#0e0f12", border: "1px solid #2a2d35", borderRadius: 18, padding: 16 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 900 }}>Settings</div>
          <button onClick={onClose} style={{ background: "#1a1c22", color: "#eaeaea", border: "1px solid #2a2d35", borderRadius: 12, padding: "6px 10px" }}>
            Close
          </button>
        </div>

        <div style={{ marginTop: 14, padding: 12, border: "1px solid #2a2d35", borderRadius: 14, background: "#12141a" }}>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 8 }}>Game setup (read-only)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
            <div>Portfolios: <b>{v.portfolios}</b></div>
            <div>Cash: <b>{v.cash}</b></div>
            <div>Bank counts: <b>{v.bankCounts}</b></div>
            <div>Merger info: <b>{v.mergerTransparency}</b></div>
            <div>Votes: <b>{v.voteTransparency}</b></div>
            <div>Bank depletion announce: <b>{String(v.bankDepletionAnnounce)}</b></div>
          </div>
        </div>

        <div style={{ marginTop: 12, padding: 12, border: "1px solid #2a2d35", borderRadius: 14, background: "#12141a", opacity: 0.6 }}>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Player settings (not implemented)</div>
          <div style={{ fontSize: 13 }}>Sound volume</div>
        </div>
      </div>
    </div>
  );
}
