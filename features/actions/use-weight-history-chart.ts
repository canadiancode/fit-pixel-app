import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";

import type { BarChartUserData } from "@/components/charts/bar-chart-types";
import { useHabitProgress } from "@/features/actions/habit-progress-context";
import {
  historySpecForLookback,
  type HistoryLookbackId,
} from "@/features/actions/history-lookback";
import {
  getEarliestWeightDayKey,
  getWeightHistorySeries,
  type WeightUnit,
} from "@/lib/db";

type WeightHistoryChartState = {
  userData: BarChartUserData;
  isHydrated: boolean;
};

const EMPTY_WEEK: BarChartUserData = {
  x: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  y: [0, 0, 0, 0, 0, 0, 0],
};

export function useWeightHistoryChart(
  lookback: HistoryLookbackId,
  weightUnit: WeightUnit,
): WeightHistoryChartState {
  const db = useSQLiteContext();
  const { totals, isHydrated: progressHydrated } = useHabitProgress();
  const [userData, setUserData] = useState<BarChartUserData>(EMPTY_WEEK);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (!progressHydrated) return;

    let cancelled = false;

    void (async () => {
      try {
        const earliestWeightDayKey =
          lookback === "allTime" ? await getEarliestWeightDayKey(db) : null;
        if (cancelled) return;

        const spec = historySpecForLookback(lookback, earliestWeightDayKey);
        if (spec === "empty") {
          setUserData(EMPTY_WEEK);
          return;
        }

        const series = await getWeightHistorySeries(db, spec, weightUnit);
        if (cancelled) return;
        setUserData({ x: series.labels, y: series.values });
      } finally {
        if (!cancelled) {
          setIsHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [db, lookback, weightUnit, progressHydrated, totals]);

  return { userData, isHydrated };
}
