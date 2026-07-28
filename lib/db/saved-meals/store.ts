import type { SQLiteDatabase } from "expo-sqlite";

import { HABIT_LOG_LIMITS } from "../habit-log/limits";
import {
  FOOD_MEAL_TYPES,
  type FoodMealType,
} from "../habit-log/types";
import { newLocalRecord, nowIso } from "../ids";
import { enqueueOp } from "../pending-ops";
import type { SavedMeal, SavedMealInput } from "./types";

const VENDOR_MAX_LEN = 80;

type SavedMealRow = {
  id: string;
  name: string;
  vendor: string | null;
  portionSize: string | null;
  kcal: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  mealType: string | null;
  createdAt: string;
  updatedAt: string;
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

function assertInRange(
  field: string,
  value: number,
  min: number,
  max: number,
): number {
  const n = assertFinite(field, value);
  if (n < min || n > max) {
    throw new Error(`${field} must be between ${min} and ${max} (got ${n})`);
  }
  return n;
}

function assertMealType(value: string | undefined): FoodMealType | undefined {
  if (value == null) return undefined;
  if (!(FOOD_MEAL_TYPES as readonly string[]).includes(value)) {
    throw new Error(`mealType must be one of ${FOOD_MEAL_TYPES.join(", ")}`);
  }
  return value as FoodMealType;
}

function mapRow(row: SavedMealRow): SavedMeal {
  const meal: SavedMeal = {
    id: row.id,
    name: row.name,
    kcal: row.kcal,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  if (row.vendor != null) meal.vendor = row.vendor;
  if (row.portionSize != null) meal.portionSize = row.portionSize;
  if (row.proteinG != null) meal.proteinG = row.proteinG;
  if (row.carbsG != null) meal.carbsG = row.carbsG;
  if (row.fatG != null) meal.fatG = row.fatG;
  if (row.mealType != null) meal.mealType = row.mealType as FoodMealType;
  return meal;
}

function normalizeSavedMealInput(input: SavedMealInput): Omit<
  SavedMeal,
  "id" | "createdAt" | "updatedAt"
> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("saved_meal.name must be a non-empty string");
  }
  if (name.length > HABIT_LOG_LIMITS.foodNameMaxLen) {
    throw new Error(
      `saved_meal.name must be at most ${HABIT_LOG_LIMITS.foodNameMaxLen} characters`,
    );
  }

  const mealType = assertMealType(input.mealType);
  const portionSize =
    input.portionSize == null
      ? undefined
      : input.portionSize.trim() || undefined;
  if (
    portionSize != null &&
    portionSize.length > HABIT_LOG_LIMITS.foodPortionMaxLen
  ) {
    throw new Error(
      `saved_meal.portionSize must be at most ${HABIT_LOG_LIMITS.foodPortionMaxLen} characters`,
    );
  }

  const vendorRaw =
    input.vendor == null ? undefined : input.vendor.trim() || undefined;
  if (vendorRaw != null && vendorRaw.length > VENDOR_MAX_LEN) {
    throw new Error(
      `saved_meal.vendor must be at most ${VENDOR_MAX_LEN} characters`,
    );
  }

  const out: Omit<SavedMeal, "id" | "createdAt" | "updatedAt"> = {
    name,
    kcal: assertInRange(
      "saved_meal.kcal",
      input.kcal,
      HABIT_LOG_LIMITS.foodKcal.min,
      HABIT_LOG_LIMITS.foodKcal.max,
    ),
  };
  if (mealType != null) out.mealType = mealType;
  if (portionSize != null) out.portionSize = portionSize;
  if (vendorRaw != null) out.vendor = vendorRaw;
  if (input.proteinG !== undefined) {
    out.proteinG = assertInRange(
      "saved_meal.proteinG",
      input.proteinG,
      HABIT_LOG_LIMITS.foodMacroG.min,
      HABIT_LOG_LIMITS.foodMacroG.max,
    );
  }
  if (input.carbsG !== undefined) {
    out.carbsG = assertInRange(
      "saved_meal.carbsG",
      input.carbsG,
      HABIT_LOG_LIMITS.foodMacroG.min,
      HABIT_LOG_LIMITS.foodMacroG.max,
    );
  }
  if (input.fatG !== undefined) {
    out.fatG = assertInRange(
      "saved_meal.fatG",
      input.fatG,
      HABIT_LOG_LIMITS.foodMacroG.min,
      HABIT_LOG_LIMITS.foodMacroG.max,
    );
  }
  return out;
}

function mealToEnqueuePayload(meal: SavedMeal): Record<string, unknown> {
  return {
    id: meal.id,
    name: meal.name,
    ...(meal.vendor != null ? { vendor: meal.vendor } : {}),
    ...(meal.portionSize != null ? { portionSize: meal.portionSize } : {}),
    kcal: meal.kcal,
    ...(meal.proteinG != null ? { proteinG: meal.proteinG } : {}),
    ...(meal.carbsG != null ? { carbsG: meal.carbsG } : {}),
    ...(meal.fatG != null ? { fatG: meal.fatG } : {}),
    ...(meal.mealType != null ? { mealType: meal.mealType } : {}),
    createdAt: meal.createdAt,
    updatedAt: meal.updatedAt,
  };
}

export async function listSavedMeals(
  db: SQLiteDatabase,
): Promise<SavedMeal[]> {
  const rows = await db.getAllAsync<SavedMealRow>(
    `SELECT id, name, vendor, portionSize, kcal, proteinG, carbsG, fatG,
            mealType, createdAt, updatedAt
     FROM saved_meals
     ORDER BY updatedAt DESC`,
  );
  return rows.map(mapRow);
}

export async function getSavedMeal(
  db: SQLiteDatabase,
  id: string,
): Promise<SavedMeal | null> {
  const row = await db.getFirstAsync<SavedMealRow>(
    `SELECT id, name, vendor, portionSize, kcal, proteinG, carbsG, fatG,
            mealType, createdAt, updatedAt
     FROM saved_meals
     WHERE id = ?`,
    id,
  );
  return row == null ? null : mapRow(row);
}

/**
 * Insert or update a favorite meal. Enqueues a new saved_meal fact op each time
 * (append-only; payload carries the stable meal id).
 */
export async function upsertSavedMeal(
  db: SQLiteDatabase,
  input: SavedMealInput,
): Promise<SavedMeal> {
  const normalized = normalizeSavedMealInput(input);
  const updatedAt = nowIso();
  const existingId = input.id?.trim() || null;
  const existing =
    existingId != null ? await getSavedMeal(db, existingId) : null;

  const meal: SavedMeal = existing
    ? {
        ...normalized,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt,
      }
    : {
        ...normalized,
        id: existingId ?? newLocalRecord().id,
        createdAt: updatedAt,
        updatedAt,
      };

  await db.runAsync(
    `INSERT INTO saved_meals (
      id, name, vendor, portionSize, kcal, proteinG, carbsG, fatG,
      mealType, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      vendor = excluded.vendor,
      portionSize = excluded.portionSize,
      kcal = excluded.kcal,
      proteinG = excluded.proteinG,
      carbsG = excluded.carbsG,
      fatG = excluded.fatG,
      mealType = excluded.mealType,
      updatedAt = excluded.updatedAt`,
    meal.id,
    meal.name,
    meal.vendor ?? null,
    meal.portionSize ?? null,
    meal.kcal,
    meal.proteinG ?? null,
    meal.carbsG ?? null,
    meal.fatG ?? null,
    meal.mealType ?? null,
    meal.createdAt,
    meal.updatedAt,
  );

  // New op id each write — never rewrite a prior payload (S1).
  await enqueueOp(db, "saved_meal", mealToEnqueuePayload(meal), {
    clientClockAt: meal.updatedAt,
  });

  return meal;
}

/**
 * Remove a favorite. Deletes the row and enqueues a compensating deleted fact.
 */
export async function deleteSavedMeal(
  db: SQLiteDatabase,
  id: string,
): Promise<boolean> {
  const existing = await getSavedMeal(db, id);
  if (existing == null) return false;

  await db.runAsync(`DELETE FROM saved_meals WHERE id = ?`, id);

  const deletedAt = nowIso();
  await enqueueOp(
    db,
    "saved_meal",
    { id, deleted: true as const, deletedAt },
    { clientClockAt: deletedAt },
  );

  return true;
}

/** Content match key for heart toggle (name + nutrition fingerprint). */
export function savedMealContentKey(meal: {
  name: string;
  kcal: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
}): string {
  return [
    meal.name.trim().toLowerCase(),
    meal.kcal,
    meal.proteinG ?? 0,
    meal.carbsG ?? 0,
    meal.fatG ?? 0,
  ].join("|");
}

export async function findSavedMealByContent(
  db: SQLiteDatabase,
  meal: {
    name: string;
    kcal: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
  },
): Promise<SavedMeal | null> {
  const key = savedMealContentKey(meal);
  const all = await listSavedMeals(db);
  return all.find((row) => savedMealContentKey(row) === key) ?? null;
}
