import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";

import { useDailyGoals } from "@/features/actions/daily-goals-context";
import { useHabitProgress } from "@/features/actions/habit-progress-context";
import {
  getMonthlyWeightSeries,
  getWeeklyMetricSeries,
  type HabitSummaryMetric,
} from "@/lib/db";
import type { BarChartUserData } from "@/components/charts/bar-chart-types";

type WeeklyChartState = {
  userData: BarChartUserData;
  isHydrated: boolean;
};

const EMPTY_WEEK: BarChartUserData = {
  x: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  y: [0, 0, 0, 0, 0, 0, 0],
};

/**
 * Metrics whose today's bar should use merged manual + HealthKit totals
 * (same as Actions progress), not SQLite-only daily_summary.
 */
const CONNECTED_TODAY_METRICS = new Set<HabitSummaryMetric>([
  "steps",
  "activeKcal",
]);

function todayMergedValue(
  metric: HabitSummaryMetric,
  totals: {
    steps?: number;
    activeKcal?: number;
  },
): number | null {
  if (metric === "steps") return totals.steps ?? 0;
  if (metric === "activeKcal") return totals.activeKcal ?? 0;
  return null;
}

/**
 * Rolling 7-day series from daily_summary (lazy cache over habit_logs).
 * For steps / active kcal, today's bar uses merged HabitProgress totals
 * (manual + HealthKit). Refreshes when today's totals change.
 */
export function useWeeklyHabitHistoryChart(metric: HabitSummaryMetric): WeeklyChartState {
  const db = useSQLiteContext();
  const { goals, isHydrated: goalsHydrated } = useDailyGoals();
  const { totals, isHydrated: progressHydrated } = useHabitProgress();
  const [userData, setUserData] = useState<BarChartUserData>(EMPTY_WEEK);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (!goalsHydrated || !progressHydrated) return;

    let cancelled = false;

    void (async () => {
      try {
        const series = await getWeeklyMetricSeries(
          db,
          metric,
          {
            waterUnit: goals.waterUnit,
            weightUnit: goals.weightUnit,
          },
          7,
        );
        if (cancelled) return;

        const values = [...series.values];
        if (CONNECTED_TODAY_METRICS.has(metric) && values.length > 0) {
          const merged = todayMergedValue(metric, totals);
          if (merged != null) {
            values[values.length - 1] = merged;
          }
        }
        setUserData({ x: series.labels, y: values });
      } finally {
        if (!cancelled) {
          setIsHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // `totals` intentionally triggers refresh after habit writes / HealthKit.
  }, [
    db,
    metric,
    goals.waterUnit,
    goals.weightUnit,
    goalsHydrated,
    progressHydrated,
    totals,
  ]);

  return { userData, isHydrated };
}

type MonthlyWeightChartState = {
  userData: BarChartUserData;
  isHydrated: boolean;
};

const EMPTY_MONTHS: BarChartUserData = {
  x: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
  y: [0, 0, 0, 0, 0, 0, 0],
};

export function useMonthlyWeightHistoryChart(): MonthlyWeightChartState {
  const db = useSQLiteContext();
  const { goals, isHydrated: goalsHydrated } = useDailyGoals();
  const { totals, isHydrated: progressHydrated } = useHabitProgress();
  const [userData, setUserData] = useState<BarChartUserData>(EMPTY_MONTHS);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (!goalsHydrated || !progressHydrated) return;

    let cancelled = false;

    void (async () => {
      try {
        const series = await getMonthlyWeightSeries(db, goals.weightUnit, 7);
        if (!cancelled) {
          setUserData({ x: series.labels, y: series.values });
        }
      } finally {
        if (!cancelled) {
          setIsHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    db,
    goals.weightUnit,
    goalsHydrated,
    progressHydrated,
    totals,
  ]);

  return { userData, isHydrated };
}
