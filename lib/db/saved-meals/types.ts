import type { FoodMealType } from "../habit-log/types";
import type { LocalRecord } from "../types";

/** Persisted favorite / reusable meal template. */
export type SavedMeal = LocalRecord & {
  name: string;
  vendor?: string;
  portionSize?: string;
  kcal: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  mealType?: FoodMealType;
  updatedAt: string;
};

export type SavedMealInput = {
  id?: string;
  name: string;
  vendor?: string | null;
  portionSize?: string | null;
  kcal: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  mealType?: FoodMealType;
};

/** Compensating delete payload for pending_server_ops (append-only). */
export type SavedMealDeletePayload = {
  id: string;
  deleted: true;
  deletedAt: string;
};
