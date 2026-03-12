import test from "node:test";
import assert from "node:assert/strict";

import { createInitialState, getLegalPlayableTilesInHand } from "../src/game/engine.ts";
import { reducer } from "../src/game/reducer.ts";

test("drag end on a valid square commits placement", () => {
  let state = createInitialState("drag-valid");
  const tile = getLegalPlayableTilesInHand(state, 0)[0];
  assert.ok(tile);

  state = reducer(state, { type: "DRAG_START", tileId: tile.id });
  state = reducer(state, { type: "DRAG_END", row: tile.row, col: tile.col });

  assert.equal(state.board[tile.row][tile.col].occupied, true);
  assert.equal(state.players[0].hand.some((t) => t.id === tile.id), false);
});

test("drag end on an invalid square cancels placement", () => {
  let state = createInitialState("drag-invalid");
  const tile = getLegalPlayableTilesInHand(state, 0)[0];
  assert.ok(tile);

  state = reducer(state, { type: "DRAG_START", tileId: tile.id });
  state = reducer(state, { type: "DRAG_END", row: (tile.row + 1) % 9, col: tile.col });

  assert.equal(state.board[tile.row][tile.col].occupied, false);
  assert.equal(state.players[0].hand.some((t) => t.id === tile.id), true);
});

test("drag placement is gated to the human placement phase", () => {
  let state = createInitialState("drag-gated");
  const tile = getLegalPlayableTilesInHand(state, 0)[0];
  assert.ok(tile);

  state.ui.phase = "HUMAN_BUY";
  state = reducer(state, { type: "DRAG_START", tileId: tile.id });
  state = reducer(state, { type: "DRAG_END", row: tile.row, col: tile.col });

  assert.equal(state.board[tile.row][tile.col].occupied, false);
  assert.equal(state.players[0].hand.some((t) => t.id === tile.id), true);
});
