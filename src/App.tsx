import { PointerEvent as ReactPointerEvent, useEffect, useReducer, useRef, useState } from "react";
import { reducer } from "./game/reducer";
import { createInitialState } from "./game/engine";
import { useTimer } from "./hooks/useTimer";
import TopBar from "./ui/TopBar";
import Board from "./ui/Board";
import RightSidebar from "./ui/RightSidebar";
import BottomBar from "./ui/BottomBar";
import SettingsModal from "./ui/SettingsModal";
import TransparencyToggle from "./ui/TransparencyToggle";
import { FIRM_ORDER } from "./game/constants";
import { priceForFirm } from "./game/pricing";

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => createInitialState("alpha"));
  const [transparentModalByKey, setTransparentModalByKey] = useState<Record<string, boolean>>({});

  const toggleTransparency = (key: string) => {
    setTransparentModalByKey((current) => ({ ...current, [key]: !current[key] }));
  };

  const isTransparent = (key: string) => Boolean(transparentModalByKey[key]);

  useTimer(state.ui.timer.active, state.ui.timer.endsAt, () => dispatch({ type: "TIMEOUT" }));

  const buyModal = state.ui.modal?.kind === "BUY" ? state.ui.modal : null;
  const totalSelected = buyModal ? Object.values(buyModal.selections).reduce((sum, qty) => sum + qty, 0) : 0;
  const totalCost = buyModal
    ? FIRM_ORDER.reduce((sum, firmId) => sum + buyModal.selections[firmId] * priceForFirm(state.firms[firmId]), 0)
    : 0;

  const boardInteractionEnabled = state.ui.phase === "HUMAN_PLACE" && state.currentPlayer === 0;
  const boardHostRef = useRef<HTMLDivElement | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ row: number; col: number } | null>(null);
  const [snapAnim, setSnapAnim] = useState<{ tileId: string; fromX: number; fromY: number; toX: number; toY: number } | null>(null);
  const dragPosRef = useRef<{ x: number; y: number } | null>(null);
  const dragOverCellRef = useRef<{ row: number; col: number } | null>(null);

  const setDragPosition = (pos: { x: number; y: number } | null) => {
    dragPosRef.current = pos;
    setDragPos(pos);
  };

  const setResolvedDragOverCell = (cell: { row: number; col: number } | null) => {
    dragOverCellRef.current = cell;
    setDragOverCell(cell);
  };

  const getCellFromPoint = (x: number, y: number): { row: number; col: number } | null => {
    const host = boardHostRef.current;
    if (!host) return null;
    const boardSvg = host.querySelector("svg");
    if (!boardSvg) return null;
    const rect = boardSvg.getBoundingClientRect();
    const pad = 28;
    const cell = 52;
    const localX = x - rect.left - pad;
    const localY = y - rect.top - pad;
    if (localX < 0 || localY < 0) return null;
    const col = Math.floor(localX / cell);
    const row = Math.floor(localY / cell);
    if (col < 0 || col > 11 || row < 0 || row > 8) return null;
    return { row, col };
  };

  const updateDragOverCell = (x: number, y: number) => {
    const candidate = getCellFromPoint(x, y);
    if (!candidate) {
      setResolvedDragOverCell(null);
      return;
    }
    const draggingTileId = state.ui.draggingTileId;
    if (!draggingTileId) {
      setResolvedDragOverCell(null);
      return;
    }
    const tile = state.players[0].hand.find((t) => t.id === draggingTileId);
    if (!tile || tile.row !== candidate.row || tile.col !== candidate.col) {
      setResolvedDragOverCell(null);
      return;
    }
    setResolvedDragOverCell(candidate);
  };

  const commitDragPlacement = (row: number, col: number) => {
    dispatch({ type: "DRAG_END", row, col });
  };

  useEffect(() => {
    if (!state.ui.draggingTileId) return;

    const handlePointerUp = (event: PointerEvent) => {
      const dropCell = dragOverCellRef.current ?? getCellFromPoint(event.clientX, event.clientY);
      const draggingTileId = state.ui.draggingTileId;
      const tile = draggingTileId ? state.players[0].hand.find((t) => t.id === draggingTileId) : null;
      const validDrop = Boolean(tile && dropCell && tile.row === dropCell.row && tile.col === dropCell.col);
      const currentDragPos = dragPosRef.current;

      setDragPosition(null);
      setResolvedDragOverCell(null);

      if (!draggingTileId) return;
      if (!validDrop || !dropCell || !currentDragPos) {
        dispatch({ type: "DRAG_CANCEL" });
        return;
      }

      const host = boardHostRef.current;
      if (!host) {
        commitDragPlacement(dropCell.row, dropCell.col);
        return;
      }
      const boardSvg = host.querySelector("svg");
      const rect = boardSvg ? boardSvg.getBoundingClientRect() : host.getBoundingClientRect();
      const pad = 28;
      const cell = 52;
      const targetX = rect.left + pad + dropCell.col * cell + cell / 2;
      const targetY = rect.top + pad + dropCell.row * cell + cell / 2;

      setSnapAnim({ tileId: draggingTileId, fromX: currentDragPos.x, fromY: currentDragPos.y, toX: targetX, toY: targetY });
      window.setTimeout(() => {
        setSnapAnim(null);
        commitDragPlacement(dropCell.row, dropCell.col);
      }, 120);
    };

    const handlePointerCancel = () => {
      setDragPosition(null);
      setResolvedDragOverCell(null);
      dispatch({ type: "DRAG_CANCEL" });
    };

    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [state.players, state.ui.draggingTileId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <TopBar state={state} onOpenSettings={() => dispatch({ type: "OPEN_SETTINGS" })} />

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div ref={boardHostRef} style={{ flex: 1, padding: 14, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Board
            state={state}
            onDropCell={commitDragPlacement}
            onHoverCellFirm={() => {}}
            canInteract={boardInteractionEnabled}
            dragOverCell={dragOverCell}
          />
        </div>

        <RightSidebar
          state={state}
          onMergerDecision={(trade, sell) => dispatch({ type: "MERGER_DECIDE", trade, sell })}
        />
      </div>

      <BottomBar
        state={state}
        onDragStart={(tileId, event) => {
          if (!boardInteractionEnabled) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          dispatch({ type: "DRAG_START", tileId });
          dispatch({ type: "HOVER_TILE", tileId });
          setDragPosition({ x: event.clientX, y: event.clientY });
          updateDragOverCell(event.clientX, event.clientY);
        }}
        onHoverTile={(tileId) => dispatch({ type: "HOVER_TILE", tileId })}
        onDragMove={(event: ReactPointerEvent<HTMLDivElement>) => {
          if (!state.ui.draggingTileId) return;
          setDragPosition({ x: event.clientX, y: event.clientY });
          updateDragOverCell(event.clientX, event.clientY);
        }}
        onDragEnd={() => {}}
        onDragCancel={() => {
          setDragPosition(null);
          setResolvedDragOverCell(null);
          dispatch({ type: "DRAG_CANCEL" });
        }}
        canInteract={boardInteractionEnabled}
      />

      {(state.ui.draggingTileId && dragPos) || snapAnim ? (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: 52,
            height: 72,
            borderRadius: 12,
            background: "#2a2d35",
            border: "1px solid #5a7dff",
            color: "white",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontWeight: 900,
            pointerEvents: "none",
            zIndex: 30,
            transform: snapAnim
              ? `translate(${snapAnim.toX - 26}px, ${snapAnim.toY - 36}px) scale(0.96)`
              : `translate(${(dragPos?.x ?? 0) - 26}px, ${(dragPos?.y ?? 0) - 36}px) scale(1)`,
            transition: snapAnim ? "transform 120ms ease-out" : "none",
            boxShadow: snapAnim ? "0 0 0 2px rgba(59,124,255,0.35), 0 8px 20px rgba(0,0,0,0.35)" : "0 8px 20px rgba(0,0,0,0.35)",
          }}
        >
          {snapAnim?.tileId ?? state.ui.draggingTileId}
        </div>
      ) : null}

      <SettingsModal state={state} onClose={() => dispatch({ type: "CLOSE_SETTINGS" })} />

      {buyModal && (
        <div style={{ position: "fixed", inset: 0, background: isTransparent("BUY") ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.65)", display: "flex", justifyContent: "center", alignItems: "center", padding: 20, zIndex: 20 }}>
          <div style={{ width: 860, background: "#0e0f12", border: "1px solid #2a2d35", borderRadius: 18, padding: 16, opacity: isTransparent("BUY") ? 0.42 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 20, fontWeight: 900 }}>Buy Shares</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {isTransparent("BUY") && (
                  <div style={{ fontSize: 11, padding: "4px 8px", borderRadius: 999, background: "#2f415f", border: "1px solid #4d6691" }}>
                    Transparent mode
                  </div>
                )}
                <TransparencyToggle isTransparent={isTransparent("BUY")} onToggle={() => toggleTransparency("BUY")} />
              </div>
            </div>
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
        <div style={{ position: "fixed", inset: 0, background: isTransparent("FOUND_SELECT") ? "rgba(0,0,0,0.14)" : "rgba(0,0,0,0.55)", display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <div style={{ width: 520, background: "#0e0f12", border: "1px solid #2a2d35", borderRadius: 18, padding: 16, opacity: isTransparent("FOUND_SELECT") ? 0.45 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 900 }}>Found a firm</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {isTransparent("FOUND_SELECT") && <div style={{ fontSize: 11, opacity: 0.85 }}>Transparent mode</div>}
                <TransparencyToggle isTransparent={isTransparent("FOUND_SELECT")} onToggle={() => toggleTransparency("FOUND_SELECT")} />
              </div>
            </div>
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
        <div style={{ position: "fixed", inset: 0, background: isTransparent("SURVIVOR_CHOICE") ? "rgba(0,0,0,0.14)" : "rgba(0,0,0,0.55)", display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <div style={{ width: 520, background: "#0e0f12", border: "1px solid #2a2d35", borderRadius: 18, padding: 16, opacity: isTransparent("SURVIVOR_CHOICE") ? 0.45 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 900 }}>Choose surviving firm</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {isTransparent("SURVIVOR_CHOICE") && <div style={{ fontSize: 11, opacity: 0.85 }}>Transparent mode</div>}
                <TransparencyToggle isTransparent={isTransparent("SURVIVOR_CHOICE")} onToggle={() => toggleTransparency("SURVIVOR_CHOICE")} />
              </div>
            </div>
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
        <div style={{ position: "fixed", inset: 0, background: isTransparent("ENDGAME") ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <div style={{ width: 560, background: "#0e0f12", border: "1px solid #2a2d35", borderRadius: 18, padding: 16, opacity: isTransparent("ENDGAME") ? 0.45 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 1000 }}>Game Over</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {isTransparent("ENDGAME") && <div style={{ fontSize: 11, opacity: 0.85 }}>Transparent mode</div>}
                <TransparencyToggle isTransparent={isTransparent("ENDGAME")} onToggle={() => toggleTransparency("ENDGAME")} />
              </div>
            </div>
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
