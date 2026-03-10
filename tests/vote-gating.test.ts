import test from "node:test";
import assert from "node:assert/strict";

import { createInitialState, enterHumanVoteOrBuyPhase, foundFirm, startHumanVoteWindow } from "../src/game/engine.ts";
import { VOTE_TIMER_MS } from "../src/game/constants.ts";
import { isAnyVotePossible } from "../src/game/voteSelectors.ts";

test("isAnyVotePossible requires all legal vote conditions", () => {
  const state = createInitialState("vote-gating");

  state.firms.ALPHA.active = true;
  state.firms.ALPHA.safe = false;
  state.firms.ALPHA.bankShares = 0;
  state.players[0].shares.ALPHA = 1;

  assert.equal(isAnyVotePossible(state, 0), true);

  state.players[0].shares.ALPHA = 0;
  assert.equal(isAnyVotePossible(state, 0), false);

  state.players[0].shares.ALPHA = 1;
  state.firms.ALPHA.bankShares = 1;
  assert.equal(isAnyVotePossible(state, 0), false);

  state.firms.ALPHA.bankShares = 0;
  state.firms.ALPHA.safe = true;
  assert.equal(isAnyVotePossible(state, 0), false);
});

test("vote phase starts only when legal and uses a 15-second timer", () => {
  const state = createInitialState("vote-window");
  state.firms.ALPHA.active = true;
  state.firms.ALPHA.bankShares = 0;
  state.players[0].shares.ALPHA = 1;

  enterHumanVoteOrBuyPhase(state);

  assert.equal(state.ui.phase, "HUMAN_VOTE");
  assert.equal(state.ui.timer.stepKey, "HUMAN_VOTE");

  const delta = state.ui.timer.endsAt - Date.now();
  assert.ok(delta > VOTE_TIMER_MS - 250 && delta <= VOTE_TIMER_MS);
});

test("vote phase is skipped cleanly when no legal vote targets exist", () => {
  const state = createInitialState("vote-skip");
  state.firms.ALPHA.active = true;
  state.firms.ALPHA.bankShares = 5;

  startHumanVoteWindow(state);

  assert.equal(state.ui.phase, "HUMAN_BUY");
  assert.equal(state.ui.timer.stepKey, "HUMAN_BUY");
  assert.notEqual(state.ui.timer.label, "Vote Window");
});

test("bot-founded firms do not open the human vote window", () => {
  const state = createInitialState("bot-found");
  state.currentPlayer = 1;
  state.ui.phase = "BOT_TURN";
  state.board[0][0].occupied = true;
  state.board[0][0].firmId = null;
  state.firms.ALPHA.bankShares = 1;

  foundFirm(state, 1, "ALPHA", "A1");

  assert.equal(state.ui.phase, "BOT_TURN");
  assert.notEqual(state.ui.timer.stepKey, "HUMAN_VOTE");
});
