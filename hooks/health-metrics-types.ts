/** Shared dashboard health types used by iOS (HealthKit) and Android (Health Connect). */

export type DashboardHealthMetrics = {
  restingHeartRateBpm: number;
  weightLbs: number;
  steps: number;
  activeEnergyKcal: number;
  sleepHours: number;
  sleepMinutes: number;
  waterOz: number;
};

/** Empty metrics when a health source is unavailable, denied, or a query fails. Never fake numbers. */
export const EMPTY_DASHBOARD_METRICS: DashboardHealthMetrics = {
  restingHeartRateBpm: 0,
  weightLbs: 0,
  steps: 0,
  activeEnergyKcal: 0,
  sleepHours: 0,
  sleepMinutes: 0,
  waterOz: 0,
};

/** True when the metric was sourced from the platform health store; false when disconnected. */
export type DashboardHealthConnectivity = {
  restingHeartRateBpm: boolean;
  weightLbs: boolean;
  steps: boolean;
  activeEnergyKcal: boolean;
  sleep: boolean;
  waterOz: boolean;
};

export const NO_CONNECTIVITY: DashboardHealthConnectivity = {
  restingHeartRateBpm: false,
  weightLbs: false,
  steps: false,
  activeEnergyKcal: false,
  sleep: false,
  waterOz: false,
};

/**
 * Permission / availability summary for Settings.
 * Mirrors HealthKit's request-status shape so the same UI can serve Health Connect.
 */
export type HealthAuthorizationStatus =
  | "unavailable"
  | "shouldRequest"
  | "unnecessary";

export type HealthPlatform = "apple-health" | "health-connect" | "none";

/** Apps/devices inferred from recent samples (not a system pairing list). */
export type HealthDataContributor = {
  readonly id: string;
  /** Human-friendly device or app name for the card title. */
  readonly displayTitle: string;
  /** Optional second line (e.g. watchOS / Wear OS version, or app name). */
  readonly subtitle?: string;
  readonly lastSeenAt: Date;
};

/** @deprecated Use HealthDataContributor. Kept so older imports keep typechecking. */
export type HealthKitDataContributor = HealthDataContributor;

export type DashboardHealthMetricsHookValue = {
  metrics: DashboardHealthMetrics;
  connectivity: DashboardHealthConnectivity;
  isLoading: boolean;
  healthDataAvailable: boolean | null;
  authorizationRequestStatus: HealthAuthorizationStatus | null;
  healthContributors: readonly HealthDataContributor[];
  healthPlatform: HealthPlatform;
  openHealthSettings: () => void;
};
