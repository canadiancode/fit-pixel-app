import type { WaterUnit, WeightUnit } from "../daily-goals/types";

/** Approx. US fluid ounce → milliliters (convert once at read or write, never both). */
const ML_PER_OZ = 29.5735295625;
const KG_PER_LB = 0.45359237;

export function convertWaterAmount(
  amount: number,
  from: WaterUnit,
  to: WaterUnit,
): number {
  if (from === to) return amount;
  if (from === "oz" && to === "ml") return amount * ML_PER_OZ;
  return amount / ML_PER_OZ;
}

export function convertWeightValue(
  value: number,
  from: WeightUnit,
  to: WeightUnit,
): number {
  if (from === to) return value;
  if (from === "lb" && to === "kg") return value * KG_PER_LB;
  return value / KG_PER_LB;
}
