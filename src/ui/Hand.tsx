import { PointerEvent as ReactPointerEvent } from "react";
import { Tile } from "../game/types";

export default function Hand({
  tiles,
  onDragStart,
  onHoverTile,
  onDragMove,
  onDragEnd,
  onDragCancel,
  draggingTileId,
  canInteract,
}: {
  tiles: Tile[];
  onDragStart: (id: string, event: ReactPointerEvent<HTMLDivElement>) => void;
  onHoverTile: (id: string | null) => void;
  onDragMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDragCancel: () => void;
  draggingTileId: string | null;
  canInteract: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {tiles.map((t) => {
        const isDragging = draggingTileId === t.id;
        return (
          <div
            key={t.id}
            onPointerDown={(event) => {
              if (!canInteract) return;
              onDragStart(t.id, event);
            }}
            onPointerMove={(event) => {
              if (!isDragging) return;
              onDragMove(event);
            }}
            onPointerUp={() => {
              if (!isDragging) return;
              onDragEnd();
            }}
            onPointerCancel={() => {
              if (!isDragging) return;
              onDragCancel();
            }}
            onMouseEnter={() => onHoverTile(t.id)}
            onMouseLeave={() => onHoverTile(null)}
            style={{
              width: 52,
              height: 72,
              borderRadius: 12,
              background: "#2a2d35",
              border: "1px solid #3a3f4a",
              color: "white",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              cursor: canInteract ? "grab" : "default",
              userSelect: "none",
              fontWeight: 900,
              touchAction: "none",
              opacity: isDragging ? 0.3 : 1,
              transform: isDragging ? "scale(0.96)" : "scale(1)",
              transition: "opacity 120ms ease, transform 120ms ease",
            }}
          >
            {t.id}
          </div>
        );
      })}
    </div>
  );
}
