import { GameState, FirmId } from "../game/types";

const CELL = 52;
const PAD = 28;

function cellFill(firmId: FirmId | null, occupied: boolean) {
  if (!occupied) return "#0f1116";
  if (!firmId) return "#1a1d25";
  return "#23283a";
}

export default function Board({
  state,
  onDropCell,
  onHoverCellFirm,
}: {
  state: GameState;
  onDropCell: (row: number, col: number) => void;
  onHoverCellFirm: (firmId: FirmId | null) => void;
}) {
  const w = PAD + 12 * CELL + 2;
  const h = PAD + 9 * CELL + 2;

  const preview = state.ui.preview;
  const highlightCell = preview ? { row: preview.row, col: preview.col } : null;

  // firm outline: if hovering a firm tile, highlight all tiles for that firm
  const hoveredFirm = (state.ui.preview?.involvedFirms.length === 1 && state.ui.preview.outcome==="GROW") ? state.ui.preview.involvedFirms[0] : null;

  return (
    <div style={{ position: "relative" }}>
      <svg width={w} height={h} style={{ display: "block" }}>
        {Array.from({ length: 12 }).map((_, c) => (
          <text key={c} x={PAD + c * CELL + CELL / 2} y={18} fill="#8b93a7" fontSize="12" textAnchor="middle">
            {String.fromCharCode(65 + c)}
          </text>
        ))}
        {Array.from({ length: 9 }).map((_, r) => (
          <text key={r} x={14} y={PAD + r * CELL + CELL / 2 + 4} fill="#8b93a7" fontSize="12" textAnchor="middle">
            {r + 1}
          </text>
        ))}

        {state.board.map((row, r) =>
          row.map((cell, c) => {
            const isHL = highlightCell && highlightCell.row === r && highlightCell.col === c;
            const isFirmOutline = cell.occupied && hoveredFirm && cell.firmId === hoveredFirm;
            return (
              <g key={`${r}-${c}`}>
                <rect
                  x={PAD + c * CELL}
                  y={PAD + r * CELL}
                  width={CELL}
                  height={CELL}
                  rx={8}
                  fill={cellFill(cell.firmId, cell.occupied)}
                  stroke={isHL ? "#3b7cff" : isFirmOutline ? "#87a7ff" : "#2a2d35"}
                  strokeWidth={isHL ? 2 : isFirmOutline ? 2 : 1}
                  onPointerUp={() => onDropCell(r, c)}
                  onMouseEnter={() => onHoverCellFirm(cell.firmId)}
                  onMouseLeave={() => onHoverCellFirm(null)}
                />
                {cell.occupied && (
                  <text
                    x={PAD + c * CELL + CELL / 2}
                    y={PAD + r * CELL + CELL / 2 + 4}
                    fill="#cdd3e3"
                    fontSize="12"
                    textAnchor="middle"
                    style={{ fontWeight: 800 }}
                  >
                    {cell.firmId ? cell.firmId.slice(0, 2) : "•"}
                  </text>
                )}
              </g>
            );
          })
        )}
      </svg>

      {state.ui.hoveredTileId && preview && (
        <div
          style={{
            position: "absolute",
            left: PAD + preview.col * CELL + 8,
            top: PAD + preview.row * CELL - 34,
            background: "#12141a",
            border: "1px solid #2a2d35",
            borderRadius: 12,
            padding: "6px 8px",
            fontSize: 12,
            pointerEvents: "none",
            maxWidth: 260,
          }}
        >
          {preview.details}
        </div>
      )}
    </div>
  );
}
