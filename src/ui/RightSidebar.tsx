import { FirmId, GameState } from "../game/types";
import { priceForFirm } from "../game/pricing";

function firmLabel(id: FirmId) {
  return id[0] + id.slice(1).toLowerCase();
}

export default function RightSidebar({
  state,
  onCallVote,
  onBuy,
  onMergerDecision,
}: {
  state: GameState;
  onCallVote: (firmId: FirmId) => void;
  onBuy: (firmId: FirmId, qty: number) => void;
  onMergerDecision: (trade: number, sell: number) => void;
}) {
  const visibility = state.visibility;

  const activeBuy = state.ui.modal?.kind === "BUY";
  const remainingBuys = activeBuy ? state.ui.modal.remainingBuys : 0;

  const merger = state.ui.modal?.kind === "MERGER" ? state.ui.modal.ctx : null;

  return (
    <div style={{ width: 320, borderLeft: "1px solid #24262c", padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.8 }}>Firms</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10 }}>
        {Object.values(state.firms).map((f) => {
          const price = priceForFirm(f);
          const bankKnown = visibility.bankCounts === "PUBLIC";
          const bankText = bankKnown ? String(f.bankShares) : (f.bankShares === 0 ? "0" : "?");
          const canBuy = activeBuy && f.active && remainingBuys > 0 && f.bankShares > 0 && price > 0;

          return (
            <div key={f.id} style={{ textAlign: "center" }}>
              <div
                title={`${firmLabel(f.id)} • Tier ${f.tier} • ${f.active ? `Size ${f.size}` : "Inactive"} • ${f.safe ? "Safe" : "Not safe"} • Price ${price ? `$${price.toLocaleString()}` : "—"} • Bank ${bankText}`}
                style={{
                  height: 38,
                  borderRadius: 12,
                  border: "1px solid #2a2d35",
                  background: f.active ? "#2b2f3b" : "#12141a",
                  opacity: f.active ? 1 : 0.45,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 900,
                  position: "relative",
                  cursor: "default",
                }}
              >
                {f.id.slice(0, 2)}
                {f.safe && (
                  <span style={{ position: "absolute", right: -6, top: -6, background: "#3b7cff", color: "#0e0f12", borderRadius: 10, padding: "1px 5px", fontSize: 10 }}>
                    S
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, opacity: 0.75, marginTop: 4 }}>
                {f.active ? `Sz ${f.size}` : "—"} • {price ? `$${Math.round(price/1000)}k` : "—"}
              </div>

              {state.ui.phase === "HUMAN_VOTE" && f.active && f.bankShares === 0 && !f.safe && state.players[0].shares[f.id] > 0 && (
                <button
                  onClick={() => onCallVote(f.id)}
                  style={{ marginTop: 6, width: "100%", background: "#1a1c22", color: "#eaeaea", border: "1px solid #2a2d35", borderRadius: 10, padding: "6px 8px", fontSize: 11 }}
                >
                  Call Vote
                </button>
              )}

              {activeBuy && (
                <button
                  disabled={!canBuy}
                  onClick={() => onBuy(f.id, 1)}
                  style={{
                    marginTop: 6,
                    width: "100%",
                    background: canBuy ? "#1a1c22" : "#111318",
                    color: canBuy ? "#eaeaea" : "#777",
                    border: "1px solid #2a2d35",
                    borderRadius: 10,
                    padding: "6px 8px",
                    fontSize: 11,
                    cursor: canBuy ? "pointer" : "not-allowed",
                  }}
                >
                  {f.active ? (f.bankShares === 0 ? "0 avail" : "Buy 1") : "Inactive"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {activeBuy && (
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          Buy phase: remaining purchases = <b>{remainingBuys}</b> (max 3 shares/turn)
        </div>
      )}

      {merger && (
        <div style={{ border: "1px solid #2a2d35", borderRadius: 14, background: "#12141a", padding: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Merger</div>
          <div style={{ fontSize: 13, fontWeight: 900 }}>Survivor: {merger.survivor ?? "?"}</div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>Acquired: {merger.acquired.join(", ")}</div>

          {(() => {
            const acq = merger.acquired[merger.acquiredIndex];
            const order = merger.decisionOrderByAcquired[acq] ?? [];
            const actor = order[merger.orderIndex];
            const isHumanTurn = actor === 0;
            return (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  Settling <b>{acq}</b> • Next: <b>{state.players[actor]?.name ?? "—"}</b>
                </div>
                {isHumanTurn ? (
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button
                      onClick={() => onMergerDecision(0, 0)}
                      style={{ flex: 1, background: "#1a1c22", color: "#eaeaea", border: "1px solid #2a2d35", borderRadius: 12, padding: "8px 10px" }}
                    >
                      Hold all (0/0)
                    </button>
                    <button
                      onClick={() => onMergerDecision(2, 0)}
                      style={{ flex: 1, background: "#1a1c22", color: "#eaeaea", border: "1px solid #2a2d35", borderRadius: 12, padding: "8px 10px" }}
                    >
                      Trade 2 (2/0)
                    </button>
                    <button
                      onClick={() => onMergerDecision(0, 1)}
                      style={{ flex: 1, background: "#1a1c22", color: "#eaeaea", border: "1px solid #2a2d35", borderRadius: 12, padding: "8px 10px" }}
                    >
                      Sell 1 (0/1)
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>Waiting for non-human settlement...</div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      <div style={{ flex: 1 }} />

      <div style={{ fontSize: 12, opacity: 0.8 }}>Log</div>
      <div style={{ border: "1px solid #2a2d35", borderRadius: 14, background: "#12141a", padding: 10, height: 250, overflow: "auto" }}>
        {state.log.slice().reverse().map((line, idx) => (
          <div key={idx} style={{ fontSize: 12, lineHeight: 1.4, opacity: 0.9, marginBottom: 6 }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
