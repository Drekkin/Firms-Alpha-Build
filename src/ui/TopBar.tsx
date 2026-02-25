import { GameState } from "../game/types";

export default function TopBar({ state, onOpenSettings }: { state: GameState; onOpenSettings: () => void }) {
  const showCash = state.visibility.cash === "PUBLIC";
  const actingBot = state.ui.phase === "BOT_TURN" && state.currentPlayer > 0 ? state.players[state.currentPlayer] : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderBottom: "1px solid #24262c" }}>
      <button onClick={onOpenSettings} style={{ background: "#1a1c22", color: "#eaeaea", border: "1px solid #2a2d35", borderRadius: 10, padding: "6px 10px" }}>
        ⚙
      </button>

      <div style={{ display: "flex", gap: 10, flex: 1, justifyContent: "center" }}>
        {state.players.map((pl, idx) => (
          <div
            key={pl.id}
            style={{
              padding: "6px 10px",
              borderRadius: 12,
              border: "1px solid #2a2d35",
              background: idx === state.currentPlayer ? "#202331" : "#15171d",
              minWidth: 150,
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.8, display: "flex", justifyContent: "space-between" }}>
              <span>{pl.name}</span>
              <span style={{ fontWeight: 900 }}>{idx === state.currentPlayer ? "●" : ""}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {showCash ? `$${pl.cash.toLocaleString()}` : "Cash: Hidden"}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ fontSize: 12, opacity: 0.8 }}>Round</div>
        <div style={{ fontSize: 14, fontWeight: 900 }}>{state.roundNumber}</div>
        <div style={{ width: 1, height: 18, background: "#2a2d35" }} />
        <div style={{ fontSize: 12, opacity: 0.8 }}>Tiles left</div>
        <div style={{ fontSize: 14, fontWeight: 900 }}>{state.tileBag.length}</div>
      </div>

      {actingBot && (
        <div style={{ marginLeft: 10, padding: "6px 10px", borderRadius: 12, border: "1px solid #3b7cff", background: "#1a2548", fontSize: 12, fontWeight: 800 }}>
          {actingBot.name} is acting...
        </div>
      )}
    </div>
  );
}
