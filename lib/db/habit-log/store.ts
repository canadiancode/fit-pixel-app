import type { SQLiteDatabase } from "expo-sqlite";

import type { WaterUnit, WeightUnit } from "../daily-goals/types";
import { WATER_UNITS, WEIGHT_UNITS } from "../daily-goals/types";
import { invalidateDailySummary } from "../daily-summary/cache";
import { getAppDayKey } from "../day-boundary/day-key";
import { getDayBoundary } from "../day-boundary/store";
import { newLocalRecord, nowIso } from "../ids";
import { enqueueOp } from "../pending-ops";
import { awardXp } from "../xp/store";
import { XP_PER_HABIT_LOG } from "../xp/amounts";
import {
  HABIT_LOG_LIMITS,
  waterHabitAmountLimits,
  weightHabitValueLimits,
} from "./limits";
import {
  FOOD_MEAL_TYPES,
  HABIT_LOG_SOURCES,
  HABIT_LOG_TYPES,
  type ActiveKcalHabitPayload,
  type FoodHabitPayload,
  type FoodMealType,
  type HabitLog,
  type HabitLogInsertInput,
  type HabitLogPayloadByType,
  type HabitLogSource,
  type HabitLogType,
  type SleepHabitPayload,
  type StepsHabitPayload,
  type TrainHabitPayload,
  type WaterHabitPayload,
  type WeightHabitPayload,
} from "./types";

type HabitLogRow = {
  id: string;
  type: string;
  timestamp: string;
  createdAt: string;
  source: string;
  notes: string | null;
  dayKey: string;
  payload_json: string;
};

function assertFinite(
  field: string,
  value: number,
  opts?: { integer?: boolean },
): number {
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    throw new Error(`${field} must be a finite number (got ${value})`);
  }
  if (opts?.integer && !Number.isInteger(value)) {
    throw new Error(`${field} must be an integer (got ${value})`);
  }
  return value;
}

function assertAbsInRange(
  field: string,
  value: number,
  minAbs: number,
  maxAbs: number,
  opts?: { integer?: boolean },
): number {
  const n = assertFinite(field, value, opts);
  const abs = Math.abs(n);
  if (abs < minAbs || abs > maxAbs) {
    throw new Error(
      `${field} magnitude must be between ${minAbs} and ${maxAbs} (got ${n})`,
    );
  }
  if (n === 0) {
    throw new Error(`${field} must be non-zero`);
  }
  return n;
}

function assertInRange(
  field: string,
  value: number,
  min: number,
  max: number,
  opts?: { integer?: boolean },
): number {
  const n = assertFinite(field, value, opts);
  if (n < min || n > max) {
    throw new Error(`${field} must be between ${min} and ${max} (got ${n})`);
  }
  return n;
}

function assertHabitType(value: string): HabitLogType {
  if (!(HABIT_LOG_TYPES as readonly string[]).includes(value)) {
    throw new Error(`habit type must be one of ${HABIT_LOG_TYPES.join(", ")}`);
  }
  return value as HabitLogType;
}

function assertSource(value: string): HabitLogSource {
  if (!(HABIT_LOG_SOURCES as readonly string[]).includes(value)) {
    throw new Error(
      `habit source must be one of ${HABIT_LOG_SOURCES.join(", ")}`,
    );
  }
  return value as HabitLogSource;
}

function assertWaterUnit(value: string): WaterUnit {
  if (!(WATER_UNITS as readonly string[]).includes(value)) {
    throw new Error(`water unit must be one of ${WATER_UNITS.join(", ")}`);
  }
  return value as WaterUnit;
}

function assertWeightUnit(value: string): WeightUnit {
  if (!(WEIGHT_UNITS as readonly string[]).includes(value)) {
    throw new Error(`weight unit must be one of ${WEIGHT_UNITS.join(", ")}`);
  }
  return value as WeightUnit;
}

function assertMealType(value: string | undefined): FoodMealType | undefined {
  if (value == null) return undefined;
  if (!(FOOD_MEAL_TYPES as readonly string[]).includes(value)) {
    throw new Error(`mealType must be one of ${FOOD_MEAL_TYPES.join(", ")}`);
  }
  return value as FoodMealType;
}

function assertOptionalNotes(notes: string | null | undefined): string | null {
  if (notes == null) return null;
  const trimmed = notes.trim();
  if (!trimmed) return null;
  if (trimmed.length > HABIT_LOG_LIMITS.foodNotesMaxLen) {
    throw new Error(
      `notes must be at most ${HABIT_LOG_LIMITS.foodNotesMaxLen} characters`,
    );
  }
  return trimmed;
}

function assertIsoTimestamp(value: string): string {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) {
    throw new Error(`timestamp must be a valid ISO-8601 string (got ${value})`);
  }
  return new Date(ms).toISOString();
}

function normalizeWaterPayload(raw: WaterHabitPayload): WaterHabitPayload {
  const unit = assertWaterUnit(raw.unit);
  const limits = waterHabitAmountLimits(unit);
  return {
    amount: assertAbsInRange(
      "water.amount",
      raw.amount,
      limits.minAbs,
      limits.maxAbs,
    ),
    unit,
  };
}

function normalizeFoodPayload(raw: FoodHabitPayload): FoodHabitPayload {
  const name = raw.name.trim();
  if (!name) {
    throw new Error("food.name must be a non-empty string");
  }
  if (name.length > HABIT_LOG_LIMITS.foodNameMaxLen) {
    throw new Error(
      `food.name must be at most ${HABIT_LOG_LIMITS.foodNameMaxLen} characters`,
    );
  }

  const mealType = assertMealType(raw.mealType);
  const portionSize =
    raw.portionSize == null ? undefined : raw.portionSize.trim() || undefined;
  if (
    portionSize != null &&
    portionSize.length > HABIT_LOG_LIMITS.foodPortionMaxLen
  ) {
    throw new Error(
      `food.portionSize must be at most ${HABIT_LOG_LIMITS.foodPortionMaxLen} characters`,
    );
  }

  const out: FoodHabitPayload = {
    name,
    kcal: assertInRange(
      "food.kcal",
      raw.kcal,
      HABIT_LOG_LIMITS.foodKcal.min,
      HABIT_LOG_LIMITS.foodKcal.max,
    ),
  };
  if (mealType != null) out.mealType = mealType;
  if (portionSize != null) out.portionSize = portionSize;
  if (raw.proteinG !== undefined) {
    out.proteinG = assertInRange(
      "food.proteinG",
      raw.proteinG,
      HABIT_LOG_LIMITS.foodMacroG.min,
      HABIT_LOG_LIMITS.foodMacroG.max,
    );
  }
  if (raw.carbsG !== undefined) {
    out.carbsG = assertInRange(
      "food.carbsG",
      raw.carbsG,
      HABIT_LOG_LIMITS.foodMacroG.min,
      HABIT_LOG_LIMITS.foodMacroG.max,
    );
  }
  if (raw.fatG !== undefined) {
    out.fatG = assertInRange(
      "food.fatG",
      raw.fatG,
      HABIT_LOG_LIMITS.foodMacroG.min,
      HABIT_LOG_LIMITS.foodMacroG.max,
    );
  }
  return out;
}

function normalizeTrainPayload(raw: TrainHabitPayload): TrainHabitPayload {
  const out: TrainHabitPayload = {
    durationMin: assertAbsInRange(
      "train.durationMin",
      raw.durationMin,
      HABIT_LOG_LIMITS.trainMinutes.minAbs,
      HABIT_LOG_LIMITS.trainMinutes.maxAbs,
    ),
  };
  if (raw.trainType != null) {
    const trainType = raw.trainType.trim();
    if (!trainType) {
      // omit empty
    } else if (trainType.length > HABIT_LOG_LIMITS.trainTypeMaxLen) {
      throw new Error(
        `train.trainType must be at most ${HABIT_LOG_LIMITS.trainTypeMaxLen} characters`,
      );
    } else {
      out.trainType = trainType;
    }
  }
  return out;
}

function normalizeSleepPayload(raw: SleepHabitPayload): SleepHabitPayload {
  return {
    durationHours: assertAbsInRange(
      "sleep.durationHours",
      raw.durationHours,
      HABIT_LOG_LIMITS.sleepHours.minAbs,
      HABIT_LOG_LIMITS.sleepHours.maxAbs,
    ),
  };
}

function normalizeWeightPayload(raw: WeightHabitPayload): WeightHabitPayload {
  const unit = assertWeightUnit(raw.unit);
  const limits = weightHabitValueLimits(unit);
  return {
    value: assertInRange("weight.value", raw.value, limits.min, limits.max),
    unit,
  };
}

function normalizeStepsPayload(raw: StepsHabitPayload): StepsHabitPayload {
  return {
    steps: assertAbsInRange(
      "steps.steps",
      raw.steps,
      HABIT_LOG_LIMITS.steps.minAbs,
      HABIT_LOG_LIMITS.steps.maxAbs,
      { integer: true },
    ),
  };
}

function normalizeActiveKcalPayload(
  raw: ActiveKcalHabitPayload,
): ActiveKcalHabitPayload {
  return {
    kcal: assertAbsInRange(
      "active_kcal.kcal",
      raw.kcal,
      HABIT_LOG_LIMITS.activeKcal.minAbs,
      HABIT_LOG_LIMITS.activeKcal.maxAbs,
    ),
  };
}

function normalizePayload<T extends HabitLogType>(
  type: T,
  payload: HabitLogPayloadByType[T],
): HabitLogPayloadByType[T] {
  switch (type) {
    case "water":
      return normalizeWaterPayload(
        payload as WaterHabitPayload,
      ) as HabitLogPayloadByType[T];
    case "food":
      return normalizeFoodPayload(
        payload as FoodHabitPayload,
      ) as HabitLogPayloadByType[T];
    case "train":
      return normalizeTrainPayload(
        payload as TrainHabitPayload,
      ) as HabitLogPayloadByType[T];
    case "sleep":
      return normalizeSleepPayload(
        payload as SleepHabitPayload,
      ) as HabitLogPayloadByType[T];
    case "weight":
      return normalizeWeightPayload(
        payload as WeightHabitPayload,
      ) as HabitLogPayloadByType[T];
    case "steps":
      return normalizeStepsPayload(
        payload as StepsHabitPayload,
      ) as HabitLogPayloadByType[T];
    case "active_kcal":
      return normalizeActiveKcalPayload(
        payload as ActiveKcalHabitPayload,
      ) as HabitLogPayloadByType[T];
    default: {
      const _exhaustive: never = type;
      void _exhaustive;
      throw new Error(`Unsupported habit type: ${String(type)}`);
    }
  }
}

function mapRow<T extends HabitLogType>(row: HabitLogRow): HabitLog<T> {
  const type = assertHabitType(row.type) as T;
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.payload_json);
  } catch {
    throw new Error(`habit_logs ${row.id}: invalid payload_json`);
  }
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`habit_logs ${row.id}: payload_json must be an object`);
  }
  return {
    id: row.id,
    createdAt: row.createdAt,
    type,
    timestamp: row.timestamp,
    source: assertSource(row.source),
    notes: row.notes,
    dayKey: row.dayKey,
    payload: parsed as HabitLogPayloadByType[T],
  };
}

function habitLogToEnqueuePayload(log: HabitLog): Record<string, unknown> {
  return {
    id: log.id,
    type: log.type,
    timestamp: log.timestamp,
    createdAt: log.createdAt,
    source: log.source,
    notes: log.notes,
    dayKey: log.dayKey,
    payload: log.payload,
  };
}

/**
 * Single write API for habit facts: validate → insert → enqueueOp("habit_log").
 * Op id = habit id (stable idempotency key). Payload is append-only after enqueue.
 *
 * SECURITY: source is client-asserted; notes are PII; ranges clamped here.
 */
export async function insertHabitLog<T extends HabitLogType>(
  db: SQLiteDatabase,
  input: HabitLogInsertInput<T>,
): Promise<HabitLog<T>> {
  const type = assertHabitType(input.type) as T;
  const source = assertSource(input.source ?? "manual");
  const notes = assertOptionalNotes(input.notes);
  const timestamp = assertIsoTimestamp(input.timestamp ?? nowIso());
  const payload = normalizePayload(type, input.payload);

  const { id, createdAt } = newLocalRecord();
  const boundary = await getDayBoundary(db);
  const dayKey = getAppDayKey(new Date(timestamp), boundary);

  const log: HabitLog<T> = {
    id,
    createdAt,
    type,
    timestamp,
    source,
    notes,
    dayKey,
    payload,
  };

  const payload_json = JSON.stringify(payload);

  await db.runAsync(
    `INSERT INTO habit_logs (
      id, type, timestamp, createdAt, source, notes, dayKey, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    log.id,
    log.type,
    log.timestamp,
    log.createdAt,
    log.source,
    log.notes,
    log.dayKey,
    payload_json,
  );

  await enqueueOp(db, "habit_log", habitLogToEnqueuePayload(log), {
    id: log.id,
    clientClockAt: log.timestamp,
  });

  // Derived cache only — next chart/summary read recomputes from habit facts.
  await invalidateDailySummary(db, dayKey);

  // Local XP prototype — not enqueued; server will recompute from habit facts.
  await awardXp(db, {
    amount: XP_PER_HABIT_LOG,
    reason: "habit_log",
    relatedEntityId: log.id,
    dayKey: log.dayKey,
  });

  return log;
}

/** Convenience: log a water serving (amount may be negative for corrections). */
export async function logWater(
  db: SQLiteDatabase,
  input: {
    amount: number;
    unit: WaterUnit;
    timestamp?: string;
    source?: HabitLogSource;
    notes?: string | null;
  },
): Promise<HabitLog<"water">> {
  return insertHabitLog(db, {
    type: "water",
    payload: { amount: input.amount, unit: input.unit },
    timestamp: input.timestamp,
    source: input.source,
    notes: input.notes,
  });
}

export async function logFood(
  db: SQLiteDatabase,
  input: FoodHabitPayload & {
    timestamp?: string;
    source?: HabitLogSource;
    notes?: string | null;
  },
): Promise<HabitLog<"food">> {
  const { timestamp, source, notes, ...payload } = input;
  return insertHabitLog(db, {
    type: "food",
    payload,
    timestamp,
    source,
    notes,
  });
}

export async function logTrain(
  db: SQLiteDatabase,
  input: {
    durationMin: number;
    trainType?: string;
    timestamp?: string;
    source?: HabitLogSource;
    notes?: string | null;
  },
): Promise<HabitLog<"train">> {
  return insertHabitLog(db, {
    type: "train",
    payload: {
      durationMin: input.durationMin,
      trainType: input.trainType,
    },
    timestamp: input.timestamp,
    source: input.source,
    notes: input.notes,
  });
}

export async function logSleep(
  db: SQLiteDatabase,
  input: {
    /** Minutes from the Actions UI — converted to hours at write. */
    durationMin: number;
    timestamp?: string;
    source?: HabitLogSource;
    notes?: string | null;
  },
): Promise<HabitLog<"sleep">> {
  return insertHabitLog(db, {
    type: "sleep",
    payload: { durationHours: input.durationMin / 60 },
    timestamp: input.timestamp,
    source: input.source,
    notes: input.notes,
  });
}

export async function logWeight(
  db: SQLiteDatabase,
  input: {
    value: number;
    unit: WeightUnit;
    timestamp?: string;
    source?: HabitLogSource;
    notes?: string | null;
  },
): Promise<HabitLog<"weight">> {
  return insertHabitLog(db, {
    type: "weight",
    payload: { value: input.value, unit: input.unit },
    timestamp: input.timestamp,
    source: input.source,
    notes: input.notes,
  });
}

export async function logSteps(
  db: SQLiteDatabase,
  input: {
    steps: number;
    timestamp?: string;
    source?: HabitLogSource;
    notes?: string | null;
  },
): Promise<HabitLog<"steps">> {
  return insertHabitLog(db, {
    type: "steps",
    payload: { steps: input.steps },
    timestamp: input.timestamp,
    source: input.source,
    notes: input.notes,
  });
}

export async function logActiveKcal(
  db: SQLiteDatabase,
  input: {
    kcal: number;
    timestamp?: string;
    source?: HabitLogSource;
    notes?: string | null;
  },
): Promise<HabitLog<"active_kcal">> {
  return insertHabitLog(db, {
    type: "active_kcal",
    payload: { kcal: input.kcal },
    timestamp: input.timestamp,
    source: input.source,
    notes: input.notes,
  });
}

export async function listHabitLogsForDay(
  db: SQLiteDatabase,
  dayKey: string,
  type?: HabitLogType,
): Promise<HabitLog[]> {
  const rows =
    type == null
      ? await db.getAllAsync<HabitLogRow>(
          `SELECT id, type, timestamp, createdAt, source, notes, dayKey, payload_json
           FROM habit_logs
           WHERE dayKey = ?
           ORDER BY timestamp ASC, createdAt ASC`,
          dayKey,
        )
      : await db.getAllAsync<HabitLogRow>(
          `SELECT id, type, timestamp, createdAt, source, notes, dayKey, payload_json
           FROM habit_logs
           WHERE dayKey = ? AND type = ?
           ORDER BY timestamp ASC, createdAt ASC`,
          dayKey,
          type,
        );
  return rows.map((row) => mapRow(row));
}

export async function getHabitLog(
  db: SQLiteDatabase,
  id: string,
): Promise<HabitLog | null> {
  const row = await db.getFirstAsync<HabitLogRow>(
    `SELECT id, type, timestamp, createdAt, source, notes, dayKey, payload_json
     FROM habit_logs WHERE id = ?`,
    id,
  );
  return row == null ? null : mapRow(row);
}
