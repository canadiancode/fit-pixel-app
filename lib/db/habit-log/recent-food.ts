import type { SQLiteDatabase } from "expo-sqlite";

import type { FoodHabitPayload } from "./types";

export const DEFAULT_RECENT_FOOD_MEALS_LIMIT = 20;

/** Deduped food log snapshot for recent-meals UI (not a sync fact). */
export type RecentFoodMeal = {
  /** Source habit_log id of the newest matching entry. */
  habitLogId: string;
  name: string;
  kcal: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  portionSize?: string;
  mealType?: FoodHabitPayload["mealType"];
  timestamp: string;
};

function contentKey(meal: {
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

type FoodLogRow = {
  id: string;
  timestamp: string;
  payload_json: string;
};

/**
 * Recent unique food meals from habit_logs (newest first).
 * Dedupes by name + kcal + macros so quick-add spam doesn't flood the list.
 * SECURITY: derived read — never enqueueOp this result.
 */
export async function listRecentFoodMeals(
  db: SQLiteDatabase,
  options?: { limit?: number },
): Promise<RecentFoodMeal[]> {
  const limit = Math.max(
    1,
    Math.min(100, options?.limit ?? DEFAULT_RECENT_FOOD_MEALS_LIMIT),
  );

  // Over-fetch then dedupe in JS so the cap is on unique meals.
  const rows = await db.getAllAsync<FoodLogRow>(
    `SELECT id, timestamp, payload_json
     FROM habit_logs
     WHERE type = 'food'
     ORDER BY timestamp DESC
     LIMIT ?`,
    limit * 4,
  );

  const out: RecentFoodMeal[] = [];
  const seen = new Set<string>();

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
    const payload = parsed as FoodHabitPayload;
    if (typeof payload.name !== "string" || !payload.name.trim()) continue;
    if (!Number.isFinite(payload.kcal)) continue;

    const meal: RecentFoodMeal = {
      habitLogId: row.id,
      name: payload.name.trim(),
      kcal: payload.kcal,
      timestamp: row.timestamp,
    };
    if (payload.proteinG !== undefined) meal.proteinG = payload.proteinG;
    if (payload.carbsG !== undefined) meal.carbsG = payload.carbsG;
    if (payload.fatG !== undefined) meal.fatG = payload.fatG;
    if (payload.portionSize != null) meal.portionSize = payload.portionSize;
    if (payload.mealType != null) meal.mealType = payload.mealType;

    const key = contentKey(meal);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(meal);
    if (out.length >= limit) break;
  }

  return out;
}
