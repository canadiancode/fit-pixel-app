import type { FoodKcalHistorySpec } from "@/lib/db";

export const HISTORY_LOOKBACK_IDS = [
  "week",
  "month",
  "threeMonths",
  "year",
  "fiveYears",
  "allTime",
] as const;

export type HistoryLookbackId = (typeof HISTORY_LOOKBACK_IDS)[number];

export const HISTORY_LOOKBACK_OPTIONS: readonly {
  id: HistoryLookbackId;
  label: string;
}[] = [
  { id: "week", label: "1 week" },
  { id: "month", label: "1 month" },
  { id: "threeMonths", label: "3 months" },
  { id: "year", label: "1 year" },
  { id: "fiveYears", label: "5 years" },
  { id: "allTime", label: "All time" },
] as const;

export const DEFAULT_HISTORY_LOOKBACK: HistoryLookbackId = "week";

export const HISTORY_LOOKBACK_WEEK_DAY_COUNT = 7;
export const HISTORY_LOOKBACK_MONTH_DAY_COUNT = 30;
export const HISTORY_LOOKBACK_THREE_MONTH_WEEK_COUNT = 13;
export const HISTORY_LOOKBACK_YEAR_MONTH_COUNT = 12;
export const HISTORY_LOOKBACK_FIVE_YEAR_COUNT = 5;

export function historyLookbackLabel(id: HistoryLookbackId): string {
  return (
    HISTORY_LOOKBACK_OPTIONS.find((option) => option.id === id)?.label ??
    "1 week"
  );
}

/**
 * Map a lookback control to a habit history query.
 * `"empty"` = all-time with no logs (caller shows a zeroed week).
 */
export function historySpecForLookback(
  id: HistoryLookbackId,
  earliestDayKey: string | null,
): FoodKcalHistorySpec | "empty" {
  switch (id) {
    case "week":
      return { grain: "day", dayCount: HISTORY_LOOKBACK_WEEK_DAY_COUNT };
    case "month":
      return { grain: "day", dayCount: HISTORY_LOOKBACK_MONTH_DAY_COUNT };
    case "threeMonths":
      return { grain: "week", weekCount: HISTORY_LOOKBACK_THREE_MONTH_WEEK_COUNT };
    case "year":
      return { grain: "month", monthCount: HISTORY_LOOKBACK_YEAR_MONTH_COUNT };
    case "fiveYears":
      return { grain: "year", yearCount: HISTORY_LOOKBACK_FIVE_YEAR_COUNT };
    case "allTime":
      if (earliestDayKey == null) {
        return "empty";
      }
      return { grain: "year", fromDayKey: earliestDayKey };
  }
}

/**
 * Map a lookback control to a food history query.
 * `"empty"` = all-time with no food logs (caller shows a zeroed week).
 */
export function foodHistorySpecForLookback(
  id: HistoryLookbackId,
  earliestFoodDayKey: string | null,
): FoodKcalHistorySpec | "empty" {
  return historySpecForLookback(id, earliestFoodDayKey);
}
