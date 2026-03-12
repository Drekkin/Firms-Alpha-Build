import test from "node:test";
import assert from "node:assert/strict";

import { applyMergerDecision, createInitialState } from "../src/game/engine.ts";
import { FirmId, GameState, MergerCtx } from "../src/game/types.ts";
import { priceForFirm } from "../src/game/pricing.ts";

function mergerState({ have, survivorBank }: { have: number; survivorBank: number }): GameState {
  const state = createInitialState("merger-resolution");
  const survivor: FirmId = "ALPHA";
  const acquired: FirmId = "BETA";

  state.currentPlayer = 0;
  state.ui.phase = "HUMAN_MERGER";

  state.firms[survivor].active = true;
  state.firms[survivor].size = 5;
  state.firms[survivor].bankShares = survivorBank;

  state.firms[acquired].active = true;
  state.firms[acquired].size = 5;

  state.players[0].shares[acquired] = have;
  state.players[0].shares[survivor] = 0;

  const decisionOrderByAcquired = Object.fromEntries(
    Object.keys(state.firms).map((id) => [id, []])
  ) as Record<FirmId, number[]>;
  decisionOrderByAcquired[acquired] = [0];

  const ctx: MergerCtx = {
    initiatorId: 0,
    triggerTile: { row: 0, col: 0 },
    survivor,
    survivorChoices: [survivor],
    acquired: [acquired],
    decisionOrderByAcquired,
    acquiredIndex: 0,
    orderIndex: 0,
    currentTotals: { tradedIn: 0, tradeOut: 0, sold: 0, held: 0, tradeCapped: false },
    remainingShares: { 0: have, 1: 0, 2: 0, 3: 0 },
  };

  state.ui.modal = { kind: "MERGER", ctx };
  return state;
}

test("accepts mixed trade/sell/keep in a single merger decision", () => {
  const state = mergerState({ have: 8, survivorBank: 10 });
  const acquiredPrice = priceForFirm(state.firms.BETA);
  const beforeCash = state.players[0].cash;

  const res = applyMergerDecision(state, 0, 4, 3);

  assert.equal(res.ok, true);
  assert.equal(state.players[0].shares.BETA, 1);
  assert.equal(state.players[0].shares.ALPHA, 2);
  assert.equal(state.firms.ALPHA.bankShares, 8);
  assert.equal(state.players[0].cash, beforeCash + (3 * acquiredPrice));
});

test("rejects trade when surviving firm has no bank shares", () => {
  const state = mergerState({ have: 6, survivorBank: 0 });

  const res = applyMergerDecision(state, 0, 2, 0);

  assert.equal(res.ok, false);
  assert.match(res.error ?? "", /No survivor shares available/);
});

test("rejects invalid over-allocation and odd trade amounts", () => {
  const overAlloc = mergerState({ have: 6, survivorBank: 10 });
  const oddTrade = mergerState({ have: 6, survivorBank: 10 });

  const overAllocRes = applyMergerDecision(overAlloc, 0, 4, 3);
  const oddTradeRes = applyMergerDecision(oddTrade, 0, 3, 0);

  assert.equal(overAllocRes.ok, false);
  assert.match(overAllocRes.error ?? "", /Sell exceeds remaining holdings/);

  assert.equal(oddTradeRes.ok, false);
  assert.match(oddTradeRes.error ?? "", /must be even/);
});

test("applies cash/share/bank updates exactly for valid submit", () => {
  const state = mergerState({ have: 10, survivorBank: 3 });
  const acquiredPrice = priceForFirm(state.firms.BETA);
  const beforeCash = state.players[0].cash;

  const res = applyMergerDecision(state, 0, 6, 2);

  assert.equal(res.ok, true);
  assert.equal(state.players[0].shares.BETA, 2);
  assert.equal(state.players[0].shares.ALPHA, 3);
  assert.equal(state.firms.ALPHA.bankShares, 0);
  assert.equal(state.players[0].cash, beforeCash + (2 * acquiredPrice));
});
