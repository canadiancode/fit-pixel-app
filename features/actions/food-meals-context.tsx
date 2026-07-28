import { useSQLiteContext } from "expo-sqlite";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useHabitProgress } from "@/features/actions/habit-progress-context";
import {
  deleteSavedMeal,
  findSavedMealByContent,
  listRecentFoodMeals,
  listSavedMeals,
  savedMealContentKey,
  upsertSavedMeal,
  type SavedMeal,
  type SavedMealInput,
} from "@/lib/db";

import {
  recentFoodMealToListItem,
  savedMealToListItem,
  type FoodMealListItem,
} from "./food-meal-types";

type FoodMealsContextValue = {
  savedMeals: FoodMealListItem[];
  recentMeals: FoodMealListItem[];
  isHydrated: boolean;
  refreshMeals: () => Promise<void>;
  saveMeal: (input: SavedMealInput) => Promise<SavedMeal>;
  unsaveMeal: (savedId: string) => Promise<void>;
  /** Toggle favorite by content (save if missing, unsave if present). */
  toggleSaveMeal: (item: FoodMealListItem) => Promise<void>;
};

const FoodMealsContext = createContext<FoodMealsContextValue | null>(null);

export function FoodMealsProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const { totals, isHydrated: habitsHydrated } = useHabitProgress();
  const [savedMeals, setSavedMeals] = useState<FoodMealListItem[]>([]);
  const [recentMeals, setRecentMeals] = useState<FoodMealListItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const refreshMeals = useCallback(async () => {
    const [savedRows, recentRows] = await Promise.all([
      listSavedMeals(db),
      listRecentFoodMeals(db),
    ]);
    const savedItems = savedRows.map(savedMealToListItem);
    const savedByContent = new Map(
      savedRows.map((row) => [savedMealContentKey(row), row.id] as const),
    );
    setSavedMeals(savedItems);
    setRecentMeals(
      recentRows.map((row) =>
        recentFoodMealToListItem(
          row,
          savedByContent.get(savedMealContentKey(row)),
        ),
      ),
    );
  }, [db]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await refreshMeals();
      } finally {
        if (!cancelled) setIsHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshMeals]);

  // Re-read recent (and saved markers) when today's food total changes.
  useEffect(() => {
    if (!habitsHydrated || !isHydrated) return;
    void refreshMeals();
  }, [totals.foodKcal, habitsHydrated, isHydrated, refreshMeals]);

  const saveMeal = useCallback(
    async (input: SavedMealInput) => {
      const meal = await upsertSavedMeal(db, input);
      await refreshMeals();
      return meal;
    },
    [db, refreshMeals],
  );

  const unsaveMeal = useCallback(
    async (savedId: string) => {
      await deleteSavedMeal(db, savedId);
      await refreshMeals();
    },
    [db, refreshMeals],
  );

  const toggleSaveMeal = useCallback(
    async (item: FoodMealListItem) => {
      if (item.savedId != null) {
        await unsaveMeal(item.savedId);
        return;
      }
      const existing = await findSavedMealByContent(db, {
        name: item.name,
        kcal: item.calories,
        proteinG: item.protein,
        carbsG: item.carbs,
        fatG: item.fat,
      });
      if (existing != null) {
        await unsaveMeal(existing.id);
        return;
      }
      await saveMeal({
        name: item.name,
        kcal: item.calories,
        proteinG: item.protein,
        carbsG: item.carbs,
        fatG: item.fat,
        ...(item.vendor != null ? { vendor: item.vendor } : {}),
        ...(item.portionSize != null ? { portionSize: item.portionSize } : {}),
      });
    },
    [db, saveMeal, unsaveMeal],
  );

  const value = useMemo<FoodMealsContextValue>(
    () => ({
      savedMeals,
      recentMeals,
      isHydrated,
      refreshMeals,
      saveMeal,
      unsaveMeal,
      toggleSaveMeal,
    }),
    [
      savedMeals,
      recentMeals,
      isHydrated,
      refreshMeals,
      saveMeal,
      unsaveMeal,
      toggleSaveMeal,
    ],
  );

  return (
    <FoodMealsContext.Provider value={value}>
      {children}
    </FoodMealsContext.Provider>
  );
}

export function useFoodMeals(): FoodMealsContextValue {
  const ctx = useContext(FoodMealsContext);
  if (ctx == null) {
    throw new Error("useFoodMeals must be used within FoodMealsProvider");
  }
  return ctx;
}
