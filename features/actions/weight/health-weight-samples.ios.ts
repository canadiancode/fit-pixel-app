import {
  isHealthDataAvailableAsync,
  queryQuantitySamples,
} from "@kingstinct/react-native-healthkit";

import type { WeightUnit } from "@/lib/db";

import type { HealthWeightSample } from "./health-weight-samples";

export type { HealthWeightSample } from "./health-weight-samples";

const MAX_SAMPLES = 500;

/**
 * Apple Health body-mass readings since `since` (oldest first), in `unit`.
 * Empty when Health is unavailable or read access was not granted.
 */
export async function fetchHealthWeightSamples(
  since: Date,
  unit: WeightUnit,
): Promise<HealthWeightSample[]> {
  const available = await isHealthDataAvailableAsync().catch(() => false);
  if (!available) return [];
  const samples = await queryQuantitySamples(
    "HKQuantityTypeIdentifierBodyMass",
    {
      limit: MAX_SAMPLES,
      ascending: true,
      unit,
      filter: { date: { startDate: since, endDate: new Date() } },
    },
  ).catch(() => []);
  return samples
    .filter((s) => Number.isFinite(s.quantity) && s.quantity > 0)
    .map((s) => ({
      uuid: s.uuid.toLowerCase(),
      value: s.quantity,
      startDate: new Date(s.startDate),
    }));
}
