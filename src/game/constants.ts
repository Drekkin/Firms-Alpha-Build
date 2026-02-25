import { FirmId, Tier, VisibilityConfig } from "./types";

export const BOARD_ROWS = 9;
export const BOARD_COLS = 12;
export const HAND_SIZE = 6;

export const STARTING_CASH = 8_000_000;
export const TIMER_MS = 30_000;
export const BOT_STEP_MS = 1_200;

export const SAFE_SIZE = 14;
export const END_SIZE = 43;

export const FIRM_ORDER: FirmId[] = ["ALPHA","BETA","GAMMA","DELTA","EPSILON","ZETA","SIGMA"];

export const FIRM_TIERS: Record<FirmId, Tier> = {
  ALPHA:"S",
  SIGMA:"S",
  GAMMA:"A",
  DELTA:"A",
  ZETA:"A",
  BETA:"B",
  EPSILON:"B",
};

export const TIER_BASE: Record<Tier, number> = {
  B: 100_000,
  A: 150_000,
  S: 200_000,
};

export const DEFAULT_VISIBILITY: VisibilityConfig = {
  portfolios: "HIDDEN",
  cash: "HIDDEN",
  bankCounts: "HIDDEN",
  bankDepletionAnnounce: true,
  mergerTransparency: "AGGREGATE_ONLY",
  voteTransparency: "RESULT_ONLY",
};
