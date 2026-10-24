import {
  SdkAvailabilityStatus,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  readRecords,
} from "react-native-health-connect";

import type { WeightUnit } from "@/lib/db";

import type { HealthWeightSample } from "./health-weight-samples";

export type { HealthWeightSample } from "./health-weight-samples";

const MAX_SAMPLES = 500;

/**
 * Health Connect weight readings since `since` (oldest first), in `unit`.
 * Empty when Health Connect is unavailable or read access was not granted.
 * Permission prompting is owned by `useDashboardHealthMetrics`.
 */
export async function fetchHealthWeightSamples(
  since: Date,
  unit: WeightUnit,
): Promise<HealthWeightSample[]> {
  const status = await getSdkStatus().catch(() => 0);
  if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) return [];
  if (!(await initialize().catch(() => false))) return [];
  const granted = await getGrantedPermissions().catch(() => []);
  const canRead = granted.some(
    (p) => p.accessType === "read" && p.recordType === "Weight",
  );
  if (!canRead) return [];

  const { records } = await readRecords("Weight", {
    timeRangeFilter: {
      operator: "between",
      startTime: since.toISOString(),
      endTime: new Date().toISOString(),
    },
    ascendingOrder: true,
    pageSize: MAX_SAMPLES,
  }).catch(() => ({ records: [] }));

  return records.flatMap((r) => {
    const id = r.metadata?.id;
    const value = unit === "kg" ? r.weight.inKilograms : r.weight.inPounds;
    if (!id || !Number.isFinite(value) || value <= 0) return [];
    return [{ uuid: id.toLowerCase(), value, startDate: new Date(r.time) }];
  });
}
