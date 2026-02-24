import { useReducer } from "react";
import { reducer } from "./game/reducer";
import { createInitialState } from "./game/engine";
import { useTimer } from "./hooks/useTimer";
import TopBar from "./ui/TopBar";
import Board from "./ui/Board";
import RightSidebar from "./ui/RightSidebar";
import BottomBar from "./ui/BottomBar";
import SettingsModal from "./ui/SettingsModal";
import { FIRM_ORDER } from "./game/constants";
import { priceForFirm } from "./game/pricing";

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => createInitialState("alpha"));

  useTimer(state.ui.timer.active, state.ui.timer.endsAt, () => dispatch({ type: "TIMEOUT" }));

  const buyModal = state.ui.modal?.kind === "BUY" ? state.ui.modal : null;
  const totalSelected = buyModal ? Object.values(buyModal.selections).reduce((sum, qty) => sum + qty, 0) : 0;
  const totalCost = buyModal
    ? FIRM_ORDER.reduce((sum, firmId) => sum + buyModal.selections[firmId] * priceForFirm(state.firms[firmId]), 0)
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <TopBar state={state} onOpenSettings={() => dispatch({ type: "OPEN_SETTINGS" })} />

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, padding: 14, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Board
            state={state}
            onDropCell={(row, col) => dispatch({ type: "DRAG_END", row, col })}
            onHoverCellFirm={() => {}}
          />
        </div>

        <RightSidebar
          state={state}
          onCallVote={(firmId) => dispatch({ type: "CALL_VOTE", firmId })}
          onMergerDecision={(trade, sell) => dispatch({ type: "MERGER_DECIDE", trade, sell })}
        />
      </div>

      <BottomBar
        state={state}
        onDragStart={(tileId) => dispatch({ type: "DRAG_START", tileId })}
        onHoverTile={(tileId) => dispatch({ type: "HOVER_TILE", tileId })}
      />

      <SettingsModal state={state} onClose={() => dispatch({ type: "CLOSE_SETTINGS" })} />

      {buyModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", justifyContent: "center", alignItems: "center", padding: 20, zIndex: 20 }}>
          <div style={{ width: 860, background: "#0e0f12", border: "1px solid #2a2d35", borderRadius: 18, padding: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 900 }}>Buy Shares</div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>Select up to 3 total shares.</div>

            <div style={{ display: "flex", gap: 10, marginTop: 12, fontSize: 13 }}>
              <div style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #2a2d35", background: "#12141a" }}>Purse: <b>${state.players[0].cash.toLocaleString()}</b></div>
              <div style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #2a2d35", background: "#12141a" }}>Total Cost: <b>${totalCost.toLocaleString()}</b></div>
              <div style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #2a2d35", background: "#12141a" }}>Selected Shares: <b>{totalSelected}/3</b></div>
            </div>

            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 10 }}>
              {FIRM_ORDER.map((firmId) => {
                const firm = state.firms[firmId];
                const qty = buyModal.selections[firmId];
                const price = priceForFirm(firm);
                const remaining = 3 - totalSelected;
                const canAffordMore = state.players[0].cash >= totalCost + price;
                const canIncrement = firm.active && price > 0 && firm.bankShares > qty && remaining > 0 && canAffordMore;
                const canDecrement = qty > 0;
                const bankAvailability = state.visibility.bankCounts === "PUBLIC"
                  ? `${firm.bankShares} available`
                  : (firm.bankShares > 0 ? "Available" : "Sold out");

                return (
                  <div key={firmId} style={{ borderRadius: 12, border: "1px solid #2a2d35", background: firm.active ? "#161920" : "#12141a", padding: 10, opacity: firm.active ? 1 : 0.55 }}>
                    <div style={{ fontWeight: 900 }}>{firmId[0] + firmId.slice(1).toLowerCase()}</div>
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>{firm.active ? "Active" : "Inactive"} • Size {firm.size}</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>Tier {firm.tier} • Price {price > 0 ? `$${price.toLocaleString()}` : "—"}</div>
                    <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>{bankAvailability}</div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 8 }}>
                      <button
                        disabled={!canIncrement}
                        onClick={() => dispatch({ type: "BUY_SET_QTY", firmId, qty: qty + 1 })}
                        style={{ width: 34, height: 30, borderRadius: 8, border: "1px solid #2a2d35", background: canIncrement ? "#1a1c22" : "#111318", color: canIncrement ? "#eaeaea" : "#666", cursor: canIncrement ? "pointer" : "not-allowed" }}
                      >+
                      </button>
                      <div style={{ margin: "6px 0", fontWeight: 900 }}>{qty}</div>
                      <button
                        disabled={!canDecrement}
                        onClick={() => dispatch({ type: "BUY_SET_QTY", firmId, qty: qty - 1 })}
                        style={{ width: 34, height: 30, borderRadius: 8, border: "1px solid #2a2d35", background: canDecrement ? "#1a1c22" : "#111318", color: canDecrement ? "#eaeaea" : "#666", cursor: canDecrement ? "pointer" : "not-allowed" }}
                      >−
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <button
                onClick={() => {
                  if (totalSelected === 0) {
                    const ok = window.confirm("Confirm: no purchase of shares?");
                    if (!ok) return;
                  }
                  dispatch({ type: "BUY_CONFIRM" });
                }}
                style={{ background: "#1a1c22", color: "#eaeaea", border: "1px solid #2a2d35", borderRadius: 12, padding: "10px 14px", minWidth: 180 }}
              >
                Confirm Purchase
              </button>
            </div>
          </div>
        </div>
      )}

      {state.ui.modal?.kind === "FOUND_SELECT" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <div style={{ width: 520, background: "#0e0f12", border: "1px solid #2a2d35", borderRadius: 18, padding: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 900 }}>Found a firm</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>Choose one of the available firms.</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              {state.ui.modal.choices.map((f) => (
                <button
                  key={f}
                  onClick={() => dispatch({ type: "FOUND_SELECT", firmId: f })}
                  style={{ background: "#1a1c22", color: "#eaeaea", border: "1px solid #2a2d35", borderRadius: 12, padding: "10px 12px" }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {state.ui.modal?.kind === "SURVIVOR_CHOICE" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <div style={{ width: 520, background: "#0e0f12", border: "1px solid #2a2d35", borderRadius: 18, padding: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 900 }}>Choose surviving firm</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>Firms are tied in size. Select which remains.</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              {state.ui.modal.choices.map((f) => (
                <button
                  key={f}
                  onClick={() => dispatch({ type: "SURVIVOR_SELECT", firmId: f })}
                  style={{ background: "#1a1c22", color: "#eaeaea", border: "1px solid #2a2d35", borderRadius: 12, padding: "10px 12px" }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {state.ui.modal?.kind === "ENDGAME" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <div style={{ width: 560, background: "#0e0f12", border: "1px solid #2a2d35", borderRadius: 18, padding: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 1000 }}>Game Over</div>
            <div style={{ marginTop: 12 }}>
              {state.ui.modal.standings.map((s, i) => (
                <div key={s.name} style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", border: "1px solid #2a2d35", borderRadius: 12, background: "#12141a", marginTop: 8 }}>
                  <div style={{ fontWeight: 900 }}>{i + 1}. {s.name}</div>
                  <div>${s.cash.toLocaleString()}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => dispatch({ type: "NEW_GAME", seed: "alpha" })}
              style={{ marginTop: 14, background: "#1a1c22", color: "#eaeaea", border: "1px solid #2a2d35", borderRadius: 12, padding: "10px 12px", width: "100%" }}
            >
              New Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
