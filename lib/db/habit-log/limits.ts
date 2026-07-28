import type { WaterUnit, WeightUnit } from "../daily-goals/types";

/**
 * SECURITY: clamp / reject absurd magnitudes at the repository write boundary.
 * Per-entry ceilings (not daily totals) — allow corrections via negative amounts
 * where the UI supports subtract-style servings.
 */
export const HABIT_LOG_LIMITS = {
  water: {
    oz: { minAbs: 0.1, maxAbs: 256 },
    ml: { minAbs: 1, maxAbs: 8_000 },
  },
  foodKcal: { min: 0, max: 10_000 },
  foodMacroG: { min: 0, max: 1_000 },
  foodNameMaxLen: 120,
  foodPortionMaxLen: 80,
  foodNotesMaxLen: 500,
  trainMinutes: { minAbs: 1, maxAbs: 720 },
  sleepHours: { minAbs: 0.05, maxAbs: 24 },
  weight: {
    lb: { min: 50, max: 700 },
    kg: { min: 20, max: 320 },
  },
  steps: { minAbs: 1, maxAbs: 100_000 },
  activeKcal: { minAbs: 1, maxAbs: 10_000 },
  trainTypeMaxLen: 80,
} as const;

export function waterHabitAmountLimits(unit: WaterUnit): {
  minAbs: number;
  maxAbs: number;
} {
  return HABIT_LOG_LIMITS.water[unit];
}

export function weightHabitValueLimits(unit: WeightUnit): {
  min: number;
  max: number;
} {
  return HABIT_LOG_LIMITS.weight[unit];
}
