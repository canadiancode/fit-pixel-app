import type { WaterUnit, WeightUnit } from "./types";

/**
 * SECURITY: reject NaN / non-finite / below-min / absurd ceilings on write.
 * Ranges align with Actions target steppers (slightly rounded for ml/kg).
 */
export const DAILY_GOAL_LIMITS = {
  foodKcal: { min: 500, max: 6_000 },
  waterAmount: {
    oz: { min: 8, max: 256 },
    ml: { min: 250, max: 8_000 },
  },
  trainMinutes: { min: 15, max: 240 },
  sleepHours: { min: 6, max: 12 },
  steps: { min: 1_000, max: 50_000 },
  activeKcal: { min: 200, max: 5_000 },
  weightGoal: {
    lb: { min: 100, max: 400 },
    kg: { min: 45, max: 180 },
  },
} as const;

export function waterAmountLimits(unit: WaterUnit): {
  min: number;
  max: number;
} {
  return DAILY_GOAL_LIMITS.waterAmount[unit];
}

export function weightGoalLimits(unit: WeightUnit): {
  min: number;
  max: number;
} {
  return DAILY_GOAL_LIMITS.weightGoal[unit];
}
