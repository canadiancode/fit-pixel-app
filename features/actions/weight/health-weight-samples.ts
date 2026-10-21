import type { WeightUnit } from "@/lib/db";

export type HealthWeightSample = {
  /** Apple Health sample UUID (lowercased); reused as the habit log id. */
  uuid: string;
  value: number;
  startDate: Date;
};

/** Apple Health is iOS-only; other platforms have no connected weight yet. */
export async function fetchHealthWeightSamples(
  _since: Date,
  _unit: WeightUnit,
): Promise<HealthWeightSample[]> {
  return [];
}
