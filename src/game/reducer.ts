import { Action } from "./actions";
import { GameState } from "./types";
import {
  buyShares,
  confirmBuySelection,
  canCallVote,
  chooseSurvivor,
  computePlacementPreview,
  createInitialState,
  foundFirm,
  handleTimeout,
  placeTile,
  resolveVote,
  applyMergerDecision,
} from "./engine";


function canHumanPlace(state: GameState): boolean {
  const blockingModal = state.ui.modal && ["FOUND_SELECT", "SURVIVOR_CHOICE", "MERGER", "BUY"].includes(state.ui.modal.kind);
  return state.currentPlayer === 0 && state.ui.phase === "HUMAN_PLACE" && !blockingModal;
}

export function reducer(state: GameState, action: Action): GameState {
  // clone shallow (we mutate inside engine for simplicity in alpha)
  const next: GameState = structuredClone(state);

  switch (action.type) {
    case "NEW_GAME":
      return createInitialState(action.seed ?? "alpha");

    case "OPEN_SETTINGS":
      next.ui.settingsOpen = true;
      return next;

    case "CLOSE_SETTINGS":
      next.ui.settingsOpen = false;
      return next;

    case "HOVER_TILE":
      if (!canHumanPlace(next)) {
        next.ui.hoveredTileId = null;
        next.ui.preview = null;
        return next;
      }
      next.ui.hoveredTileId = action.tileId;
      next.ui.preview = action.tileId ? computePlacementPreview(next, action.tileId) : null;
      return next;

    case "DRAG_START":
      if (!canHumanPlace(next)) return next;
      next.ui.draggingTileId = action.tileId;
      return next;

    case "DRAG_END": {
      const dragging = next.ui.draggingTileId;
      next.ui.draggingTileId = null;
      if (!dragging) return next;
      if (!canHumanPlace(next)) {
        next.log.push("Drop ignored: not in human placement phase.");
        return next;
      }
      const tile = next.players[0].hand.find((t) => t.id === dragging);
      if (!tile) return next;
      if (tile.row !== action.row || tile.col !== action.col) {
        next.log.push(`Drop ignored: ${dragging} must be placed on its own coordinate.`);
        return next;
      }
      const res = placeTile(next, 0, dragging);
      if (!res.ok) next.log.push(`Illegal: ${res.error}`);
      // If merger modal created, timer label handled by engine.
      return next;
    }

    case "FOUND_SELECT": {
      const modal = next.ui.modal;
      if (!modal || modal.kind !== "FOUND_SELECT") return next;
      foundFirm(next, 0, action.firmId, modal.tileId);
      return next;
    }

    case "SURVIVOR_SELECT":
      if (next.currentPlayer !== 0 || next.ui.phase !== "HUMAN_MERGER" || next.ui.modal?.kind !== "SURVIVOR_CHOICE") return next;
      chooseSurvivor(next, 0, action.firmId);
      return next;

    case "MERGER_DECIDE": {
      // only human decisions are sent here; if it's not human's turn, ignore
      const modal = next.ui.modal;
      if (!modal || modal.kind !== "MERGER") return next;
      const ctx = modal.ctx;
      const acq = ctx.acquired[ctx.acquiredIndex];
      const order = ctx.decisionOrderByAcquired[acq] ?? [];
      const actor = order[ctx.orderIndex];
      if (actor !== 0) return next;
      const res = applyMergerDecision(next, 0, action.trade, action.sell);
      if (!res.ok) next.log.push(`Merger decision error: ${res.error}`);
      return next;
    }

    case "CALL_VOTE": {
      if (!canCallVote(next, 0, action.firmId)) {
        next.log.push("Cannot call vote.");
        return next;
      }
      // open vote ctx and resolve immediately (result-only)
      const vctx = { firmId: action.firmId, callerId: 0, votes: { 0: "YES" as const } };
      resolveVote(next, vctx);
      return next;
    }

    case "BUY_SET_QTY": {
      const res = buyShares(next, 0, action.firmId, action.qty);
      if (!res.ok) next.log.push(`Buy selection failed: ${res.error}`);
      return next;
    }

    case "BUY_CONFIRM": {
      const res = confirmBuySelection(next, 0);
      if (!res.ok) next.log.push(`Buy failed: ${res.error}`);
      return next;
    }

    case "TIMEOUT":
      handleTimeout(next);
      return next;

    default:
      return next;
  }
}
