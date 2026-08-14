import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";

import type { BarChartUserData } from "@/components/charts/bar-chart-types";
import { useHabitProgress } from "@/features/actions/habit-progress-context";
import {
  historySpecForLookback,
  type HistoryLookbackId,
} from "@/features/actions/history-lookback";
import { getEarliestFoodDayKey, getFoodHistorySeries } from "@/lib/db";

export type FoodHistoryMetric = "kcal" | "proteinG" | "carbsG" | "fatG";

type FoodHistoryChartState = {
  userData: BarChartUserData;
  isHydrated: boolean;
};

const EMPTY_WEEK: BarChartUserData = {
  x: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  y: [0, 0, 0, 0, 0, 0, 0],
};

export function useFoodHistoryChart(
  lookback: HistoryLookbackId,
  metric: FoodHistoryMetric,
): FoodHistoryChartState {
  const db = useSQLiteContext();
  const { totals, isHydrated: progressHydrated } = useHabitProgress();
  const [userData, setUserData] = useState<BarChartUserData>(EMPTY_WEEK);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (!progressHydrated) return;

    let cancelled = false;

    void (async () => {
      try {
        const earliestFoodDayKey =
          lookback === "allTime" ? await getEarliestFoodDayKey(db) : null;
        if (cancelled) return;

        const spec = historySpecForLookback(lookback, earliestFoodDayKey);
        if (spec === "empty") {
          setUserData(EMPTY_WEEK);
          return;
        }

        const series = await getFoodHistorySeries(db, spec);
        if (cancelled) return;
        setUserData({
          x: series.labels,
          y: series[metric],
        });
      } finally {
        if (!cancelled) {
          setIsHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [db, lookback, metric, progressHydrated, totals]);

  return { userData, isHydrated };
}
