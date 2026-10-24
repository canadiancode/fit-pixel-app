import type { WeightUnit } from "../daily-goals/types";

/**
 * Which way the daily food target points, from the weight journey:
 *   under — losing weight: land in the zone just below the target
 *   over  — gaining weight: reach the target or beyond
 *   near  — maintaining (or no weigh-in yet): land close to the target
 *
 * Mirrored by recompute_my_xp() on the server
 * (20261031000000_xp_caps_food_direction.sql); keep the numbers in step.
 */
export type FoodGoalMode = "under" | "over" | "near";

/** Within this distance of the goal weight counts as maintaining. */
const MAINTAIN_BAND: Readonly<Record<WeightUnit, number>> = { lb: 2, kg: 1 };

/**
 * Losing: eating less than this share of the target doesn't count, so one
 * snack isn't a met goal and under-eating isn't rewarded.
 */
export const FOOD_UNDER_FLOOR = 0.8;
/** Maintaining: within ±10% of the target. */
export const FOOD_NEAR_LOW = 0.9;
export const FOOD_NEAR_HIGH = 1.1;

export function getFoodGoalMode(
  latestWeight: number | null | undefined,
  weightGoal: number,
  weightUnit: WeightUnit,
): FoodGoalMode {
  if (latestWeight == null || !Number.isFinite(latestWeight)) return "near";
  const band = MAINTAIN_BAND[weightUnit];
  if (latestWeight > weightGoal + band) return "under";
  if (latestWeight < weightGoal - band) return "over";
  return "near";
}

/** The kcal range that meets the goal (`max` is Infinity when gaining). */
export function getFoodGoalRange(
  mode: FoodGoalMode,
  targetKcal: number,
): { min: number; max: number } {
  switch (mode) {
    case "under":
      return { min: targetKcal * FOOD_UNDER_FLOOR, max: targetKcal };
    case "over":
      return { min: targetKcal, max: Infinity };
    case "near":
      return { min: targetKcal * FOOD_NEAR_LOW, max: targetKcal * FOOD_NEAR_HIGH };
  }
}

export function isFoodGoalMet(
  mode: FoodGoalMode,
  kcal: number,
  targetKcal: number,
): boolean {
  if (!(targetKcal > 0) || !(kcal > 0)) return false;
  const { min, max } = getFoodGoalRange(mode, targetKcal);
  return kcal >= min && kcal <= max;
}

/** True once the day has gone past the top of the range. */
export function isFoodOverLimit(
  mode: FoodGoalMode,
  kcal: number,
  targetKcal: number,
): boolean {
  if (!(targetKcal > 0)) return false;
  return kcal > getFoodGoalRange(mode, targetKcal).max;
}

/**
 * 0–100 toward the goal: climbs to 100 at the bottom of the range, holds
 * there inside it, and eases back down past the top (never below 0).
 */
export function getFoodGoalScore(
  mode: FoodGoalMode,
  kcal: number,
  targetKcal: number,
): number {
  if (!(targetKcal > 0) || !Number.isFinite(kcal) || kcal <= 0) return 0;
  const { min, max } = getFoodGoalRange(mode, targetKcal);
  if (kcal < min) return (kcal / min) * 100;
  if (kcal <= max) return 100;
  return (max / kcal) * 100;
}
