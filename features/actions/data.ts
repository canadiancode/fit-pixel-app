import { clampActionBarPercent } from "@/lib/action-bar-progress";
import { clampXpBarPercent } from "@/lib/xp-progress";
import type { DailyGoals } from "@/lib/db";

import { ACTION_BAR_CONTAINER, ACTION_ROW_ACCENT_COLORS } from "./constants";

export const ACTION_ROWS_DAILY = [
  {
    id: "food",
    label: "Food",
    icon: require("@/assets/icons/apple.png"),
    barFill: require("@/assets/bars/action-bar-red.png"),
    barEnd: require("@/assets/bars/action-bar-red-end.png"),
  },
  {
    id: "water",
    label: "Water",
    icon: require("@/assets/icons/water-drop.png"),
    barFill: require("@/assets/bars/action-bar-blue.png"),
    barEnd: require("@/assets/bars/action-bar-blue-end.png"),
  },
  {
    id: "train",
    label: "Train",
    icon: require("@/assets/icons/dumbbell.png"),
    barFill: require("@/assets/bars/action-bar-grey.png"),
    barEnd: require("@/assets/bars/action-bar-grey-end.png"),
  },
  {
    id: "sleep",
    label: "Sleep",
    icon: require("@/assets/icons/purple-moon.png"),
    barFill: require("@/assets/bars/action-bar-purple.png"),
    barEnd: require("@/assets/bars/action-bar-purple-end.png"),
  },
  {
    id: "steps",
    label: "Steps",
    icon: require("@/assets/icons/lightning.png"),
    barFill: require("@/assets/bars/action-bar-yellow.png"),
    barEnd: require("@/assets/bars/action-bar-yellow-end.png"),
  },
  {
    id: "calories",
    label: "Calories",
    icon: require("@/assets/icons/fire.png"),
    barFill: require("@/assets/bars/action-bar-orange.png"),
    barEnd: require("@/assets/bars/action-bar-orange-end.png"),
  },
] as const;

export const ACTION_ROWS_LONG_TERM = [
  {
    id: "weight",
    label: "Weight",
    icon: require("@/assets/icons/scale.png"),
    barFill: require("@/assets/bars/action-bar-grey.png"),
    barEnd: require("@/assets/bars/action-bar-grey-end.png"),
  },
] as const;

export const ACTION_LIST_LONG_TERM_DIVIDER_LABEL = "long term progress";

export const ACTION_ROWS = [
  ...ACTION_ROWS_DAILY,
  ...ACTION_ROWS_LONG_TERM,
] as const;

export type ActionRouteId = (typeof ACTION_ROWS)[number]["id"];

/** Logged totals for today (from habit_logs aggregates). */
export type ActionProgressTotals = {
  foodKcal?: number;
  waterAmount?: number;
  trainMinutes?: number;
  sleepHours?: number;
  steps?: number;
  activeKcal?: number;
  weight?: number;
};

export type ActionProgressDisplay = {
  current: string;
  rest: string;
  accentColor: string;
  /** Raw 0–100 progress toward the goal. */
  percent: number;
};

function formatInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/**
 * Format sleep duration stored in hours as `8H` or `8H30M` (no decimal hours).
 */
export function formatSleepDurationLabel(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) {
    return "0H";
  }
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(Math.abs(totalMinutes) / 60);
  const m = Math.abs(totalMinutes) % 60;
  if (m === 0) {
    return `${h}H`;
  }
  return `${h}H${m}M`;
}

function percentToward(current: number, goal: number): number {
  if (!(goal > 0) || !Number.isFinite(current) || current <= 0) {
    return 0;
  }
  return Math.min(100, (current / goal) * 100);
}

export function getActionRow(id: ActionRouteId) {
  const row = ACTION_ROWS.find((r) => r.id === id);
  if (!row) {
    throw new Error(`Unknown action route: ${id}`);
  }
  return row;
}

export function getActionRowAccentColor(id: ActionRouteId): string {
  return ACTION_ROW_ACCENT_COLORS[id];
}

/**
 * Progress label + % from goals and optional logged totals.
 * Totals come from habit_logs aggregates (0 when none logged yet).
 */
export function getActionRowProgressDisplay(
  id: ActionRouteId,
  goals: DailyGoals,
  totals: ActionProgressTotals = {},
): ActionProgressDisplay {
  const accentColor = getActionRowAccentColor(id);

  switch (id) {
    case "food": {
      const current = totals.foodKcal ?? 0;
      const goal = goals.foodKcal;
      return {
        current: formatInt(current),
        rest: ` / ${formatInt(goal)} KCAL`,
        accentColor,
        percent: percentToward(current, goal),
      };
    }
    case "water": {
      const current = totals.waterAmount ?? 0;
      const goal = goals.waterAmount;
      const unit = goals.waterUnit === "ml" ? "ml" : "oz";
      return {
        current: formatInt(current),
        rest: ` / ${formatInt(goal)}${unit}`,
        accentColor,
        percent: percentToward(current, goal),
      };
    }
    case "train": {
      const current = totals.trainMinutes ?? 0;
      const goal = goals.trainMinutes;
      return {
        current: formatInt(current),
        rest: ` / ${formatInt(goal)}M`,
        accentColor,
        percent: percentToward(current, goal),
      };
    }
    case "sleep": {
      const current = totals.sleepHours ?? 0;
      const goal = goals.sleepHours;
      return {
        current: formatSleepDurationLabel(current),
        rest: ` / ${formatSleepDurationLabel(goal)}`,
        accentColor,
        percent: percentToward(current, goal),
      };
    }
    case "steps": {
      const current = totals.steps ?? 0;
      const goal = goals.steps;
      return {
        current: formatInt(current),
        rest: ` / ${formatInt(goal)} STEPS`,
        accentColor,
        percent: percentToward(current, goal),
      };
    }
    case "calories": {
      const current = totals.activeKcal ?? 0;
      const goal = goals.activeKcal;
      return {
        current: formatInt(current),
        rest: ` / ${formatInt(goal)} KCAL`,
        accentColor,
        percent: percentToward(current, goal),
      };
    }
    case "weight": {
      const current = totals.weight ?? 0;
      const goal = goals.weightGoal;
      const unit = goals.weightUnit === "kg" ? "KG" : "LBS";
      return {
        current: formatInt(current),
        rest: ` / ${formatInt(goal)} ${unit}`,
        accentColor,
        percent: percentToward(current, goal),
      };
    }
    default: {
      const _exhaustive: never = id;
      void _exhaustive;
      throw new Error(`Unknown action route: ${id}`);
    }
  }
}

/** Full label for accessibility, e.g. `0/2,500 KCAL`. */
export function getActionRowProgressLabel(
  id: ActionRouteId,
  goals: DailyGoals,
  totals?: ActionProgressTotals,
): string {
  const { current, rest } = getActionRowProgressDisplay(id, goals, totals);
  return `${current}${rest}`;
}

export function getActionRowProgressPercent(
  id: ActionRouteId,
  goals: DailyGoals,
  totals?: ActionProgressTotals,
): number {
  return getActionRowProgressDisplay(id, goals, totals).percent;
}

/** Clamped fill percent for the action bar artwork. */
export function getActionRowFillPercent(
  id: ActionRouteId,
  goals: DailyGoals,
  totals?: ActionProgressTotals,
): number {
  return clampActionBarPercent(
    getActionRowProgressPercent(id, goals, totals),
  );
}

/**
 * Overall Today's progress: mean of the six daily habit rows (excludes weight).
 * Raw 0–100 for the header label.
 */
export function getTodaysProgressPercent(
  goals: DailyGoals,
  totals: ActionProgressTotals = {},
): number {
  let sum = 0;
  for (const row of ACTION_ROWS_DAILY) {
    sum += getActionRowProgressPercent(row.id, goals, totals);
  }
  return sum / ACTION_ROWS_DAILY.length;
}

/** Visual fill for the header XpLevelBar artwork. */
export function getTodaysProgressFillPercent(
  goals: DailyGoals,
  totals?: ActionProgressTotals,
): number {
  return clampXpBarPercent(getTodaysProgressPercent(goals, totals));
}

export function getActionRowBarSources(row: (typeof ACTION_ROWS)[number]) {
  return {
    fill: row.barFill,
    end: row.barEnd,
    container: ACTION_BAR_CONTAINER,
  };
}
