import type { SQLiteDatabase } from "expo-sqlite";

import { nowIso } from "../ids";
import { enqueueOp } from "../pending-ops";
import { DAILY_GOAL_LIMITS, waterAmountLimits, weightGoalLimits } from "./limits";
import {
  DEFAULT_DAILY_GOALS,
  WATER_UNITS,
  WEIGHT_UNITS,
  type DailyGoals,
  type DailyGoalsUpdate,
  type WaterUnit,
  type WeightUnit,
} from "./types";

type DailyGoalsRow = {
  foodKcal: number;
  waterAmount: number;
  waterUnit: string;
  trainMinutes: number;
  sleepHours: number;
  steps: number;
  activeKcal: number;
  weightGoal: number;
  weightUnit: string;
  updatedAt: string;
};

function mapRow(row: DailyGoalsRow): DailyGoals {
  return {
    foodKcal: row.foodKcal,
    waterAmount: row.waterAmount,
    waterUnit: row.waterUnit as WaterUnit,
    trainMinutes: row.trainMinutes,
    sleepHours: row.sleepHours,
    steps: row.steps,
    activeKcal: row.activeKcal,
    weightGoal: row.weightGoal,
    weightUnit: row.weightUnit as WeightUnit,
    updatedAt: row.updatedAt,
  };
}

function assertInRange(
  field: string,
  value: number,
  min: number,
  max: number,
  opts?: { integer?: boolean },
): number {
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    throw new Error(`${field} must be a finite number (got ${value})`);
  }
  if (opts?.integer && !Number.isInteger(value)) {
    throw new Error(`${field} must be an integer (got ${value})`);
  }
  if (value < min || value > max) {
    throw new Error(`${field} must be between ${min} and ${max} (got ${value})`);
  }
  return value;
}

function assertWaterUnit(value: string): WaterUnit {
  if (!(WATER_UNITS as readonly string[]).includes(value)) {
    throw new Error(`waterUnit must be one of ${WATER_UNITS.join(", ")}`);
  }
  return value as WaterUnit;
}

function assertWeightUnit(value: string): WeightUnit {
  if (!(WEIGHT_UNITS as readonly string[]).includes(value)) {
    throw new Error(`weightUnit must be one of ${WEIGHT_UNITS.join(", ")}`);
  }
  return value as WeightUnit;
}

function normalizeUpdate(
  current: DailyGoals,
  update: DailyGoalsUpdate,
): Omit<DailyGoals, "updatedAt"> {
  const waterUnit = assertWaterUnit(update.waterUnit ?? current.waterUnit);
  const weightUnit = assertWeightUnit(update.weightUnit ?? current.weightUnit);
  const waterRange = waterAmountLimits(waterUnit);
  const weightRange = weightGoalLimits(weightUnit);

  return {
    foodKcal: assertInRange(
      "foodKcal",
      update.foodKcal ?? current.foodKcal,
      DAILY_GOAL_LIMITS.foodKcal.min,
      DAILY_GOAL_LIMITS.foodKcal.max,
    ),
    waterAmount: assertInRange(
      "waterAmount",
      update.waterAmount ?? current.waterAmount,
      waterRange.min,
      waterRange.max,
    ),
    waterUnit,
    trainMinutes: assertInRange(
      "trainMinutes",
      update.trainMinutes ?? current.trainMinutes,
      DAILY_GOAL_LIMITS.trainMinutes.min,
      DAILY_GOAL_LIMITS.trainMinutes.max,
    ),
    sleepHours: assertInRange(
      "sleepHours",
      update.sleepHours ?? current.sleepHours,
      DAILY_GOAL_LIMITS.sleepHours.min,
      DAILY_GOAL_LIMITS.sleepHours.max,
    ),
    steps: assertInRange(
      "steps",
      update.steps ?? current.steps,
      DAILY_GOAL_LIMITS.steps.min,
      DAILY_GOAL_LIMITS.steps.max,
      { integer: true },
    ),
    activeKcal: assertInRange(
      "activeKcal",
      update.activeKcal ?? current.activeKcal,
      DAILY_GOAL_LIMITS.activeKcal.min,
      DAILY_GOAL_LIMITS.activeKcal.max,
    ),
    weightGoal: assertInRange(
      "weightGoal",
      update.weightGoal ?? current.weightGoal,
      weightRange.min,
      weightRange.max,
    ),
    weightUnit,
  };
}

function goalsEqual(
  a: Omit<DailyGoals, "updatedAt">,
  b: Omit<DailyGoals, "updatedAt">,
): boolean {
  return (
    a.foodKcal === b.foodKcal &&
    a.waterAmount === b.waterAmount &&
    a.waterUnit === b.waterUnit &&
    a.trainMinutes === b.trainMinutes &&
    a.sleepHours === b.sleepHours &&
    a.steps === b.steps &&
    a.activeKcal === b.activeKcal &&
    a.weightGoal === b.weightGoal &&
    a.weightUnit === b.weightUnit
  );
}

async function seedDailyGoalsIfNeeded(db: SQLiteDatabase): Promise<DailyGoals> {
  const updatedAt = nowIso();
  await db.runAsync(
    `INSERT OR IGNORE INTO daily_goals (
      id, foodKcal, waterAmount, waterUnit, trainMinutes, sleepHours,
      steps, activeKcal, weightGoal, weightUnit, updatedAt
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    DEFAULT_DAILY_GOALS.foodKcal,
    DEFAULT_DAILY_GOALS.waterAmount,
    DEFAULT_DAILY_GOALS.waterUnit,
    DEFAULT_DAILY_GOALS.trainMinutes,
    DEFAULT_DAILY_GOALS.sleepHours,
    DEFAULT_DAILY_GOALS.steps,
    DEFAULT_DAILY_GOALS.activeKcal,
    DEFAULT_DAILY_GOALS.weightGoal,
    DEFAULT_DAILY_GOALS.weightUnit,
    updatedAt,
  );

  const row = await db.getFirstAsync<DailyGoalsRow>(
    `SELECT foodKcal, waterAmount, waterUnit, trainMinutes, sleepHours,
            steps, activeKcal, weightGoal, weightUnit, updatedAt
     FROM daily_goals WHERE id = 1`,
  );
  if (row == null) {
    throw new Error("daily_goals singleton missing after seed");
  }
  return mapRow(row);
}

/** Load goal targets (seeds Action-matching defaults on first read). */
export async function getDailyGoals(db: SQLiteDatabase): Promise<DailyGoals> {
  const row = await db.getFirstAsync<DailyGoalsRow>(
    `SELECT foodKcal, waterAmount, waterUnit, trainMinutes, sleepHours,
            steps, activeKcal, weightGoal, weightUnit, updatedAt
     FROM daily_goals WHERE id = 1`,
  );
  if (row != null) {
    return mapRow(row);
  }
  return seedDailyGoalsIfNeeded(db);
}

/**
 * Partial update of goal targets. Enqueues a `daily_goals` fact for later sync.
 * Day boundary changes belong on `setDayBoundary`, not here.
 *
 * SECURITY: rejects NaN / non-finite / out-of-range values (see DAILY_GOAL_LIMITS).
 */
export async function setDailyGoals(
  db: SQLiteDatabase,
  update: DailyGoalsUpdate,
): Promise<DailyGoals> {
  const current = await getDailyGoals(db);
  const nextFields = normalizeUpdate(current, update);

  if (goalsEqual(nextFields, current)) {
    return current;
  }

  const updatedAt = nowIso();
  await db.runAsync(
    `UPDATE daily_goals SET
      foodKcal = ?, waterAmount = ?, waterUnit = ?, trainMinutes = ?,
      sleepHours = ?, steps = ?, activeKcal = ?, weightGoal = ?,
      weightUnit = ?, updatedAt = ?
     WHERE id = 1`,
    nextFields.foodKcal,
    nextFields.waterAmount,
    nextFields.waterUnit,
    nextFields.trainMinutes,
    nextFields.sleepHours,
    nextFields.steps,
    nextFields.activeKcal,
    nextFields.weightGoal,
    nextFields.weightUnit,
    updatedAt,
  );

  const next: DailyGoals = { ...nextFields, updatedAt };

  await enqueueOp(
    db,
    "daily_goals",
    {
      foodKcal: next.foodKcal,
      waterAmount: next.waterAmount,
      waterUnit: next.waterUnit,
      trainMinutes: next.trainMinutes,
      sleepHours: next.sleepHours,
      steps: next.steps,
      activeKcal: next.activeKcal,
      weightGoal: next.weightGoal,
      weightUnit: next.weightUnit,
      updatedAt: next.updatedAt,
    },
    { clientClockAt: updatedAt },
  );

  return next;
}
