import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  SdkAvailabilityStatus,
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  type Permission,
} from "react-native-health-connect";

import {
  EMPTY_DASHBOARD_METRICS,
  NO_CONNECTIVITY,
  type DashboardHealthMetrics,
  type DashboardHealthMetricsHookValue,
  type HealthAuthorizationStatus,
  type HealthDataContributor,
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

const READ_PERMISSIONS: Permission[] = [
  { accessType: "read", recordType: "RestingHeartRate" },
  { accessType: "read", recordType: "Weight" },
  { accessType: "read", recordType: "Steps" },
  { accessType: "read", recordType: "ActiveCaloriesBurned" },
  { accessType: "read", recordType: "Hydration" },
  { accessType: "read", recordType: "SleepSession" },
];

const CONTRIBUTOR_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_CONTRIBUTORS_SHOWN = 20;

const ORIGIN_LABELS: Record<string, string> = {
  "com.google.android.apps.fitness": "Google Fit",
  "com.google.android.apps.healthdata": "Health Connect",
  "com.samsung.android.shealth": "Samsung Health",
  "com.sec.android.app.shealth": "Samsung Health",
  "com.fitbit.FitbitMobile": "Fitbit",
  "com.garmin.android.apps.connectmobile": "Garmin Connect",
  "com.withings.wiscale2": "Withings",
  "com.xiaomi.hm.health": "Zepp / Mi Fitness",
  "com.huawei.health": "Huawei Health",
};

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function iso(d: Date): string {
  return d.toISOString();
}

function todayRange(): { startTime: string; endTime: string } {
  const now = new Date();
  return { startTime: iso(startOfLocalDay(now)), endTime: iso(now) };
}

function hasReadPermission(
  granted: readonly { accessType?: string; recordType?: string }[],
  recordType: Permission["recordType"],
): boolean {
  return granted.some(
    (p) => p.accessType === "read" && p.recordType === recordType,
  );
}

function allReadGranted(
  granted: readonly { accessType?: string; recordType?: string }[],
): boolean {
  return READ_PERMISSIONS.every((needed) =>
    hasReadPermission(granted, needed.recordType),
  );
}

function originLabel(packageName: string | undefined): string {
  if (!packageName) return "Unknown";
  return ORIGIN_LABELS[packageName] ?? packageName;
}

function finiteOrNull(n: number | undefined): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  return n;
}

async function fetchRestingHeartRateBpm(): Promise<number | null> {
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - 90 * 24 * 60 * 60 * 1000);
  const { records } = await readRecords("RestingHeartRate", {
    timeRangeFilter: {
      operator: "between",
      startTime: iso(windowStart),
      endTime: iso(windowEnd),
    },
    ascendingOrder: false,
    pageSize: 1,
  });
  const bpm = records[0]?.beatsPerMinute;
  const n = finiteOrNull(bpm);
  return n == null ? null : Math.round(n);
}

async function fetchWeightLbs(): Promise<number | null> {
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - 365 * 24 * 60 * 60 * 1000);
  const { records } = await readRecords("Weight", {
    timeRangeFilter: {
      operator: "between",
      startTime: iso(windowStart),
      endTime: iso(windowEnd),
    },
    ascendingOrder: false,
    pageSize: 1,
  });
  const pounds = records[0]?.weight.inPounds;
  const n = finiteOrNull(pounds);
  return n == null ? null : Math.round(n);
}

async function fetchStepsToday(): Promise<number | null> {
  const range = todayRange();
  const result = await aggregateRecord({
    recordType: "Steps",
    timeRangeFilter: { operator: "between", ...range },
  });
  const n = finiteOrNull(result.COUNT_TOTAL);
  return n == null || n <= 0 ? null : Math.round(n);
}

async function fetchActiveEnergyToday(): Promise<number | null> {
  const range = todayRange();
  const result = await aggregateRecord({
    recordType: "ActiveCaloriesBurned",
    timeRangeFilter: { operator: "between", ...range },
  });
  const n = finiteOrNull(result.ACTIVE_CALORIES_TOTAL.inKilocalories);
  return n == null || n <= 0 ? null : Math.round(n);
}

async function fetchWaterOzToday(): Promise<number | null> {
  const range = todayRange();
  const result = await aggregateRecord({
    recordType: "Hydration",
    timeRangeFilter: { operator: "between", ...range },
  });
  const n = finiteOrNull(result.VOLUME_TOTAL.inFluidOuncesUs);
  return n == null || n <= 0 ? null : Math.round(n);
}

async function fetchSleepHoursMinutes(): Promise<{
  hours: number;
  minutes: number;
} | null> {
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - 36 * 60 * 60 * 1000);
  const result = await aggregateRecord({
    recordType: "SleepSession",
    timeRangeFilter: {
      operator: "between",
      startTime: iso(windowStart),
      endTime: iso(windowEnd),
    },
  });
  const raw = finiteOrNull(result.SLEEP_DURATION_TOTAL);
  if (raw == null || raw <= 0) return null;
  // Health Connect Duration is seconds; treat values > 1e6 as milliseconds.
  const asleepMs = raw > 1_000_000 ? raw : raw * 1000;
  const totalMinutes = Math.round(asleepMs / 60_000);
  if (totalMinutes <= 0) return null;
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}

async function loadDashboardMetrics(): Promise<{
  metrics: DashboardHealthMetrics;
  connectivity: typeof NO_CONNECTIVITY;
}> {
  const [
    restingHeartRateBpm,
    weightLbs,
    steps,
    activeEnergyKcal,
    waterOz,
    sleep,
  ] = await Promise.all([
    fetchRestingHeartRateBpm().catch(() => null),
    fetchWeightLbs().catch(() => null),
    fetchStepsToday().catch(() => null),
    fetchActiveEnergyToday().catch(() => null),
    fetchWaterOzToday().catch(() => null),
    fetchSleepHoursMinutes().catch(() => null),
  ]);

  return {
    metrics: {
      restingHeartRateBpm:
        restingHeartRateBpm ?? EMPTY_DASHBOARD_METRICS.restingHeartRateBpm,
      weightLbs: weightLbs ?? EMPTY_DASHBOARD_METRICS.weightLbs,
      steps: steps ?? EMPTY_DASHBOARD_METRICS.steps,
      activeEnergyKcal:
        activeEnergyKcal ?? EMPTY_DASHBOARD_METRICS.activeEnergyKcal,
      sleepHours: sleep?.hours ?? EMPTY_DASHBOARD_METRICS.sleepHours,
      sleepMinutes: sleep?.minutes ?? EMPTY_DASHBOARD_METRICS.sleepMinutes,
      waterOz: waterOz ?? EMPTY_DASHBOARD_METRICS.waterOz,
    },
    connectivity: {
      restingHeartRateBpm: restingHeartRateBpm != null,
      weightLbs: weightLbs != null,
      steps: steps != null,
      activeEnergyKcal: activeEnergyKcal != null,
      sleep: sleep != null,
      waterOz: waterOz != null,
    },
  };
}

type ContributorAgg = {
  id: string;
  displayTitle: string;
  subtitle?: string;
  lastSeenAtMs: number;
};

function mergeContributor(
  map: Map<string, ContributorAgg>,
  origin: string | undefined,
  manufacturer: string | undefined,
  model: string | undefined,
  at: Date,
): void {
  const lastSeenAtMs = at.getTime();
  if (!Number.isFinite(lastSeenAtMs)) return;
  const id = origin ?? `${manufacturer ?? ""}:${model ?? ""}`;
  if (!id) return;
  const displayTitle =
    manufacturer && model
      ? `${manufacturer} ${model}`
      : model || originLabel(origin);
  const subtitle =
    manufacturer && model ? originLabel(origin) : undefined;
  const prev = map.get(id);
  if (!prev) {
    map.set(id, { id, displayTitle, subtitle, lastSeenAtMs });
    return;
  }
  map.set(id, {
    ...prev,
    lastSeenAtMs: Math.max(prev.lastSeenAtMs, lastSeenAtMs),
  });
}

function parseTime(value: string | undefined): Date {
  const d = value ? new Date(value) : new Date(NaN);
  return d;
}

async function loadHealthConnectContributors(): Promise<
  HealthDataContributor[]
> {
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - CONTRIBUTOR_WINDOW_MS);
  const filter = {
    timeRangeFilter: {
      operator: "between" as const,
      startTime: iso(windowStart),
      endTime: iso(windowEnd),
    },
    pageSize: 28,
    ascendingOrder: false,
  };

  const [steps, resting, weight, sleep] = await Promise.all([
    readRecords("Steps", filter).catch(() => ({ records: [] })),
    readRecords("RestingHeartRate", filter).catch(() => ({ records: [] })),
    readRecords("Weight", filter).catch(() => ({ records: [] })),
    readRecords("SleepSession", filter).catch(() => ({ records: [] })),
  ]);

  const map = new Map<string, ContributorAgg>();

  for (const r of steps.records) {
    mergeContributor(
      map,
      r.metadata?.dataOrigin,
      r.metadata?.device?.manufacturer,
      r.metadata?.device?.model,
      parseTime(r.startTime),
    );
  }
  for (const r of resting.records) {
    mergeContributor(
      map,
      r.metadata?.dataOrigin,
      r.metadata?.device?.manufacturer,
      r.metadata?.device?.model,
      parseTime(r.time),
    );
  }
  for (const r of weight.records) {
    mergeContributor(
      map,
      r.metadata?.dataOrigin,
      r.metadata?.device?.manufacturer,
      r.metadata?.device?.model,
      parseTime(r.time),
    );
  }
  for (const r of sleep.records) {
    mergeContributor(
      map,
      r.metadata?.dataOrigin,
      r.metadata?.device?.manufacturer,
      r.metadata?.device?.model,
      parseTime(r.startTime),
    );
  }

  return [...map.values()]
    .sort((a, b) => b.lastSeenAtMs - a.lastSeenAtMs)
    .slice(0, MAX_CONTRIBUTORS_SHOWN)
    .map((row) => ({
      id: row.id,
      displayTitle: row.displayTitle,
      subtitle: row.subtitle,
      lastSeenAt: new Date(row.lastSeenAtMs),
    }));
}

export function useDashboardHealthMetrics(): DashboardHealthMetricsHookValue {
  const [metrics, setMetrics] = useState<DashboardHealthMetrics>(
    EMPTY_DASHBOARD_METRICS,
  );
  const [connectivity, setConnectivity] = useState(NO_CONNECTIVITY);
  const [isLoading, setIsLoading] = useState(true);
  const [healthDataAvailable, setHealthDataAvailable] = useState<
    boolean | null
  >(null);
  const [authorizationRequestStatus, setAuthorizationRequestStatus] =
    useState<HealthAuthorizationStatus | null>(null);
  const [healthContributors, setHealthContributors] = useState<
    readonly HealthDataContributor[]
  >([]);

  const hasPromptedAuthRef = useRef(false);

  const openHealthSettings = useCallback(() => {
    openHealthConnectSettings();
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const sdkStatus = await getSdkStatus().catch(() => 0);
      const available = sdkStatus === SdkAvailabilityStatus.SDK_AVAILABLE;
      setHealthDataAvailable(available);
      if (!available) {
        setMetrics(EMPTY_DASHBOARD_METRICS);
        setConnectivity(NO_CONNECTIVITY);
        setHealthContributors([]);
        setAuthorizationRequestStatus("unavailable");
        return;
      }

      const initialized = await initialize().catch(() => false);
      if (!initialized) {
        setMetrics(EMPTY_DASHBOARD_METRICS);
        setConnectivity(NO_CONNECTIVITY);
        setHealthContributors([]);
        setAuthorizationRequestStatus("unavailable");
        return;
      }

      let granted: { accessType?: string; recordType?: string }[] =
        await getGrantedPermissions().catch(() => []);
      if (!allReadGranted(granted) && !hasPromptedAuthRef.current) {
        hasPromptedAuthRef.current = true;
        setAuthorizationRequestStatus("shouldRequest");
        granted = await requestPermission(READ_PERMISSIONS).catch(() => []);
      }

      if (!allReadGranted(granted) && granted.length === 0) {
        setAuthorizationRequestStatus("shouldRequest");
        setMetrics(EMPTY_DASHBOARD_METRICS);
        setConnectivity(NO_CONNECTIVITY);
        setHealthContributors([]);
        return;
      }

      setAuthorizationRequestStatus(
        allReadGranted(granted) ? "unnecessary" : "shouldRequest",
      );

      const next = await loadDashboardMetrics();
      setMetrics(next.metrics);
      setConnectivity(next.connectivity);
      const contributorsNext = await loadHealthConnectContributors().catch(
        () => [],
      );
      setHealthContributors(contributorsNext);
    } catch {
      setMetrics(EMPTY_DASHBOARD_METRICS);
      setConnectivity(NO_CONNECTIVITY);
      setHealthContributors([]);
      setAuthorizationRequestStatus("unavailable");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return {
    metrics,
    connectivity,
    isLoading,
    healthDataAvailable,
    authorizationRequestStatus,
    healthContributors,
    healthPlatform: "health-connect",
    openHealthSettings,
  };
}
