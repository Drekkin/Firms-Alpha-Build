import { FirmId } from "./types";

export type Action =
  | { type: "NEW_GAME"; seed?: string }
  | { type: "OPEN_SETTINGS" }
  | { type: "CLOSE_SETTINGS" }
  | { type: "HOVER_TILE"; tileId: string | null }
  | { type: "DRAG_START"; tileId: string }
  | { type: "DRAG_END"; row: number; col: number }
  | { type: "FOUND_SELECT"; firmId: FirmId }
  | { type: "CALL_VOTE"; firmId: FirmId }
  | { type: "BUY"; firmId: FirmId; qty: number }
  | { type: "END_BUY" }
  | { type: "MERGER_DECIDE"; trade: number; sell: number }
  | { type: "SURVIVOR_SELECT"; firmId: FirmId }
  | { type: "TIMEOUT" };
