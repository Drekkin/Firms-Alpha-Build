import test from "node:test";
import assert from "node:assert/strict";

import { SAFE_SIZE } from "../src/game/constants.ts";
import { computePlacementPreview, createInitialState, placeTile } from "../src/game/engine.ts";

test("safe threshold constant is 11", () => {
  assert.equal(SAFE_SIZE, 11);
});

test("firm at size 11+ cannot be acquired in merger preview", () => {
  const state = createInitialState("safe-merger-block");

  state.firms.ALPHA.active = true;
  state.firms.BETA.active = true;

  for (let c = 0; c < SAFE_SIZE; c++) {
    state.board[0][c] = { occupied: true, firmId: "ALPHA" };
  }
  state.firms.ALPHA.size = SAFE_SIZE;
  state.firms.ALPHA.safe = true;

  state.board[2][0] = { occupied: true, firmId: "BETA" };
  state.firms.BETA.size = 1;

  state.players[0].hand = [{ id: "A2", row: 1, col: 0 }];

  const preview = computePlacementPreview(state, "A2");
  assert.ok(preview);
  assert.equal(preview?.outcome, "ILLEGAL");
  assert.match(preview?.details ?? "", /safe firm/i);
});

test("turn flow goes from placement resolution directly to buy phase", () => {
  const state = createInitialState("direct-buy");
  state.players[0].hand = [{ id: "A1", row: 0, col: 0 }];

  const result = placeTile(state, 0, "A1");

  assert.equal(result.ok, true);
  assert.equal(state.ui.phase, "HUMAN_BUY");
  assert.equal(state.ui.timer.stepKey, "HUMAN_BUY");
});
