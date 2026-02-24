import { BOARD_COLS, BOARD_ROWS, DEFAULT_VISIBILITY, END_SIZE, FIRM_ORDER, FIRM_TIERS, HAND_SIZE, SAFE_SIZE, STARTING_CASH, TIMER_MS } from "./constants";
import { cloneBoard, findConnectedUnincorpCluster, findFirmTiles, neighbors4, touchingFirms, touchingUnincorp } from "./board";
import { hashSeed, mulberry32 } from "./rng";
import { majorityBonus, minorityBonus, priceForFirm } from "./pricing";
import { Cell, Firm, FirmId, GameState, MergerCtx, PlacementPreview, Player, VoteCtx, Tile } from "./types";

export function createTiles(): Tile[] {
  const tiles: Tile[] = [];
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      tiles.push({ id: String.fromCharCode(65 + c) + (r + 1), row: r, col: c });
    }
  }
  return tiles;
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function emptyBoard(): Cell[][] {
  return Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, () => ({ occupied: false, firmId: null }))
  );
}

function emptyShares(): Record<FirmId, number> {
  return Object.fromEntries(FIRM_ORDER.map((f) => [f, 0])) as Record<FirmId, number>;
}

export function createInitialState(seed = "alpha"): GameState {
  const rng = mulberry32(hashSeed(seed));
  const tileBag = shuffle(createTiles(), rng);

  const firms = Object.fromEntries(
    FIRM_ORDER.map((id) => [
      id,
      { id, tier: FIRM_TIERS[id], active: false, safe: false, size: 0, bankShares: 25 } satisfies Firm,
    ])
  ) as Record<FirmId, Firm>;

  const players: Player[] = [
    { id: 0, isHuman: true, name: "You", cash: STARTING_CASH, hand: [], shares: emptyShares() },
    { id: 1, isHuman: false, name: "Bot 1", cash: STARTING_CASH, hand: [], shares: emptyShares() },
    { id: 2, isHuman: false, name: "Bot 2", cash: STARTING_CASH, hand: [], shares: emptyShares() },
    { id: 3, isHuman: false, name: "Bot 3", cash: STARTING_CASH, hand: [], shares: emptyShares() },
  ];

  for (const p of players) p.hand = tileBag.splice(0, HAND_SIZE);

  const now = Date.now();
  return {
    board: emptyBoard(),
    firms,
    players,
    tileBag,
    currentPlayer: 0,
    roundNumber: 1,
    visibility: DEFAULT_VISIBILITY,
    ui: {
      phase: "HUMAN_PLACE",
      hoveredTileId: null,
      draggingTileId: null,
      preview: null,
      settingsOpen: false,
      modal: null,
      timer: { active: true, endsAt: now + TIMER_MS, label: "Place Tile", stepKey: "HUMAN_PLACE" },
    },
    log: [
      "Game started (Hidden—Strategic defaults).",
      `Seed: ${seed}`,
      "Note: This is an alpha build (rules implemented; UI still minimal).",
    ],
  };
}

export function computePlacementPreview(state: GameState, tileId: string): PlacementPreview | null {
  const tile = state.players[state.currentPlayer].hand.find((t) => t.id === tileId)
    ?? state.players[0].hand.find((t) => t.id === tileId);
  if (!tile) return null;
  const { row, col } = tile;
  const cell = state.board[row][col];
  if (cell.occupied) return { tileId, row, col, outcome: "ILLEGAL", details: "Cell already occupied", involvedFirms: [], survivorTie: false };

  const firmsTouch = touchingFirms(state, row, col);
  if (firmsTouch.length >= 2) {
    // illegal if any touching firm is safe
    const anySafe = firmsTouch.some((f) => state.firms[f].safe);
    if (anySafe) return { tileId, row, col, outcome: "ILLEGAL", details: "Illegal: would acquire a safe firm", involvedFirms: firmsTouch, survivorTie: false };

    // determine if tie for largest among involved firms
    const sizes = firmsTouch.map((f) => state.firms[f].size);
    const max = Math.max(...sizes);
    const tied = firmsTouch.filter((f) => state.firms[f].size === max);
    const survivorTie = tied.length >= 2;

    return { tileId, row, col, outcome: "MERGE", details: survivorTie ? `Merges (choose survivor): ${tied.join(" / ")}` : `Merges into ${tied[0]}`, involvedFirms: firmsTouch, survivorTie };
  }

  if (firmsTouch.length === 1) {
    return { tileId, row, col, outcome: "GROW", details: `Grows ${firmsTouch[0]}`, involvedFirms: firmsTouch, survivorTie: false };
  }

  if (touchingUnincorp(state, row, col)) {
    const available = FIRM_ORDER.filter((f) => !state.firms[f].active);
    if (available.length > 0) return { tileId, row, col, outcome: "FOUND", details: "Forms new firm", involvedFirms: [], survivorTie: false };
  }

  return { tileId, row, col, outcome: "UNINCORP", details: "Unincorporated", involvedFirms: [], survivorTie: false };
}

function refillHand(state: GameState, playerId: number): void {
  const p = state.players[playerId];
  while (p.hand.length < HAND_SIZE && state.tileBag.length > 0) {
    p.hand.push(state.tileBag.shift()!);
  }
}

function setTimer(state: GameState, label: string, stepKey: string): void {
  state.ui.timer = { active: true, endsAt: Date.now() + TIMER_MS, label, stepKey };
}

function firmRecalc(state: GameState, firmId: FirmId): void {
  const tiles = findFirmTiles(state, firmId);
  const size = tiles.length;
  const firm = state.firms[firmId];
  firm.size = size;
  if (firm.active && !firm.safe && size >= SAFE_SIZE) {
    firm.safe = true;
    state.log.push(`${firmId} is now SAFE (size ${size}).`);
  }
}

function allActiveFirmsSafe(state: GameState): boolean {
  const active = Object.values(state.firms).filter((f) => f.active);
  if (active.length === 0) return false;
  return active.every((f) => f.safe);
}

function checkEnd(state: GameState): void {
  const any43 = Object.values(state.firms).some((f) => f.active && f.size >= END_SIZE);
  if (any43 || allActiveFirmsSafe(state)) {
    state.ui.phase = "ENDGAME";
    setTimer(state, "Endgame", "ENDGAME");
    // finalize cash by liquidating active firms only
    for (const firm of Object.values(state.firms)) {
      if (!firm.active) continue;
      const price = priceForFirm(firm);
      // majority/minority bonuses at end
      const holdings = state.players.map((p) => p.shares[firm.id]);
      const max = Math.max(...holdings);
      const majorityOwners = state.players.filter((p) => p.shares[firm.id] === max && max > 0);
      let minorityOwners: Player[] = [];
      const sortedUnique = Array.from(new Set(holdings.filter((x) => x > 0))).sort((a,b)=>b-a);
      if (sortedUnique.length >= 2) {
        const second = sortedUnique[1];
        minorityOwners = state.players.filter((p) => p.shares[firm.id] === second);
      }
      const maj = majorityBonus(price);
      const min = minorityBonus(price);
      if (majorityOwners.length >= 2) {
        const pot = maj + min;
        const each = Math.floor(pot / majorityOwners.length);
        for (const p of majorityOwners) p.cash += each;
      } else if (majorityOwners.length === 1) {
        majorityOwners[0].cash += maj;
        if (minorityOwners.length >= 1) {
          const each = Math.floor(min / minorityOwners.length);
          for (const p of minorityOwners) p.cash += each;
        }
      }
      // liquidate shares for active firms only
      for (const p of state.players) {
        const qty = p.shares[firm.id];
        if (qty > 0) p.cash += qty * price;
      }
    }
    const standings = state.players
      .map((p) => ({ name: p.name, cash: p.cash }))
      .sort((a,b)=>b.cash-a.cash);
    state.ui.modal = { kind: "ENDGAME", standings };
    state.log.push(`Game ended: ${any43 ? "firm reached 43+" : "all active firms safe"}.`);
  }
}

export function placeTile(state: GameState, playerId: number, tileId: string): { ok: boolean; error?: string } {
  const p = state.players[playerId];
  const tileIdx = p.hand.findIndex((t) => t.id === tileId);
  if (tileIdx < 0) return { ok: false, error: "Tile not in hand." };
  const tile = p.hand[tileIdx];

  const prev = computePlacementPreview(state, tileId);
  if (!prev) return { ok: false, error: "Invalid tile." };
  if (prev.outcome === "ILLEGAL") return { ok: false, error: prev.details };

  // commit placement
  state.board[tile.row][tile.col].occupied = true;

  // Remove from hand now; refill at end of full turn (after buy) per our turn order;
  // but for UI simplicity, we refill after tile placement. This is still consistent if you allow immediate refill.
  p.hand.splice(tileIdx, 1);
  refillHand(state, playerId);

  if (prev.outcome === "UNINCORP") {
    state.board[tile.row][tile.col].firmId = null;
    state.log.push(`${p.name} placed ${tileId}: Unincorporated.`);
    // proceed to vote window
    state.ui.phase = playerId === 0 ? "HUMAN_VOTE" : state.ui.phase;
    if (playerId === 0) setTimer(state, "Vote Window", "HUMAN_VOTE");
    return { ok: true };
  }

  if (prev.outcome === "GROW") {
    const firmId = prev.involvedFirms[0];
    state.board[tile.row][tile.col].firmId = firmId;
    // absorb adjacent unincorporated cluster connected to placement
    // any neighboring unincorp tiles connected through this new tile should become firm tiles
    for (const n of neighbors4(tile.row, tile.col)) {
      const cell = state.board[n.r][n.c];
      if (cell.occupied && cell.firmId === null) {
        // convert entire unincorp cluster touching
        const cluster = findConnectedUnincorpCluster(state, n.r, n.c);
        for (const pos of cluster) state.board[pos.r][pos.c].firmId = firmId;
      }
    }
    firmRecalc(state, firmId);
    state.log.push(`${p.name} placed ${tileId}: Grew ${firmId} (size ${state.firms[firmId].size}).`);
    if (playerId === 0) {
      state.ui.phase = "HUMAN_VOTE";
      setTimer(state, "Vote Window", "HUMAN_VOTE");
    }
    checkEnd(state);
    return { ok: true };
  }

  if (prev.outcome === "FOUND") {
    state.board[tile.row][tile.col].firmId = null;
    const choices = FIRM_ORDER.filter((f) => !state.firms[f].active);
    state.ui.phase = "HUMAN_FOUND_SELECT";
    state.ui.modal = { kind: "FOUND_SELECT", tileId, choices };
    setTimer(state, "Found Firm", "HUMAN_FOUND_SELECT");
    state.log.push(`${p.name} placed ${tileId}: Forms new firm (choose).`);
    return { ok: true };
  }

  if (prev.outcome === "MERGE") {
    // Create merger ctx; survivor may need choice if tie
    const involved = prev.involvedFirms;
    const maxSize = Math.max(...involved.map((f) => state.firms[f].size));
    const tied = involved.filter((f) => state.firms[f].size === maxSize);
    const survivor = tied.length === 1 ? tied[0] : null;
    const survivorChoices = tied;
    // acquired are all involved except survivor (or all except chosen later)
    const acquired = survivor ? involved.filter((f) => f !== survivor) : involved.filter((f) => !tied.includes(f)); // will adjust later

    // Place tile as unincorporated for the moment; it will be converted after merger to survivor firm.
    state.board[tile.row][tile.col].firmId = null;

    const ctx: MergerCtx = {
      initiatorId: playerId,
      survivor,
      survivorChoices,
      acquired: survivor ? involved.filter((f)=>f!==survivor) : involved.filter((f)=>!tied.includes(f)),
      decisionOrderByAcquired: {} as any,
      acquiredIndex: 0,
      orderIndex: 0,
      currentTotals: { tradedIn: 0, tradeOut: 0, sold: 0, held: 0, tradeCapped: false },
      remainingShares: {},
    };

    // Build decision order lists later once survivor known; for now store ctx and open survivor choice if needed
    state.ui.phase = "HUMAN_MERGER";
    if (!ctx.survivor) {
      state.ui.modal = { kind: "SURVIVOR_CHOICE", choices: survivorChoices };
      setTimer(state, "Choose Survivor", "SURVIVOR_CHOICE");
      state.log.push(`${p.name} placed ${tileId}: Merger (choose survivor).`);
    } else {
      // initialize full merger
      initMergerCtx(state, ctx);
      state.ui.modal = { kind: "MERGER", ctx };
      setTimer(state, "Merger", "MERGER");
      state.log.push(`${p.name} placed ${tileId}: Merger into ${ctx.survivor}.`);
    }
    return { ok: true };
  }

  return { ok: false, error: "Unhandled outcome." };
}

export function foundFirm(state: GameState, playerId: number, firmId: FirmId, tileId: string): void {
  const p = state.players[playerId];
  const firm = state.firms[firmId];
  if (firm.active) return;
  // compute cluster: the placed tile is unincorporated and touches at least one unincorp tile; cluster includes it plus connected unincorp
  // ensure placed tile is occupied and unincorp
  const tile = state.players[playerId].hand.find((t)=>t.id===tileId); // may not exist; tile already placed earlier
  const row = parseInt(tileId.slice(1),10)-1;
  const col = tileId.charCodeAt(0)-65;
  const cluster = findConnectedUnincorpCluster(state, row, col);
  // if cluster is empty (edge case), include the placed tile itself
  const cluster2 = cluster.length ? cluster : [{ r: row, c: col }];
  for (const pos of cluster2) {
    state.board[pos.r][pos.c].firmId = firmId;
  }
  firm.active = true;
  firm.safe = false;
  firm.size = cluster2.length;
  if (!firm.safe && firm.size >= SAFE_SIZE) firm.safe = true;

  // founder free share
  if (firm.bankShares > 0) {
    firm.bankShares -= 1;
    p.shares[firmId] += 1;
    if (firm.bankShares === 0) state.log.push(`All public shares of ${firmId} have been purchased.`);
  }

  state.log.push(`${p.name} founded ${firmId} (size ${firm.size}).`);
  state.ui.modal = null;
  state.ui.phase = "HUMAN_VOTE";
  setTimer(state, "Vote Window", "HUMAN_VOTE");
  checkEnd(state);
}

export function canCallVote(state: GameState, playerId: number, firmId: FirmId): boolean {
  const firm = state.firms[firmId];
  if (!firm.active) return false;
  if (firm.safe) return false;
  if (firm.bankShares !== 0) return false;
  return state.players[playerId].shares[firmId] > 0;
}

export function resolveVote(state: GameState, ctx: VoteCtx): void {
  // one vote per shareholder; only shareholders vote
  const firmId = ctx.firmId;
  const shareholders = state.players.filter((p) => p.shares[firmId] > 0);
  // ensure bots vote if missing
  for (const p of shareholders) {
    if (!ctx.votes[p.id]) {
      // simple bot rule: vote YES if p is tied for top holder, else NO
      const holdings = shareholders.map((q) => q.shares[firmId]);
      const max = Math.max(...holdings);
      ctx.votes[p.id] = p.shares[firmId] === max ? "YES" : "NO";
    }
  }
  const yes = shareholders.filter((p) => ctx.votes[p.id] === "YES").length;
  const no = shareholders.filter((p) => ctx.votes[p.id] === "NO").length;
  const passed = yes > no;
  state.log.push(`Vote result for ${firmId}: ${passed ? "PASSED" : "FAILED"} (Yes ${yes} / No ${no}).`);
  if (passed) {
    state.firms[firmId].safe = true;
    state.log.push(`${firmId} is now SAFE (vote).`);
    checkEnd(state);
  }
  state.ui.modal = null;
  startHumanBuy(state);
}

export function buyShares(state: GameState, playerId: number, firmId: FirmId, qty: number): { ok: boolean; error?: string } {
  const p = state.players[playerId];
  const firm = state.firms[firmId];
  const buyModal = state.ui.modal;
  if (!buyModal || buyModal.kind !== "BUY") return { ok: false, error: "Not in buy phase." };

  const nextQty = Math.max(0, qty);
  if (!firm.active) return { ok: false, error: "Firm inactive." };
  if (priceForFirm(firm) <= 0) return { ok: false, error: "Firm not purchasable." };
  if (nextQty > firm.bankShares) return { ok: false, error: "No shares available." };

  const nextSelections = { ...buyModal.selections, [firmId]: nextQty };
  const totalSelected = Object.values(nextSelections).reduce((sum, count) => sum + count, 0);
  if (totalSelected > 3) return { ok: false, error: "Exceeds remaining buys." };

  const totalCost = Object.entries(nextSelections).reduce((sum, [id, count]) => {
    if (count <= 0) return sum;
    const pricedFirm = state.firms[id as FirmId];
    return sum + priceForFirm(pricedFirm) * count;
  }, 0);
  if (totalCost > p.cash) return { ok: false, error: "Insufficient cash." };

  state.ui.modal = { kind: "BUY", selections: nextSelections };
  return { ok: true };
}

export function confirmBuySelection(state: GameState, playerId: number): { ok: boolean; error?: string } {
  const p = state.players[playerId];
  const modal = state.ui.modal;
  if (!modal || modal.kind !== "BUY") return { ok: false, error: "Not in buy phase." };

  const entries = Object.entries(modal.selections) as [FirmId, number][];
  const totalSelected = entries.reduce((sum, [, count]) => sum + count, 0);
  if (totalSelected === 0) {
    endBuyPhase(state);
    return { ok: true };
  }

  let totalCost = 0;
  for (const [firmId, qty] of entries) {
    if (qty <= 0) continue;
    const firm = state.firms[firmId];
    if (!firm.active) return { ok: false, error: `${firmId} is inactive.` };
    if (firm.bankShares < qty) return { ok: false, error: `${firmId} sold out.` };
    const price = priceForFirm(firm);
    if (price <= 0) return { ok: false, error: `${firmId} is not purchasable.` };
    totalCost += price * qty;
  }

  if (totalCost > p.cash) return { ok: false, error: "Insufficient cash." };

  for (const [firmId, qty] of entries) {
    if (qty <= 0) continue;
    const firm = state.firms[firmId];
    const price = priceForFirm(firm);
    firm.bankShares -= qty;
    p.shares[firmId] += qty;
    p.cash -= qty * price;
    state.log.push(`${p.name} bought ${qty} share(s) of ${firmId}.`);
    if (firm.bankShares === 0) state.log.push(`All public shares of ${firmId} have been purchased.`);
  }

  endBuyPhase(state);
  return { ok: true };
}

export function endBuyPhase(state: GameState): void {
  state.ui.modal = null;
  // end turn
  advanceTurn(state);
}

function advanceTurn(state: GameState): void {
  // after human, run 3 bots then return to human
  if (state.currentPlayer === 0) {
    state.ui.phase = "BOT_TURN";
    setTimer(state, "Bots", "BOT_TURN");
  } else {
    state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
  }
}

export function runBots(state: GameState): void {
  // simple bots: place first legal non-illegal tile (allow merges), choose random founded firm if needed, buy 0-3 random affordable, call vote if beneficial.
  const order = [1,2,3];
  for (const pid of order) {
    state.currentPlayer = pid;
    // place tile
    let placed = false;
    for (const t of state.players[pid].hand) {
      const prev = computePlacementPreview(state, t.id);
      if (!prev || prev.outcome === "ILLEGAL") continue;
      // bots can merge; if merge requires survivor choice, pick first choice
      const res = placeTile(state, pid, t.id);
      if (!res.ok) continue;
      placed = true;

      // handle founding choice if opened (bots auto choose lowest tier)
      if (state.ui.modal?.kind === "FOUND_SELECT") {
        const choices = state.ui.modal.choices;
        const pick = choices.sort((a,b)=>state.firms[a].tier.localeCompare(state.firms[b].tier))[0];
        foundFirm(state, pid, pick, state.ui.modal.tileId);
      }
      // handle survivor choice
      if (state.ui.modal?.kind === "SURVIVOR_CHOICE") {
        chooseSurvivor(state, pid, state.ui.modal.choices[0]);
      }
      // handle merger modal fully (bots auto decide: hold all by default; trade/sell 0)
      if (state.ui.modal?.kind === "MERGER") {
        autoResolveMerger(state);
      }

      // vote window: bot may call vote if it is top holder
      for (const firmId of FIRM_ORDER) {
        if (canCallVote(state, pid, firmId)) {
          const max = Math.max(...state.players.map((p)=>p.shares[firmId]));
          if (state.players[pid].shares[firmId] === max) {
            const vctx: VoteCtx = { firmId, callerId: pid, votes: {} };
            // bot votes YES; others auto computed in resolveVote
            vctx.votes[pid] = "YES";
            resolveVote(state, vctx);
            break;
          }
        }
      }

      // buy shares: buy up to 3 random active firms with shares; keep simple
      let remaining = 3;
      while (remaining > 0) {
        const active = Object.values(state.firms).filter((f)=>f.active && f.bankShares>0 && priceForFirm(f)>0);
        if (active.length === 0) break;
        active.sort((a,b)=>priceForFirm(a)-priceForFirm(b));
        const choice = active[0];
        const price = priceForFirm(choice);
        if (state.players[pid].cash < price) break;
        const qty = 1;
        choice.bankShares -= qty;
        state.players[pid].shares[choice.id] += qty;
        state.players[pid].cash -= qty*price;
        remaining -= qty;
        if (choice.bankShares === 0) state.log.push(`All public shares of ${choice.id} have been purchased.`);
      }

      state.log.push(`${state.players[pid].name} ended turn.`);
      break;
    }
    if (!placed) {
      state.log.push(`${state.players[pid].name} had no legal tile.`);
    }
  }
  // back to human
  state.currentPlayer = 0;
  state.roundNumber += 1;
  state.ui.phase = "HUMAN_PLACE";
  state.ui.modal = null;
  setTimer(state, "Place Tile", "HUMAN_PLACE");
  checkEnd(state);
}

export function chooseSurvivor(state: GameState, playerId: number, survivor: FirmId): void {
  const modal = state.ui.modal;
  if (!modal || modal.kind !== "SURVIVOR_CHOICE") return;
  if (!modal.choices.includes(survivor)) return;

  // we must reconstruct merger context based on last placement preview; store temporary: find the most recent MERGE preview in log? Not robust.
  // Instead, we keep it simple: modal choices are tied set; survivor is chosen; the acquired are all adjacent firms other than survivor to the placement tile.
  // Find the last placed tile by initiator: we do not store it; for alpha, assume the merge was triggered at a location where the placed tile is unincorp and touches firms.
  // We'll scan for any unincorp occupied tile that touches >=2 firms and use the most recent (rough but workable in alpha).
  let trigger: { r: number; c: number } | null = null;
  for (let r=0;r<BOARD_ROWS;r++){
    for (let c=0;c<BOARD_COLS;c++){
      const cell = state.board[r][c];
      if (!cell.occupied) continue;
      if (cell.firmId !== null) continue;
      const tf = touchingFirms(state, r, c);
      if (tf.length>=2) trigger = { r, c };
    }
  }
  if (!trigger) {
    state.log.push("Error: could not locate merger trigger tile.");
    state.ui.modal = null;
    state.ui.phase = "HUMAN_VOTE";
    setTimer(state, "Vote Window", "HUMAN_VOTE");
    return;
  }
  const involved = touchingFirms(state, trigger.r, trigger.c);
  const acquired = involved.filter((f)=>f!==survivor);
  const ctx: MergerCtx = {
    initiatorId: playerId,
    survivor,
    survivorChoices: modal.choices,
    acquired,
    decisionOrderByAcquired: {} as any,
    acquiredIndex: 0,
    orderIndex: 0,
    currentTotals: { tradedIn: 0, tradeOut: 0, sold: 0, held: 0, tradeCapped: false },
    remainingShares: {},
  };
  initMergerCtx(state, ctx);
  state.ui.modal = { kind: "MERGER", ctx };
  setTimer(state, "Merger", "MERGER");
  state.log.push(`Survivor chosen: ${survivor}.`);
}

function playOrderFrom(state: GameState, startPlayerId: number): number[] {
  const ids = state.players.map((p) => p.id);
  const idx = ids.indexOf(startPlayerId);
  return ids.slice(idx).concat(ids.slice(0, idx));
}

export function initMergerCtx(state: GameState, ctx: MergerCtx): void {
  // build decision order for each acquired firm: majority->smallest; ties by play order (initiator clockwise)
  const tieOrder = playOrderFrom(state, ctx.initiatorId);

  for (const acq of ctx.acquired) {
    const holders = state.players.filter((p) => p.shares[acq] > 0);
    holders.sort((a, b) => {
      const da = b.shares[acq] - a.shares[acq];
      if (da !== 0) return da;
      return tieOrder.indexOf(a.id) - tieOrder.indexOf(b.id);
    });
    ctx.decisionOrderByAcquired[acq] = holders.map((p) => p.id);
  }
  ctx.acquiredIndex = 0;
  ctx.orderIndex = 0;
  ctx.currentTotals = { tradedIn: 0, tradeOut: 0, sold: 0, held: 0, tradeCapped: false };
  ctx.remainingShares = {};
  // initialize remainingShares for first acquired firm
  const acq0 = ctx.acquired[0];
  for (const p of state.players) ctx.remainingShares[p.id] = p.shares[acq0];
  // pay bonuses upfront for each acquired firm before decisions, as per our spec
  for (const acq of ctx.acquired) payAcquisitionBonuses(state, acq);
}

function payAcquisitionBonuses(state: GameState, acquiredFirmId: FirmId): void {
  const firm = state.firms[acquiredFirmId];
  const price = priceForFirm(firm);
  const holders = state.players.filter((p) => p.shares[acquiredFirmId] > 0);
  if (holders.length === 0 || price === 0) return;

  const max = Math.max(...holders.map((p) => p.shares[acquiredFirmId]));
  const majority = holders.filter((p) => p.shares[acquiredFirmId] === max);
  const uniq = Array.from(new Set(holders.map((p) => p.shares[acquiredFirmId]))).sort((a,b)=>b-a);
  const second = uniq.length >= 2 ? uniq[1] : 0;
  const minority = second > 0 ? holders.filter((p)=>p.shares[acquiredFirmId]===second) : [];

  const maj = majorityBonus(price);
  const min = minorityBonus(price);

  if (majority.length >= 2) {
    const pot = maj + min;
    const each = Math.floor(pot / majority.length);
    for (const p of majority) p.cash += each;
    state.log.push(`Merger bonus (${acquiredFirmId}): tie-majority split $${pot.toLocaleString()}.`);
  } else {
    majority[0].cash += maj;
    state.log.push(`Merger bonus (${acquiredFirmId}): majority paid $${maj.toLocaleString()}.`);
    if (minority.length >= 1) {
      const each = Math.floor(min / minority.length);
      for (const p of minority) p.cash += each;
      state.log.push(`Merger bonus (${acquiredFirmId}): minority paid $${min.toLocaleString()} split.`);
    }
  }
}

export function applyMergerDecision(
  state: GameState,
  playerId: number,
  trade: number,
  sell: number
): { ok: boolean; error?: string } {
  const modal = state.ui.modal;
  if (!modal || modal.kind !== "MERGER") return { ok: false, error: "No active merger." };
  const ctx = modal.ctx;
  const survivor = ctx.survivor!;
  const acquiredFirmId = ctx.acquired[ctx.acquiredIndex];

  const order = ctx.decisionOrderByAcquired[acquiredFirmId] ?? [];
  const currentActor = order[ctx.orderIndex];
  if (currentActor !== playerId) return { ok: false, error: "Not your turn to decide." };

  const p = state.players[playerId];
  const firm = state.firms[acquiredFirmId];
  const survFirm = state.firms[survivor];
  const have = p.shares[acquiredFirmId];

  if (trade < 0 || sell < 0) return { ok: false, error: "Negative values." };
  if (trade + sell > have) return { ok: false, error: "Exceeds holdings." };

  // trade is number of acquired shares to trade in (must be even count in effect; we allow any and floor)
  const tradeIn = trade;
  const tradeOutWanted = Math.floor(tradeIn / 2);

  const tradeOut = Math.min(tradeOutWanted, survFirm.bankShares);
  if (tradeOut < tradeOutWanted) ctx.currentTotals.tradeCapped = true;

  // consume shares
  const consumedTradeIn = tradeOut * 2;
  const remainingAfterTrade = have - consumedTradeIn;

  const sellActual = Math.min(sell, remainingAfterTrade);
  const held = have - consumedTradeIn - sellActual;

  // apply holdings changes
  p.shares[acquiredFirmId] -= (consumedTradeIn + sellActual);
  p.shares[survivor] += tradeOut;
  survFirm.bankShares -= tradeOut;

  // selling yields cash at acquired firm's current price
  const price = priceForFirm(firm);
  p.cash += sellActual * price;

  ctx.currentTotals.tradedIn += consumedTradeIn;
  ctx.currentTotals.tradeOut += tradeOut;
  ctx.currentTotals.sold += sellActual;
  ctx.currentTotals.held += held;

  // advance to next actor
  ctx.orderIndex += 1;
  if (ctx.orderIndex >= order.length) {
    // settlement summary log (aggregate-only in hidden preset)
    state.log.push(
      `Merger settlement (${acquiredFirmId} → ${survivor}): Traded ${ctx.currentTotals.tradedIn} → ${ctx.currentTotals.tradeOut}, Sold ${ctx.currentTotals.sold}, Held ${ctx.currentTotals.held}.`
    );
    if (survFirm.bankShares === 0) state.log.push(`All public shares of ${survivor} have been purchased.`);
    // move to next acquired firm
    ctx.acquiredIndex += 1;
    ctx.orderIndex = 0;
    ctx.currentTotals = { tradedIn: 0, tradeOut: 0, sold: 0, held: 0, tradeCapped: false };
    if (ctx.acquiredIndex >= ctx.acquired.length) {
      // finalize: convert all acquired tiles + trigger tile into survivor; deactivate acquired firms; set sizes
      finalizeMerger(state, ctx);
      state.ui.modal = null;
      state.ui.phase = ctx.initiatorId === 0 ? "HUMAN_VOTE" : state.ui.phase;
      if (ctx.initiatorId === 0) setTimer(state, "Vote Window", "HUMAN_VOTE");
      checkEnd(state);
      return { ok: true };
    } else {
      // set remainingShares for next acquired firm (not used in UI yet)
      const nextAcq = ctx.acquired[ctx.acquiredIndex];
      for (const p2 of state.players) ctx.remainingShares[p2.id] = p2.shares[nextAcq];
    }
  }

  setTimer(state, "Merger", "MERGER");
  return { ok: true };
}

function finalizeMerger(state: GameState, ctx: MergerCtx): void {
  const survivor = ctx.survivor!;
  // find trigger tile: unincorp occupied tile touching >=2 firms including survivor
  let trigger: { r: number; c: number } | null = null;
  for (let r=0;r<BOARD_ROWS;r++){
    for (let c=0;c<BOARD_COLS;c++){
      const cell = state.board[r][c];
      if (!cell.occupied) continue;
      if (cell.firmId !== null) continue;
      const tf = touchingFirms(state, r, c);
      if (tf.includes(survivor) && tf.some((f)=>ctx.acquired.includes(f))) trigger = { r, c };
    }
  }
  if (trigger) state.board[trigger.r][trigger.c].firmId = survivor;

  for (const acq of ctx.acquired) {
    // convert tiles
    for (const pos of findFirmTiles(state, acq)) state.board[pos.r][pos.c].firmId = survivor;
    // deactivate firm
    state.firms[acq].active = false;
    state.firms[acq].safe = false;
    state.firms[acq].size = 0;
  }
  // recalc survivor size & safe
  state.firms[survivor].active = true;
  firmRecalc(state, survivor);
  state.log.push(`${survivor} now size ${state.firms[survivor].size}.`);
}

export function autoResolveMerger(state: GameState): void {
  const modal = state.ui.modal;
  if (!modal || modal.kind !== "MERGER") return;
  const ctx = modal.ctx;
  // For each acquired firm, for each player in order: default hold all (trade=0,sell=0)
  while (state.ui.modal && state.ui.modal.kind === "MERGER") {
    const acq = ctx.acquired[ctx.acquiredIndex];
    const order = ctx.decisionOrderByAcquired[acq] ?? [];
    if (order.length === 0) {
      ctx.acquiredIndex += 1;
      if (ctx.acquiredIndex >= ctx.acquired.length) {
        finalizeMerger(state, ctx);
        state.ui.modal = null;
        return;
      }
      continue;
    }
    const actor = order[ctx.orderIndex];
    applyMergerDecision(state, actor, 0, 0);
  }
}

export function startHumanVoteWindow(state: GameState): void {
  state.ui.phase = "HUMAN_VOTE";
  state.ui.modal = null;
  setTimer(state, "Vote Window", "HUMAN_VOTE");
}

export function startHumanBuy(state: GameState): void {
  state.ui.phase = "HUMAN_BUY";
  const purchasable = Object.values(state.firms).filter((firm) => firm.active && firm.bankShares > 0 && priceForFirm(firm) > 0);
  if (purchasable.length === 0) {
    state.log.push("No available shares.");
    endBuyPhase(state);
    return;
  }

  const minPrice = Math.min(...purchasable.map((firm) => priceForFirm(firm)));
  if (state.players[0].cash < minPrice) {
    state.log.push("Insufficient funds for purchase.");
    endBuyPhase(state);
    return;
  }

  state.ui.modal = { kind: "BUY", selections: emptyShares() };
  setTimer(state, "Buy Shares", "HUMAN_BUY");
}

export function startHumanTurn(state: GameState): void {
  state.currentPlayer = 0;
  state.ui.phase = "HUMAN_PLACE";
  state.ui.modal = null;
  setTimer(state, "Place Tile", "HUMAN_PLACE");
}

export function handleTimeout(state: GameState): void {
  const phase = state.ui.phase;
  const step = state.ui.timer.stepKey;

  if (phase === "HUMAN_PLACE") {
    // auto-place first legal tile; prefer non-merge
    const hand = state.players[0].hand;
    let candidate: Tile | null = null;
    for (const t of hand) {
      const prev = computePlacementPreview(state, t.id);
      if (!prev || prev.outcome === "ILLEGAL") continue;
      if (prev.outcome === "MERGE") continue;
      candidate = t; break;
    }
    if (!candidate) {
      for (const t of hand) {
        const prev = computePlacementPreview(state, t.id);
        if (!prev || prev.outcome === "ILLEGAL") continue;
        candidate = t; break;
      }
    }
    if (candidate) {
      placeTile(state, 0, candidate.id);
      state.log.push("Timer expired — auto tile placed.");
    } else {
      state.log.push("Timer expired — no legal tile available.");
    }
    return;
  }

  if (phase === "HUMAN_FOUND_SELECT" && state.ui.modal?.kind === "FOUND_SELECT") {
    const choices = state.ui.modal.choices.slice();
    const tierRank: Record<string, number> = { B: 0, A: 1, S: 2 };
    choices.sort((a,b)=> tierRank[state.firms[a].tier]-tierRank[state.firms[b].tier]);
    foundFirm(state, 0, choices[0], state.ui.modal.tileId);
    state.log.push("Timer expired — auto firm selected.");
    return;
  }

  if (phase === "HUMAN_MERGER") {
    if (state.ui.modal?.kind === "SURVIVOR_CHOICE") {
      chooseSurvivor(state, 0, state.ui.modal.choices[0]);
      state.log.push("Timer expired — auto survivor selected.");
      return;
    }
    if (state.ui.modal?.kind === "MERGER") {
      // default hold all shares for human decision: trade=0,sell=0
      const ctx = state.ui.modal.ctx;
      const acq = ctx.acquired[ctx.acquiredIndex];
      const order = ctx.decisionOrderByAcquired[acq] ?? [];
      const actor = order[ctx.orderIndex];
      if (actor === 0) {
        applyMergerDecision(state, 0, 0, 0);
        state.log.push("Timer expired — defaulted to HOLD all.");
      } else {
        // if it's a bot actor, just auto apply hold
        applyMergerDecision(state, actor, 0, 0);
      }
      return;
    }
  }

  if (phase === "HUMAN_VOTE") {
    // skip vote, move to buy
    startHumanBuy(state);
    state.log.push("Timer expired — skipped vote window.");
    return;
  }

  if (phase === "HUMAN_BUY") {
    const selected = state.ui.modal?.kind === "BUY"
      ? Object.values(state.ui.modal.selections).reduce((sum, count) => sum + count, 0)
      : 0;
    const res = confirmBuySelection(state, 0);
    if (!res.ok) {
      state.log.push(`Buy confirm failed: ${res.error}`);
      return;
    }
    state.log.push(selected > 0 ? "Timer expired — auto-confirmed selected shares." : "Timer expired — auto-confirmed no share purchase.");
    return;
  }

  if (phase === "BOT_TURN") {
    runBots(state);
    return;
  }
}
