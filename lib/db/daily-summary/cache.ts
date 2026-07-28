import type { SQLiteDatabase } from "expo-sqlite";

import type { WaterUnit, WeightUnit } from "../daily-goals/types";
import { WATER_UNITS, WEIGHT_UNITS } from "../daily-goals/types";
import { ensureDailySummarySchema } from "../migrations";
import {
  DAILY_SUMMARY_GOAL_KEYS,
  type DailySummary,
  type DailySummaryGoalKey,
} from "./types";

type DailySummaryRow = {
  dayKey: string;
  foodKcal: number;
  waterAmount: number;
  trainMinutes: number;
  sleepHours: number;
  steps: number;
  activeKcal: number;
  weight: number | null;
  waterUnit: string;
  weightUnit: string;
  goalsMet_json: string;
  updatedAt: string;
};

function isWaterUnit(value: string): value is WaterUnit {
  return (WATER_UNITS as readonly string[]).includes(value);
}

function isWeightUnit(value: string): value is WeightUnit {
  return (WEIGHT_UNITS as readonly string[]).includes(value);
}

function parseGoalsMet(json: string): DailySummaryGoalKey[] {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    const allowed = new Set<string>(DAILY_SUMMARY_GOAL_KEYS);
    return parsed.filter(
      (item): item is DailySummaryGoalKey =>
        typeof item === "string" && allowed.has(item),
    );
  } catch {
    return [];
  }
}

export function mapDailySummaryRow(row: DailySummaryRow): DailySummary | null {
  if (!isWaterUnit(row.waterUnit) || !isWeightUnit(row.weightUnit)) {
    return null;
  }
  return {
    dayKey: row.dayKey,
    foodKcal: row.foodKcal,
    waterAmount: row.waterAmount,
    trainMinutes: row.trainMinutes,
    sleepHours: row.sleepHours,
    steps: row.steps,
    activeKcal: row.activeKcal,
    weight: row.weight,
    waterUnit: row.waterUnit,
    weightUnit: row.weightUnit,
    goalsMet: parseGoalsMet(row.goalsMet_json),
    updatedAt: row.updatedAt,
  };
}

/** Read cached row only — does not recompute. */
export async function getCachedDailySummary(
  db: SQLiteDatabase,
  dayKey: string,
): Promise<DailySummary | null> {
  await ensureDailySummarySchema(db);
  const row = await db.getFirstAsync<DailySummaryRow>(
    `SELECT dayKey, foodKcal, waterAmount, trainMinutes, sleepHours, steps,
            activeKcal, weight, waterUnit, weightUnit, goalsMet_json, updatedAt
     FROM daily_summary WHERE dayKey = ?`,
    dayKey,
  );
  return row == null ? null : mapDailySummaryRow(row);
}

export async function upsertCachedDailySummary(
  db: SQLiteDatabase,
  summary: DailySummary,
): Promise<void> {
  await ensureDailySummarySchema(db);
  await db.runAsync(
    `INSERT INTO daily_summary (
      dayKey, foodKcal, waterAmount, trainMinutes, sleepHours, steps,
      activeKcal, weight, waterUnit, weightUnit, goalsMet_json, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(dayKey) DO UPDATE SET
      foodKcal = excluded.foodKcal,
      waterAmount = excluded.waterAmount,
      trainMinutes = excluded.trainMinutes,
      sleepHours = excluded.sleepHours,
      steps = excluded.steps,
      activeKcal = excluded.activeKcal,
      weight = excluded.weight,
      waterUnit = excluded.waterUnit,
      weightUnit = excluded.weightUnit,
      goalsMet_json = excluded.goalsMet_json,
      updatedAt = excluded.updatedAt`,
    summary.dayKey,
    summary.foodKcal,
    summary.waterAmount,
    summary.trainMinutes,
    summary.sleepHours,
    summary.steps,
    summary.activeKcal,
    summary.weight,
    summary.waterUnit,
    summary.weightUnit,
    JSON.stringify(summary.goalsMet),
    summary.updatedAt,
  );
}

/**
 * Drop cached row so the next read recomputes from habit_logs.
 * Kept in this file (no habit-log imports) so writers can invalidate safely.
 */
export async function invalidateDailySummary(
  db: SQLiteDatabase,
  dayKey: string,
): Promise<void> {
  await ensureDailySummarySchema(db);
  await db.runAsync(`DELETE FROM daily_summary WHERE dayKey = ?`, dayKey);
}
