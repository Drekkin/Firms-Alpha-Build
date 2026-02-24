import { BOARD_COLS, BOARD_ROWS } from "./constants";
import { Cell, FirmId, GameState } from "./types";

export function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_ROWS && c >= 0 && c < BOARD_COLS;
}

export function neighbors4(r: number, c: number): { r: number; c: number }[] {
  const out: { r: number; c: number }[] = [];
  if (inBounds(r - 1, c)) out.push({ r: r - 1, c });
  if (inBounds(r + 1, c)) out.push({ r: r + 1, c });
  if (inBounds(r, c - 1)) out.push({ r, c: c - 1 });
  if (inBounds(r, c + 1)) out.push({ r, c: c + 1 });
  return out;
}

export function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

export function findConnectedUnincorpCluster(state: GameState, startR: number, startC: number): { r: number; c: number }[] {
  // cluster of occupied cells with firmId === null
  const board = state.board;
  const start = board[startR][startC];
  if (!start.occupied || start.firmId !== null) return [];
  const q: { r: number; c: number }[] = [{ r: startR, c: startC }];
  const seen = new Set<string>([`${startR},${startC}`]);
  const out: { r: number; c: number }[] = [];
  while (q.length) {
    const cur = q.shift()!;
    out.push(cur);
    for (const n of neighbors4(cur.r, cur.c)) {
      const k = `${n.r},${n.c}`;
      if (seen.has(k)) continue;
      const cell = board[n.r][n.c];
      if (cell.occupied && cell.firmId === null) {
        seen.add(k);
        q.push(n);
      }
    }
  }
  return out;
}

export function findFirmTiles(state: GameState, firmId: FirmId): { r: number; c: number }[] {
  const out: { r: number; c: number }[] = [];
  for (let r = 0; r < state.board.length; r++) {
    for (let c = 0; c < state.board[0].length; c++) {
      const cell = state.board[r][c];
      if (cell.occupied && cell.firmId === firmId) out.push({ r, c });
    }
  }
  return out;
}

export function touchingFirms(state: GameState, r: number, c: number): FirmId[] {
  const s = new Set<FirmId>();
  for (const n of neighbors4(r, c)) {
    const cell = state.board[n.r][n.c];
    if (cell.occupied && cell.firmId) s.add(cell.firmId);
  }
  return [...s];
}

export function touchingUnincorp(state: GameState, r: number, c: number): boolean {
  for (const n of neighbors4(r, c)) {
    const cell = state.board[n.r][n.c];
    if (cell.occupied && cell.firmId === null) return true;
  }
  return false;
}
