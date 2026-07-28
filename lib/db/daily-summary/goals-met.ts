import type { DailyGoals } from "../daily-goals/types";
import type { HabitDayTotals } from "../habit-log/totals";
import {
  DAILY_SUMMARY_GOAL_KEYS,
  type DailySummaryGoalKey,
} from "./types";

/**
 * Deterministic unmet → met from habit totals vs current goals.
 * Historical goal changes are not versioned — accepted local limitation until server.
 */
export function computeGoalsMet(
  totals: HabitDayTotals,
  goals: Pick<
    DailyGoals,
    | "foodKcal"
    | "waterAmount"
    | "trainMinutes"
    | "sleepHours"
    | "steps"
    | "activeKcal"
  >,
): DailySummaryGoalKey[] {
  const met: DailySummaryGoalKey[] = [];
  for (const key of DAILY_SUMMARY_GOAL_KEYS) {
    if (isGoalMet(key, totals, goals)) {
      met.push(key);
    }
  }
  return met;
}

function isGoalMet(
  key: DailySummaryGoalKey,
  totals: HabitDayTotals,
  goals: Pick<
    DailyGoals,
    | "foodKcal"
    | "waterAmount"
    | "trainMinutes"
    | "sleepHours"
    | "steps"
    | "activeKcal"
  >,
): boolean {
  switch (key) {
    case "food":
      return totals.foodKcal >= goals.foodKcal;
    case "water":
      return totals.waterAmount >= goals.waterAmount;
    case "train":
      return totals.trainMinutes >= goals.trainMinutes;
    case "sleep":
      return totals.sleepHours >= goals.sleepHours;
    case "steps":
      return totals.steps >= goals.steps;
    case "active_kcal":
      return totals.activeKcal >= goals.activeKcal;
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}
