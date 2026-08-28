import { useCallback } from "react";

import {
  EMPTY_DASHBOARD_METRICS,
  NO_CONNECTIVITY,
  type DashboardHealthMetricsHookValue,
} from "@/hooks/health-metrics-types";

export type {
  DashboardHealthConnectivity,
  DashboardHealthMetrics,
  HealthAuthorizationStatus,
  HealthDataContributor,
  HealthKitDataContributor,
  HealthPlatform,
} from "@/hooks/health-metrics-types";
export { EMPTY_DASHBOARD_METRICS } from "@/hooks/health-metrics-types";

/** Web / fallback: no native health store. iOS and Android use platform files. */
export function useDashboardHealthMetrics(): DashboardHealthMetricsHookValue {
  const openHealthSettings = useCallback(() => {}, []);

  return {
    metrics: EMPTY_DASHBOARD_METRICS,
    connectivity: NO_CONNECTIVITY,
    isLoading: false,
    healthDataAvailable: false,
    authorizationRequestStatus: "unavailable",
    healthContributors: [],
    healthPlatform: "none",
    openHealthSettings,
  };
}
