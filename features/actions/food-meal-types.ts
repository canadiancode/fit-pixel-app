import type { RecentFoodMeal, SavedMeal } from "@/lib/db";

/** Shared row shape for saved / recent meal list UIs. */
export type FoodMealListItem = {
  /** Present when the meal is (or matches) a saved_meals row. */
  savedId?: string;
  name: string;
  vendor?: string;
  portionSize?: string;
  calories: number;
  fat: number;
  carbs: number;
  protein: number;
};

export function savedMealToListItem(meal: SavedMeal): FoodMealListItem {
  return {
    savedId: meal.id,
    name: meal.name,
    ...(meal.vendor != null ? { vendor: meal.vendor } : {}),
    ...(meal.portionSize != null ? { portionSize: meal.portionSize } : {}),
    calories: meal.kcal,
    fat: meal.fatG ?? 0,
    carbs: meal.carbsG ?? 0,
    protein: meal.proteinG ?? 0,
  };
}

export function recentFoodMealToListItem(
  meal: RecentFoodMeal,
  savedId?: string,
): FoodMealListItem {
  return {
    ...(savedId != null ? { savedId } : {}),
    name: meal.name,
    ...(meal.portionSize != null ? { portionSize: meal.portionSize } : {}),
    calories: meal.kcal,
    fat: meal.fatG ?? 0,
    carbs: meal.carbsG ?? 0,
    protein: meal.proteinG ?? 0,
  };
}

export function listItemToFoodPayload(item: FoodMealListItem) {
  return {
    name: item.name,
    kcal: item.calories,
    proteinG: item.protein,
    carbsG: item.carbs,
    fatG: item.fat,
    ...(item.portionSize != null ? { portionSize: item.portionSize } : {}),
  };
}
