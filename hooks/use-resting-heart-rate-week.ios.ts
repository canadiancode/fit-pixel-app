import { queryQuantitySamples } from "@kingstinct/react-native-healthkit";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import {
  buildRestingHeartRateWeek,
  emptyRestingHeartRateWeek,
  restingHeartRateWeekStart,
  type RestingHeartRateDay,
  type RestingHeartRateWeekHookValue,
} from "@/hooks/resting-heart-rate-week";

/** Apple Watch writes ~1 resting HR sample a day; headroom for other sources. */
const WEEK_SAMPLE_LIMIT = 100;

/**
 * Last 7 days of HealthKit resting heart rate, re-queried on focus and when
 * `connected` flips (auth resolves after mount). Authorization is requested by
 * `useDashboardHealthMetrics`; without it the query returns nothing.
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
        const samples = await queryQuantitySamples(
          "HKQuantityTypeIdentifierRestingHeartRate",
          {
            limit: WEEK_SAMPLE_LIMIT,
            ascending: false,
            filter: {
              date: { startDate: restingHeartRateWeekStart(now), endDate: now },
            },
          },
        ).catch(() => []);
        if (cancelled) return;
        setDays(
          buildRestingHeartRateWeek(
            samples.map((s) => ({ at: s.startDate, bpm: s.quantity })),
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
