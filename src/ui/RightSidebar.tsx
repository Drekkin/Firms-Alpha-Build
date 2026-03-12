import { useEffect, useMemo, useState } from "react";
import { FirmId, GameState } from "../game/types";
import { getMergerAllocationSummary } from "../game/engine";
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

  const mergerActorData = useMemo(() => {
    if (!merger) return null;
    const acq = merger.acquired[merger.acquiredIndex];
    const order = merger.decisionOrderByAcquired[acq] ?? [];
    const actor = order[merger.orderIndex];
    const isHumanTurn = actor === 0;
    return { acq, order, actor, isHumanTurn };
  }, [merger]);

  useEffect(() => {
    setTradeInput(0);
    setSellInput(0);
  }, [merger?.acquiredIndex, merger?.orderIndex]);

  const allocation = useMemo(() => {
    if (!merger || !mergerActorData?.isHumanTurn) return null;
    return getMergerAllocationSummary(state, 0, tradeInput, sellInput);
  }, [state, merger, mergerActorData, tradeInput, sellInput]);

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

      {merger && (
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

          {(() => {
            const acq = mergerActorData?.acq;
            const actor = mergerActorData?.actor;
            const isHumanTurn = mergerActorData?.isHumanTurn;
            if (!acq) return null;

            return (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  Settling <b>{acq}</b> • Next: <b>{actor === undefined ? "—" : (state.players[actor]?.name ?? "—")}</b>
                </div>
                {isHumanTurn && allocation ? (
                  <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                    <label style={{ fontSize: 12, display: "grid", gap: 4 }}>
                      Trade defunct shares (2-for-1)
                      <input
                        type="number"
                        min={0}
                        max={allocation.maxTradeIn}
                        step={2}
                        value={tradeInput}
                        disabled={allocation.tradeDisabled}
                        onChange={(e) => setTradeInput(Math.max(0, Number(e.target.value || 0)))}
                        style={{ background: "#0f1116", color: "#eaeaea", border: "1px solid #2a2d35", borderRadius: 8, padding: "6px 8px" }}
                      />
                    </label>
                    <label style={{ fontSize: 12, display: "grid", gap: 4 }}>
                      Sell defunct shares
                      <input
                        type="number"
                        min={0}
                        max={allocation.have}
                        step={1}
                        value={sellInput}
                        onChange={(e) => setSellInput(Math.max(0, Number(e.target.value || 0)))}
                        style={{ background: "#0f1116", color: "#eaeaea", border: "1px solid #2a2d35", borderRadius: 8, padding: "6px 8px" }}
                      />
                    </label>

                    <div style={{ fontSize: 11, opacity: 0.85, display: "grid", gap: 2 }}>
                      <div>Total owned: <b>{allocation.have}</b></div>
                      <div>Trade allocated: <b>{allocation.ok ? allocation.tradeIn : 0}</b></div>
                      <div>Sell allocated: <b>{allocation.ok ? allocation.sell : 0}</b></div>
                      <div>Keep allocated: <b>{allocation.ok ? allocation.keep : 0}</b></div>
                      <div>Surviving shares received: <b>{allocation.ok ? allocation.tradeOut : 0}</b></div>
                      <div>Cash from sell: <b>${(priceForFirm(state.firms[acq]) * (allocation.ok ? allocation.sell : 0)).toLocaleString()}</b></div>
                    </div>

                    {allocation.tradeDisabled && (
                      <div style={{ fontSize: 11, color: "#ffcb85" }}>Trade unavailable (need 2+ shares and available survivor bank shares).</div>
                    )}
                    {!allocation.ok && (
                      <div style={{ fontSize: 11, color: "#ff8b8b" }}>{allocation.error}</div>
                    )}

                    <button
                      onClick={() => onMergerDecision(tradeInput, sellInput)}
                      disabled={!allocation.ok}
                      style={{ background: allocation.ok ? "#1a1c22" : "#14161c", color: allocation.ok ? "#eaeaea" : "#7b808d", border: "1px solid #2a2d35", borderRadius: 12, padding: "8px 10px" }}
                    >
                      Confirm allocation
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>Waiting for non-human settlement...</div>
                )}
              </div>
            );
          })()}
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
