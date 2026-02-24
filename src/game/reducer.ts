import { Action } from "./actions";
import { GameState } from "./types";
import {
  buyShares,
  canCallVote,
  chooseSurvivor,
  computePlacementPreview,
  createInitialState,
  foundFirm,
  handleTimeout,
  placeTile,
  resolveVote,
  runBots,
  startHumanBuy,
  startHumanTurn,
  startHumanVoteWindow,
  applyMergerDecision,
} from "./engine";
import { FIRM_ORDER } from "./constants";

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
      next.ui.hoveredTileId = action.tileId;
      next.ui.preview = action.tileId ? computePlacementPreview(next, action.tileId) : null;
      return next;

    case "DRAG_START":
      next.ui.draggingTileId = action.tileId;
      return next;

    case "DRAG_END": {
      const dragging = next.ui.draggingTileId;
      next.ui.draggingTileId = null;
      if (!dragging) return next;
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

    case "BUY": {
      const res = buyShares(next, 0, action.firmId, action.qty);
      if (!res.ok) next.log.push(`Buy failed: ${res.error}`);
      return next;
    }

    case "END_BUY": {
      // end buy phase now
      // engine endBuyPhase is internal; easiest: trigger timeout behavior for buy (it ends turn)
      // but here we want immediate end without buying further.
      // Use handleTimeout but it logs; instead simulate: runBots via setting BOT_TURN.
      // We'll reuse: start bot phase by calling timeout on BUY which ends buy.
      // Minimal: call handleTimeout after setting timer step
      handleTimeout(next); // if in buy it ends
      return next;
    }

    case "TIMEOUT":
      handleTimeout(next);
      return next;

    default:
      return next;
  }
}
