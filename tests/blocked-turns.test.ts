import test from "node:test";
import assert from "node:assert/strict";

import { createInitialState, getLegalPlayableTilesInHand, handleTimeout, runNextBotTurn, startHumanTurn } from "../src/game/engine.ts";
import { GameState } from "../src/game/types.ts";

function blockHandPlacements(state: GameState, playerId: number): void {
  for (const tile of state.players[playerId].hand) {
    state.board[tile.row][tile.col] = { occupied: true, firmId: null };
  }
}

test("human with no legal moves auto-resolves instead of stalling", () => {
  const state = createInitialState("blocked-human");
  blockHandPlacements(state, 0);

  assert.equal(getLegalPlayableTilesInHand(state, 0).length, 0);

  startHumanTurn(state);

  assert.notEqual(state.ui.phase, "HUMAN_PLACE");
  assert.ok(state.log.some((line) => line.includes("You had no legal tile placements. Turn auto-resolved.")));
});

test("bot with no legal moves resolves immediately without BOT_STEP wait", () => {
  const state = createInitialState("blocked-bot");
  blockHandPlacements(state, 1);

  state.ui.phase = "BOT_TURN";
  state.ui.botTurnState = { botOrder: [1], botIndex: 0 };

  runNextBotTurn(state);

  assert.ok(state.log.some((line) => line.includes("Bot 1 had no legal tile placements. Turn auto-resolved.")));
  assert.notEqual(state.ui.timer.stepKey, "BOT_STEP");
});

test("normal placement phase remains interactive when legal move exists", () => {
  const state = createInitialState("normal-human");

  assert.ok(getLegalPlayableTilesInHand(state, 0).length > 0);

  startHumanTurn(state);

  assert.equal(state.ui.phase, "HUMAN_PLACE");
  assert.equal(state.ui.timer.stepKey, "HUMAN_PLACE");
});

test("repeated blocked states across turns do not deadlock", () => {
  const state = createInitialState("all-blocked");
  blockHandPlacements(state, 0);
  blockHandPlacements(state, 1);
  blockHandPlacements(state, 2);
  blockHandPlacements(state, 3);

  startHumanTurn(state);
  assert.equal(state.ui.phase, "BOT_TURN");
  assert.equal(state.ui.timer.stepKey, "BOT_STEP");

  handleTimeout(state); // bot 2
  assert.equal(state.ui.phase, "BOT_TURN");

  handleTimeout(state); // bot 3 -> finish phase -> next blocked human -> next bot 1
  const humanBlockedLogs = state.log.filter((line) => line.includes("You had no legal tile placements. Turn auto-resolved.")).length;
  assert.ok(humanBlockedLogs >= 2);
  assert.ok(state.roundNumber >= 2);
  assert.equal(state.ui.phase, "BOT_TURN");
});
