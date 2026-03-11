import { PointerEvent as ReactPointerEvent } from "react";
import { GameState } from "../game/types";
import Hand from "./Hand";
import TimerPill from "./TimerPill";

export default function BottomBar({
  state,
  onDragStart,
  onHoverTile,
  onDragMove,
  onDragEnd,
  onDragCancel,
  canInteract,
}: {
  state: GameState;
  onDragStart: (tileId: string, event: ReactPointerEvent<HTMLDivElement>) => void;
  onHoverTile: (tileId: string | null) => void;
  onDragMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDragCancel: () => void;
  canInteract: boolean;
}) {
  const you = state.players[0];

  return (
    <div style={{ borderTop: "1px solid #24262c", padding: 10, display: "flex", gap: 14, alignItems: "center" }}>
      <div style={{ minWidth: 280 }}>
        <div style={{ fontSize: 12, opacity: 0.8 }}>You</div>
        <div style={{ fontSize: 16, fontWeight: 900 }}>Cash: ${you.cash.toLocaleString()}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
          {Object.entries(you.shares).map(([k, v]) => (
            <div key={k} style={{ fontSize: 11, padding: "2px 6px", border: "1px solid #2a2d35", borderRadius: 10, background: "#15171d" }}>
              {k.slice(0, 2)}: {v}
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Your tiles (drag onto board)</div>
        <Hand
          tiles={you.hand}
          onDragStart={onDragStart}
          onHoverTile={onHoverTile}
          onDragMove={onDragMove}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
          draggingTileId={state.ui.draggingTileId}
          canInteract={canInteract}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
        <TimerPill active={state.ui.timer.active} endsAt={state.ui.timer.endsAt} label={state.ui.timer.label} />
      </div>
    </div>
  );
}
