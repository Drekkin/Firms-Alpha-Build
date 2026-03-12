import test from "node:test";
import assert from "node:assert/strict";

import { applyMergerDecision, createInitialState, getMergerAllocationSummary } from "../src/game/engine.ts";
import { priceForFirm } from "../src/game/pricing.ts";
import { MergerCtx } from "../src/game/types.ts";

function setupSingleActorMerger(opts?: { defunctShares?: number; survivorBankShares?: number }) {
  const state = createInitialState("merger-allocation");
  const defunctShares = opts?.defunctShares ?? 7;
  const survivorBankShares = opts?.survivorBankShares ?? 10;

  state.players[0].shares.BETA = defunctShares;
  state.players[0].shares.ALPHA = 1;

  state.firms.ALPHA.active = true;
  state.firms.ALPHA.size = 5;
  state.firms.ALPHA.bankShares = survivorBankShares;

  state.firms.BETA.active = true;
  state.firms.BETA.size = 4;

  const ctx: MergerCtx = {
    initiatorId: 0,
    triggerTile: { row: 0, col: 0 },
    survivor: "ALPHA",
    survivorChoices: [],
    acquired: ["BETA"],
    decisionOrderByAcquired: { ALPHA: [], BETA: [0], GAMMA: [], DELTA: [], EPSILON: [], ZETA: [], SIGMA: [] },
    acquiredIndex: 0,
    orderIndex: 0,
    currentTotals: { tradedIn: 0, tradeOut: 0, sold: 0, held: 0, tradeCapped: false },
    remainingShares: { 0: defunctShares, 1: 0, 2: 0, 3: 0 },
  };

  state.ui.modal = { kind: "MERGER", ctx };
  state.ui.phase = "HUMAN_MERGER";

  return state;
}

test("merger supports mixed trade/sell/keep in one decision", () => {
  const state = setupSingleActorMerger({ defunctShares: 7, survivorBankShares: 3 });
  const acquiredPrice = priceForFirm(state.firms.BETA);
  const startCash = state.players[0].cash;

  const res = applyMergerDecision(state, 0, 4, 2);
  assert.equal(res.ok, true);

  assert.equal(state.players[0].shares.BETA, 1, "one defunct share should be kept");
  assert.equal(state.players[0].shares.ALPHA, 3, "should receive 2 surviving shares from trade");
  assert.equal(state.firms.ALPHA.bankShares, 1);
  assert.equal(state.players[0].cash, startCash + acquiredPrice * 2);
});

test("trade is disabled and rejected when survivor bank has no shares", () => {
  const state = setupSingleActorMerger({ defunctShares: 6, survivorBankShares: 0 });

  const summary = getMergerAllocationSummary(state, 0, 0, 0);
  assert.equal(summary.tradeDisabled, true);

  const res = applyMergerDecision(state, 0, 2, 0);
  assert.equal(res.ok, false);
  assert.match(String(res.error), /Trade exceeds available shares/);
});

test("invalid over-allocation is rejected", () => {
  const state = setupSingleActorMerger({ defunctShares: 5, survivorBankShares: 10 });
  const before = structuredClone(state.players[0]);

  const res = applyMergerDecision(state, 0, 4, 2);
  assert.equal(res.ok, false);
  assert.match(String(res.error), /Sell exceeds remaining shares/);
  assert.deepEqual(state.players[0], before);
});

test("allocation summary computes derived keep/tradeOut/cash basis", () => {
  const state = setupSingleActorMerger({ defunctShares: 8, survivorBankShares: 4 });

  const summary = getMergerAllocationSummary(state, 0, 6, 1);
  assert.equal(summary.ok, true);
  assert.equal(summary.tradeOut, 3);
  assert.equal(summary.keep, 1);
  assert.equal(summary.sell, 1);
});
