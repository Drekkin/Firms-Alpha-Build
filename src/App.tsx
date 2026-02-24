import { useReducer } from "react";
import { reducer } from "./game/reducer";
import { createInitialState, runBots } from "./game/engine";
import { useTimer } from "./hooks/useTimer";
import TopBar from "./ui/TopBar";
import Board from "./ui/Board";
import RightSidebar from "./ui/RightSidebar";
import BottomBar from "./ui/BottomBar";
import SettingsModal from "./ui/SettingsModal";

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => createInitialState("alpha"));

  useTimer(state.ui.timer.active, state.ui.timer.endsAt, () => dispatch({ type: "TIMEOUT" }));

  // If bot phase is active, allow timeouts to advance; also you can manually force by waiting.
  // (Bots run on timeout handler for BOT_TURN)

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
          onBuy={(firmId, qty) => dispatch({ type: "BUY", firmId, qty })}
          onMergerDecision={(trade, sell) => dispatch({ type: "MERGER_DECIDE", trade, sell })}
        />
      </div>

      <BottomBar
        state={state}
        onDragStart={(tileId) => dispatch({ type: "DRAG_START", tileId })}
        onHoverTile={(tileId) => dispatch({ type: "HOVER_TILE", tileId })}
        onEndBuy={() => dispatch({ type: "END_BUY" })}
      />

      <SettingsModal state={state} onClose={() => dispatch({ type: "CLOSE_SETTINGS" })} />

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
