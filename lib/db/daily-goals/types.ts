/**
 * Local daily + long-term goal targets (singleton).
 *
 * Day boundary (`dayStartsAt` / timeZone) lives on `app_day_boundary` — not
 * duplicated here — so “today” keys and goal % share one source of truth.
 */

export const WATER_UNITS = ["oz", "ml"] as const;
export type WaterUnit = (typeof WATER_UNITS)[number];

export const WEIGHT_UNITS = ["lb", "kg"] as const;
export type WeightUnit = (typeof WEIGHT_UNITS)[number];

/** Defaults match the current Actions UI placeholders. */
export const DEFAULT_DAILY_GOALS = {
  foodKcal: 2_500,
  waterAmount: 80,
  waterUnit: "oz" as WaterUnit,
  trainMinutes: 60,
  sleepHours: 8,
  steps: 10_000,
  activeKcal: 800,
  weightGoal: 123,
  weightUnit: "lb" as WeightUnit,
} as const;

export type DailyGoals = {
  foodKcal: number;
  waterAmount: number;
  waterUnit: WaterUnit;
  trainMinutes: number;
  sleepHours: number;
  steps: number;
  activeKcal: number;
  /** Long-term target weight. */
  weightGoal: number;
  weightUnit: WeightUnit;
  updatedAt: string;
};

export type DailyGoalsUpdate = Partial<
  Omit<DailyGoals, "updatedAt">
>;
