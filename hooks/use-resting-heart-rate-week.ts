import { useMemo } from "react";

import {
  emptyRestingHeartRateWeek,
  type RestingHeartRateWeekHookValue,
} from "@/hooks/resting-heart-rate-week";

/** Web / fallback: no native health store. iOS and Android use platform files. */
export function useRestingHeartRateWeek(
  _connected: boolean,
): RestingHeartRateWeekHookValue {
  const days = useMemo(() => emptyRestingHeartRateWeek(), []);
  return { days, isLoading: false };
}
