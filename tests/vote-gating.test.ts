import test from "node:test";
import assert from "node:assert/strict";

import { SAFE_SIZE } from "../src/game/constants.ts";
import { createInitialState, enterHumanBuyPhase, foundFirm, handleTimeout, placeTile } from "../src/game/engine.ts";

function activateFirmWithSize(state: ReturnType<typeof createInitialState>, firm: "ALPHA", size: number): void {
  state.firms[firm].active = true;
  for (let c = 0; c < size; c++) {
    state.board[0][c] = { occupied: true, firmId: firm };
  }
}

test("firm only becomes safe automatically at size 11", () => {
  const state10 = createInitialState("safe-10");
  activateFirmWithSize(state10, "ALPHA", SAFE_SIZE - 1);
  state.players[0].hand = [{ id: "K1", row: 0, col: 10 }];

  const res10 = placeTile(state10, 0, "K1");
  assert.equal(res10.ok, true);
  assert.equal(state10.firms.ALPHA.size, SAFE_SIZE - 1);
  assert.equal(state10.firms.ALPHA.safe, false);

  const state11 = createInitialState("safe-11");
  activateFirmWithSize(state11, "ALPHA", SAFE_SIZE - 1);
  state11.players[0].hand = [{ id: "K1", row: 0, col: 10 }];

  const res11 = placeTile(state11, 0, "K1");
  assert.equal(res11.ok, true);
  assert.equal(state11.firms.ALPHA.size, SAFE_SIZE);
  assert.equal(state11.firms.ALPHA.safe, true);
  assert.ok(state11.log.some((line) => line.includes("ALPHA is now SAFE (size 11).")));
});

test("no vote phase exists; human proceeds directly to buy phase", () => {
  const state = createInitialState("no-vote-phase");
  state.currentPlayer = 0;

  enterHumanBuyPhase(state);

  assert.equal(state.ui.phase, "HUMAN_BUY");
  assert.equal(state.ui.timer.stepKey, "HUMAN_BUY");
  assert.notEqual(state.ui.timer.label, "Vote Window");
});

test("bot-founded firms do not trigger any vote behavior", () => {
  const state = createInitialState("bot-found");
  state.currentPlayer = 1;
  state.ui.phase = "BOT_TURN";
  state.board[0][0].occupied = true;
  state.board[0][0].firmId = null;
  state.firms.ALPHA.bankShares = 1;

  foundFirm(state, 1, "ALPHA", "A1");

  assert.equal(state.ui.phase, "BOT_TURN");
  assert.notEqual(state.ui.timer.label, "Vote Window");
  assert.notEqual(state.ui.timer.stepKey, "HUMAN_VOTE");
});

test("timeout flow after placement never enters a vote phase", () => {
  const state = createInitialState("timeout-flow");

  handleTimeout(state);

  assert.notEqual(state.ui.phase, "HUMAN_VOTE");
  assert.notEqual(state.ui.timer.stepKey, "HUMAN_VOTE");
});
