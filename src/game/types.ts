export type FirmId =
  | "ALPHA"
  | "BETA"
  | "GAMMA"
  | "DELTA"
  | "EPSILON"
  | "ZETA"
  | "SIGMA";

export type Tier = "B" | "A" | "S";

export type Phase =
  | "HUMAN_PLACE"
  | "HUMAN_FOUND_SELECT"
  | "HUMAN_MERGER"
  | "HUMAN_VOTE"
  | "HUMAN_BUY"
  | "BOT_TURN"
  | "ENDGAME";

export interface Tile {
  id: string; // A1-L9
  row: number; // 0-8
  col: number; // 0-11
}

export interface Cell {
  occupied: boolean;
  firmId: FirmId | null; // null = unincorporated when occupied; ignored if unoccupied
}

export interface Firm {
  id: FirmId;
  tier: Tier;
  active: boolean;
  safe: boolean;
  size: number;
  bankShares: number; // conserved total 25: bank + playerHeld
}

export interface Player {
  id: number;
  isHuman: boolean;
  name: string;
  cash: number;
  hand: Tile[];
  shares: Record<FirmId, number>;
}

export interface VisibilityConfig {
  portfolios: "OPEN" | "HIDDEN";
  cash: "PUBLIC" | "HIDDEN";
  bankCounts: "PUBLIC" | "HIDDEN";
  bankDepletionAnnounce: true;
  mergerTransparency: "AGGREGATE_ONLY";
  voteTransparency: "RESULT_ONLY";
}

export interface TimerState {
  active: boolean;
  endsAt: number;
  label: string;
  stepKey: string;
}

export interface PlacementPreview {
  tileId: string;
  row: number;
  col: number;
  outcome: "ILLEGAL" | "UNINCORP" | "FOUND" | "GROW" | "MERGE";
  details: string;
  involvedFirms: FirmId[];
  survivorTie: boolean;
}

export interface MergerCtx {
  initiatorId: number;
  survivor: FirmId | null; // null if needs choice
  survivorChoices: FirmId[];
  acquired: FirmId[]; // firms being absorbed
  // For each acquired firm, shareholder decision order (playerIds)
  decisionOrderByAcquired: Record<FirmId, number[]>;
  // Which acquired firm is currently being processed in UI
  acquiredIndex: number;
  // Which player in the decision order is being prompted (only prompts human if present)
  orderIndex: number;
  // Accumulated aggregate totals for current acquired firm
  currentTotals: { tradedIn: number; tradeOut: number; sold: number; held: number; tradeCapped: boolean };
  // To know per-player remaining shares for current acquired firm during decisions
  remainingShares: Record<number, number>;
}

export interface VoteCtx {
  firmId: FirmId;
  callerId: number;
  votes: Record<number, "YES" | "NO">;
}

export interface UIState {
  phase: Phase;
  hoveredTileId: string | null;
  draggingTileId: string | null;
  preview: PlacementPreview | null;

  settingsOpen: boolean;
  modal:
    | null
    | { kind: "FOUND_SELECT"; tileId: string; choices: FirmId[] }
    | { kind: "SURVIVOR_CHOICE"; choices: FirmId[] }
    | { kind: "MERGER"; ctx: MergerCtx }
    | { kind: "BUY"; selections: Record<FirmId, number> }
    | { kind: "VOTE"; ctx: VoteCtx }
    | { kind: "ENDGAME"; standings: { name: string; cash: number }[] };

  timer: TimerState;
}

export interface GameState {
  board: Cell[][];
  firms: Record<FirmId, Firm>;
  players: Player[];
  tileBag: Tile[];
  currentPlayer: number;
  roundNumber: number;
  visibility: VisibilityConfig;
  ui: UIState;
  log: string[];
}
