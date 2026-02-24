import { Tile } from "../game/types";

export default function Hand({
  tiles,
  onDragStart,
  onHoverTile,
}: {
  tiles: Tile[];
  onDragStart: (id: string) => void;
  onHoverTile: (id: string | null) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {tiles.map((t) => (
        <div
          key={t.id}
          onPointerDown={() => onDragStart(t.id)}
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
            cursor: "grab",
            userSelect: "none",
            fontWeight: 900,
          }}
        >
          {t.id}
        </div>
      ))}
    </div>
  );
}
