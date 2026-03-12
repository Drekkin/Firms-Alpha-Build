import { useEffect, useMemo, useState } from "react";
import { FirmId, GameState } from "../game/types";
import { priceForFirm } from "../game/pricing";
import { getVoteCallableFirmIds } from "../game/voteSelectors";
import TransparencyToggle from "./TransparencyToggle";

function firmLabel(id: FirmId) {
  return id[0] + id.slice(1).toLowerCase();
}

export default function RightSidebar({
  state,
  onCallVote,
  onMergerDecision,
}: {
  state: GameState;
  onCallVote: (firmId: FirmId) => void;
  onMergerDecision: (trade: number, sell: number) => void;
}) {
  const [isMergerTransparent, setIsMergerTransparent] = useState(false);
  const [tradeInput, setTradeInput] = useState(0);
  const [sellInput, setSellInput] = useState(0);
  const visibility = state.visibility;
  const merger = state.ui.modal?.kind === "MERGER" ? state.ui.modal.ctx : null;
  const callableVotes = new Set(getVoteCallableFirmIds(state, 0));

  const mergerDraft = useMemo(() => {
    if (!merger || !merger.survivor) return null;
    const acq = merger.acquired[merger.acquiredIndex];
    const order = merger.decisionOrderByAcquired[acq] ?? [];
    const actor = order[merger.orderIndex];
    const isHumanTurn = actor === 0;
    const have = state.players[0].shares[acq] ?? 0;
    const survivorBank = state.firms[merger.survivor].bankShares;
    const acquiredPrice = priceForFirm(state.firms[acq]);

    const maxTradeByHoldings = have - (have % 2);
    const maxTradeByBank = survivorBank * 2;
    const maxTrade = Math.min(maxTradeByHoldings, maxTradeByBank);
    const tradePossible = have >= 2 && survivorBank > 0;

    const trade = Number.isFinite(tradeInput) ? Math.max(0, Math.floor(tradeInput)) : 0;
    const sell = Number.isFinite(sellInput) ? Math.max(0, Math.floor(sellInput)) : 0;

    const tradeValid = trade <= maxTrade && trade % 2 === 0;
    const sellMax = have - (tradeValid ? trade : 0);
    const sellValid = tradeValid && sell <= sellMax;
    const keep = have - (tradeValid ? trade : 0) - (sellValid ? sell : 0);
    const allocationValid = tradeValid && sellValid && keep >= 0;

    return {
      acq,
      actor,
      isHumanTurn,
      have,
      trade,
      sell,
      keep,
      acquiredPrice,
      survivorBank,
      tradePossible,
      maxTrade,
      sellMax,
      tradeValid,
      sellValid,
      allocationValid,
      tradeOut: trade / 2,
      sellCash: sell * acquiredPrice,
    };
  }, [merger, state, sellInput, tradeInput]);

  useEffect(() => {
    if (!mergerDraft?.isHumanTurn) {
      setTradeInput(0);
      setSellInput(0);
      return;
    }
    setTradeInput((curr) => Math.min(curr, mergerDraft.maxTrade));
    setSellInput((curr) => Math.min(curr, mergerDraft.have));
  }, [mergerDraft?.acq, mergerDraft?.isHumanTurn, mergerDraft?.maxTrade, mergerDraft?.have]);

  return (
    <div style={{ width: 320, borderLeft: "1px solid #24262c", padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.8 }}>Firms</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10 }}>
        {Object.values(state.firms).map((f) => {
          const price = priceForFirm(f);
          const bankKnown = visibility.bankCounts === "PUBLIC";
          const bankText = bankKnown ? String(f.bankShares) : (f.bankShares === 0 ? "0" : "?");

          return (
            <div key={f.id} style={{ textAlign: "center" }}>
              <div
                title={`${firmLabel(f.id)} • Tier ${f.tier} • ${f.active ? `Size ${f.size}` : "Inactive"} • ${f.safe ? "Safe" : "Not safe"} • Price ${price ? `$${price.toLocaleString()}` : "—"} • Bank ${bankText}`}
                style={{
                  height: 38,
                  borderRadius: 12,
                  border: "1px solid #2a2d35",
                  background: f.active ? "#2b2f3b" : "#12141a",
                  opacity: f.active ? 1 : 0.45,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 900,
                  position: "relative",
                  cursor: "default",
                }}
              >
                {f.id.slice(0, 2)}
                {f.safe && (
                  <span style={{ position: "absolute", right: -6, top: -6, background: "#3b7cff", color: "#0e0f12", borderRadius: 10, padding: "1px 5px", fontSize: 10 }}>
                    S
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, opacity: 0.75, marginTop: 4 }}>
                {f.active ? `Sz ${f.size}` : "—"} • {price ? `$${Math.round(price / 1000)}k` : "—"}
              </div>

              {state.ui.phase === "HUMAN_VOTE" && callableVotes.has(f.id) && (
                <button
                  onClick={() => onCallVote(f.id)}
                  style={{ marginTop: 6, width: "100%", background: "#1a1c22", color: "#eaeaea", border: "1px solid #2a2d35", borderRadius: 10, padding: "6px 8px", fontSize: 11 }}
                >
                  Call Vote
                </button>
              )}
            </div>
          );
        })}
      </div>

      {merger && mergerDraft && (
        <div style={{ border: "1px solid #2a2d35", borderRadius: 14, background: "#12141a", padding: 10, opacity: isMergerTransparent ? 0.42 : 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Merger</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isMergerTransparent && <div style={{ fontSize: 10, opacity: 0.85 }}>Transparent mode</div>}
              <TransparencyToggle isTransparent={isMergerTransparent} onToggle={() => setIsMergerTransparent((v) => !v)} />
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 900 }}>Survivor: {merger.survivor ?? "?"}</div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>Acquired: {merger.acquired.join(", ")}</div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              Settling <b>{mergerDraft.acq}</b> • Next: <b>{state.players[mergerDraft.actor]?.name ?? "—"}</b>
            </div>
            {mergerDraft.isHumanTurn ? (
              <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                <div style={{ fontSize: 12, opacity: 0.9 }}>Owned: <b>{mergerDraft.have}</b></div>
                <label style={{ fontSize: 12, display: "grid", gap: 4 }}>
                  Trade (defunct shares, even)
                  <input
                    type="number"
                    min={0}
                    step={2}
                    value={mergerDraft.trade}
                    disabled={!mergerDraft.tradePossible}
                    onChange={(e) => setTradeInput(Number(e.target.value || 0))}
                    style={{ background: "#1a1c22", color: "#eaeaea", border: "1px solid #2a2d35", borderRadius: 8, padding: "6px 8px" }}
                  />
                </label>
                {!mergerDraft.tradePossible && (
                  <div style={{ fontSize: 11, opacity: 0.75 }}>Trade unavailable: need at least 2 defunct shares and survivor bank shares &gt; 0.</div>
                )}

                <label style={{ fontSize: 12, display: "grid", gap: 4 }}>
                  Sell (defunct shares)
                  <input
                    type="number"
                    min={0}
                    step={1}
                    max={Math.max(0, mergerDraft.sellMax)}
                    value={mergerDraft.sell}
                    onChange={(e) => setSellInput(Number(e.target.value || 0))}
                    style={{ background: "#1a1c22", color: "#eaeaea", border: "1px solid #2a2d35", borderRadius: 8, padding: "6px 8px" }}
                  />
                </label>

                <div style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.5 }}>
                  Trade allocated: <b>{mergerDraft.trade}</b> → receive <b>{mergerDraft.tradeOut}</b> survivor shares<br />
                  Sell allocated: <b>{mergerDraft.sell}</b> → receive <b>${mergerDraft.sellCash.toLocaleString()}</b><br />
                  Keep allocated: <b>{mergerDraft.keep}</b>
                </div>

                <button
                  onClick={() => onMergerDecision(mergerDraft.trade, mergerDraft.sell)}
                  disabled={!mergerDraft.allocationValid}
                  style={{
                    background: mergerDraft.allocationValid ? "#2b5fff" : "#1a1c22",
                    color: "#eaeaea",
                    border: "1px solid #2a2d35",
                    borderRadius: 12,
                    padding: "8px 10px",
                    cursor: mergerDraft.allocationValid ? "pointer" : "not-allowed",
                    opacity: mergerDraft.allocationValid ? 1 : 0.6,
                  }}
                >
                  Confirm merger allocation
                </button>
                {!mergerDraft.tradeValid && <div style={{ fontSize: 11, color: "#ff8787" }}>Trade must be even and within holdings/bank limits.</div>}
                {!mergerDraft.sellValid && <div style={{ fontSize: 11, color: "#ff8787" }}>Sell cannot exceed remaining unallocated shares.</div>}
              </div>
            ) : (
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>Waiting for non-human settlement...</div>
            )}
          </div>
        </div>
      )}

      <div style={{ flex: 1 }} />

      <div style={{ fontSize: 12, opacity: 0.8 }}>Log</div>
      <div style={{ border: "1px solid #2a2d35", borderRadius: 14, background: "#12141a", padding: 10, height: 250, overflow: "auto" }}>
        {state.log.slice().reverse().map((line, idx) => (
          <div key={idx} style={{ fontSize: 12, lineHeight: 1.4, opacity: 0.9, marginBottom: 6 }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
