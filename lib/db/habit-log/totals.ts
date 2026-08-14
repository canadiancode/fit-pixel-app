import type { SQLiteDatabase } from "expo-sqlite";

import type { WaterUnit, WeightUnit } from "../daily-goals/types";
import { getTodayDayKey } from "../day-boundary/store";
import { listHabitLogsForDay } from "./store";
import type {
  ActiveKcalHabitPayload,
  FoodHabitPayload,
  HabitLog,
  SleepHabitPayload,
  StepsHabitPayload,
  TrainHabitPayload,
  WaterHabitPayload,
  WeightHabitPayload,
} from "./types";
import { convertWaterAmount, convertWeightValue } from "./units";

/**
 * Derived day totals for Actions progress bars / charts.
 * SECURITY: never enqueueOp these — recompute from habit_logs facts.
 */
export type HabitDayTotals = {
  foodKcal: number;
  waterAmount: number;
  trainMinutes: number;
  sleepHours: number;
  steps: number;
  activeKcal: number;
  /** Latest weight log for the day, converted to `weightUnit` (omit if none). */
  weight?: number;
};

export type HabitDayTotalsOptions = {
  /** Goal / display unit — water logs are converted into this unit once on read. */
  waterUnit: WaterUnit;
  weightUnit: WeightUnit;
};

const EMPTY_TOTALS: HabitDayTotals = {
  foodKcal: 0,
  waterAmount: 0,
  trainMinutes: 0,
  sleepHours: 0,
  steps: 0,
  activeKcal: 0,
};

/**
 * Lazy aggregate for one dayKey (Phase 3 strategy B).
 * Deterministic from habit facts — safe to feed goal % and later XP bonuses.
 */
export async function getHabitTotalsForDayKey(
  db: SQLiteDatabase,
  dayKey: string,
  options: HabitDayTotalsOptions,
): Promise<HabitDayTotals> {
  const logs = await listHabitLogsForDay(db, dayKey);
  return aggregateHabitLogs(logs, options);
}

export async function getTodayHabitTotals(
  db: SQLiteDatabase,
  options: HabitDayTotalsOptions,
  now: Date = new Date(),
): Promise<HabitDayTotals> {
  const dayKey = await getTodayDayKey(db, now);
  return getHabitTotalsForDayKey(db, dayKey, options);
}

/**
 * Most recent weight log in any day, converted to `weightUnit`.
 * Weight is long-term — it carries forward rather than resetting daily.
 */
export async function getLatestWeightValue(
  db: SQLiteDatabase,
  weightUnit: WeightUnit,
): Promise<number | undefined> {
  type WeightRow = {
    payload_json: string;
  };

  const rows = await db.getAllAsync<WeightRow>(
    `SELECT payload_json
     FROM habit_logs
     WHERE type = 'weight'
     ORDER BY timestamp DESC, createdAt DESC
     LIMIT 8`,
  );

  for (const row of rows) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(row.payload_json);
    } catch {
      continue;
    }
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      continue;
    }
    const payload = parsed as WeightHabitPayload;
    if (
      typeof payload.value !== "number" ||
      !Number.isFinite(payload.value) ||
      (payload.unit !== "lb" && payload.unit !== "kg")
    ) {
      continue;
    }
    return convertWeightValue(payload.value, payload.unit, weightUnit);
  }
  return undefined;
}

export function aggregateHabitLogs(
  logs: HabitLog[],
  options: HabitDayTotalsOptions,
): HabitDayTotals {
  let foodKcal = 0;
  let waterAmount = 0;
  let trainMinutes = 0;
  let sleepHours = 0;
  let steps = 0;
  let activeKcal = 0;
  let latestWeight: {
    value: number;
    timestamp: string;
    createdAt: string;
  } | null = null;

  for (const log of logs) {
    switch (log.type) {
      case "water": {
        const payload = log.payload as WaterHabitPayload;
        waterAmount += convertWaterAmount(
          payload.amount,
          payload.unit,
          options.waterUnit,
        );
        break;
      }
      case "food": {
        const payload = log.payload as FoodHabitPayload;
        foodKcal += payload.kcal;
        break;
      }
      case "train": {
        const payload = log.payload as TrainHabitPayload;
        trainMinutes += payload.durationMin;
        break;
      }
      case "sleep": {
        const payload = log.payload as SleepHabitPayload;
        sleepHours += payload.durationHours;
        break;
      }
      case "steps": {
        const payload = log.payload as StepsHabitPayload;
        steps += payload.steps;
        break;
      }
      case "active_kcal": {
        const payload = log.payload as ActiveKcalHabitPayload;
        activeKcal += payload.kcal;
        break;
      }
      case "weight": {
        const payload = log.payload as WeightHabitPayload;
        const isNewer =
          latestWeight == null ||
          log.timestamp > latestWeight.timestamp ||
          (log.timestamp === latestWeight.timestamp &&
            log.createdAt > latestWeight.createdAt);
        if (isNewer) {
          latestWeight = {
            value: convertWeightValue(
              payload.value,
              payload.unit,
              options.weightUnit,
            ),
            timestamp: log.timestamp,
            createdAt: log.createdAt,
          };
        }
        break;
      }
      default:
        break;
    }
  }

  const totals: HabitDayTotals = {
    ...EMPTY_TOTALS,
    foodKcal,
    waterAmount,
    trainMinutes,
    sleepHours,
    steps,
    activeKcal,
  };
  if (latestWeight != null) {
    totals.weight = latestWeight.value;
  }
  return totals;
}
