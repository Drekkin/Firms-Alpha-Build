import { Firm, Tier } from "./types";
import { TIER_BASE } from "./constants";

export function bracketForSize(size: number): number {
  if (size <= 1) return 0;
  if (size === 2) return 1;
  if (size === 3) return 2;
  if (size === 4) return 3;
  if (size === 5) return 4;
  if (size <= 9) return 5;
  if (size <= 14) return 6;
  if (size <= 19) return 7;
  if (size <= 24) return 8;
  if (size <= 29) return 9;
  if (size <= 34) return 10;
  if (size <= 39) return 11;
  return 12;
}

export function priceForFirm(firm: Firm): number {
  if (!firm.active || firm.size < 2) return 0;
  const b = bracketForSize(firm.size);
  return TIER_BASE[firm.tier] * b;
}

export function majorityBonus(price: number): number {
  return 10 * price;
}
export function minorityBonus(price: number): number {
  return 5 * price;
}
