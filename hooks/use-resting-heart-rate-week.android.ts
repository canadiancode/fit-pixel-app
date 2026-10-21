import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { initialize, readRecords } from "react-native-health-connect";

import {
  buildRestingHeartRateWeek,
  emptyRestingHeartRateWeek,
  restingHeartRateWeekStart,
  type RestingHeartRateDay,
  type RestingHeartRateWeekHookValue,
} from "@/hooks/resting-heart-rate-week";

/** Most sources write ~1 resting HR record a day; headroom for multiple apps. */
const WEEK_PAGE_SIZE = 100;

/**
 * Last 7 days of Health Connect resting heart rate. SDK init + permissions are
 * handled by `useDashboardHealthMetrics`; failures here yield an empty week.
 */
export function useRestingHeartRateWeek(
  connected: boolean,
): RestingHeartRateWeekHookValue {
  const [days, setDays] = useState<readonly RestingHeartRateDay[]>(
    emptyRestingHeartRateWeek,
  );
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!connected) {
        setDays(emptyRestingHeartRateWeek());
        setIsLoading(false);
        return;
      }
      let cancelled = false;
      void (async () => {
        const now = new Date();
        // Idempotent; the dashboard hook may not have initialized the SDK yet.
        await initialize().catch(() => false);
        const { records } = await readRecords("RestingHeartRate", {
          timeRangeFilter: {
            operator: "between",
            startTime: restingHeartRateWeekStart(now).toISOString(),
            endTime: now.toISOString(),
          },
          ascendingOrder: false,
          pageSize: WEEK_PAGE_SIZE,
        }).catch(() => ({ records: [] }));
        if (cancelled) return;
        setDays(
          buildRestingHeartRateWeek(
            records.map((r) => ({ at: new Date(r.time), bpm: r.beatsPerMinute })),
            now,
          ),
        );
        setIsLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [connected]),
  );

  return { days, isLoading };
}
