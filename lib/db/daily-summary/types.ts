import type { WaterUnit, WeightUnit } from "../daily-goals/types";

/**
 * Daily habit goals that can flip unmet → met (Phase 4 XP bonuses).
 * Weight is long-term — stored as `weight` on the summary, not in goalsMet.
 */
export const DAILY_SUMMARY_GOAL_KEYS = [
  "food",
  "water",
  "train",
  "sleep",
  "steps",
  "active_kcal",
] as const;

export type DailySummaryGoalKey = (typeof DAILY_SUMMARY_GOAL_KEYS)[number];

/**
 * Derived per-day aggregates for bars / charts / goal %.
 *
 * SECURITY: never enqueueOp daily_summary — recompute from habit_logs facts.
 * goalsMet uses current daily_goals (goals are not historically versioned yet).
 */
export type DailySummary = {
  dayKey: string;
  foodKcal: number;
  waterAmount: number;
  trainMinutes: number;
  sleepHours: number;
  steps: number;
  activeKcal: number;
  /** Latest weight log that day, in `weightUnit`; null if none. */
  weight: number | null;
  /** Units used when aggregates were computed (cache invalid if prefs differ). */
  waterUnit: WaterUnit;
  weightUnit: WeightUnit;
  goalsMet: DailySummaryGoalKey[];
  updatedAt: string;
};

export type DailySummaryTotalsOptions = {
  waterUnit: WaterUnit;
  weightUnit: WeightUnit;
};
