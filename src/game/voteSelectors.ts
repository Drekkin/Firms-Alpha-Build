import { FirmId, GameState } from "./types";
import { FIRM_ORDER } from "./constants";

export function isFirmVoteCallableByPlayer(state: GameState, playerId: number, firmId: FirmId): boolean {
  const firm = state.firms[firmId];
  return firm.active && !firm.safe && firm.bankShares === 0 && state.players[playerId].shares[firmId] > 0;
}

export function getVoteCallableFirmIds(state: GameState, playerId: number): FirmId[] {
  return FIRM_ORDER.filter((firmId) => isFirmVoteCallableByPlayer(state, playerId, firmId));
}

export function isAnyVotePossible(state: GameState, playerId: number): boolean {
  return getVoteCallableFirmIds(state, playerId).length > 0;
}
