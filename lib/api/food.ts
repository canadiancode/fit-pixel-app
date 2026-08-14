import { FitPixelApiError, fitPixelFetch } from "./client";
import { getSupabaseClient } from "@/lib/supabase/client";

export { FitPixelApiError };

/** Mirrors fit-pixel-server `FoodSearchItem` (habit + list aliases). */
export type FoodSearchItem = {
  id: string;
  name: string;
  brandName?: string;
  description?: string;
  kcal?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  portionSize?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};

export type FoodSearchResponse = {
  ok: true;
  foods: FoodSearchItem[];
  page: number;
  maxResults: number;
  totalResults?: number;
};

export type FoodHabitReadyPayload = {
  name: string;
  kcal: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  portionSize?: string;
  vendor?: string;
};

export type FoodDetailServing = {
  id?: string;
  description?: string;
  calories?: number;
  carbohydrate?: number;
  protein?: number;
  fat?: number;
  kcal?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  portionSize?: string;
  isDefault?: boolean;
};

export type FoodDetailResponse = {
  ok: true;
  food: {
    id: string;
    name: string;
    brandName?: string;
    servings: FoodDetailServing[];
    habitPayload?: FoodHabitReadyPayload;
  };
};

async function getAccessToken(): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}

async function foodFetch<T>(path: string): Promise<T> {
  const accessToken = await getAccessToken();
  try {
    return await fitPixelFetch<T>(path, { accessToken, requireAuth: true });
  } catch (err) {
    if (err instanceof FitPixelApiError && err.status === 401) {
      throw new FitPixelApiError(
        401,
        "Sign in under Settings → Account to search foods.",
        "UNAUTHORIZED",
      );
    }
    throw err;
  }
}

export async function searchFoods(query: string): Promise<FoodSearchItem[]> {
  const q = query.trim();
  if (!q) return [];

  const params = new URLSearchParams({
    q,
    maxResults: "20",
  });

  const data = await foodFetch<FoodSearchResponse>(
    `/v1/food/search?${params.toString()}`,
  );

  return Array.isArray(data.foods) ? data.foods : [];
}

export async function getFoodById(id: string): Promise<FoodDetailResponse["food"]> {
  const data = await foodFetch<FoodDetailResponse>(
    `/v1/food/${encodeURIComponent(id)}`,
  );
  return data.food;
}

/** Resolve a habit-ready payload from a search row (fetch detail if macros missing). */
export async function resolveFoodHabitPayload(
  item: FoodSearchItem,
): Promise<FoodHabitReadyPayload> {
  const kcal = item.kcal ?? item.calories;
  if (kcal != null && Number.isFinite(kcal)) {
    return {
      name: item.name,
      kcal,
      ...(item.proteinG != null || item.protein != null
        ? { proteinG: item.proteinG ?? item.protein }
        : {}),
      ...(item.carbsG != null || item.carbs != null
        ? { carbsG: item.carbsG ?? item.carbs }
        : {}),
      ...(item.fatG != null || item.fat != null
        ? { fatG: item.fatG ?? item.fat }
        : {}),
      ...(item.portionSize ? { portionSize: item.portionSize } : {}),
      ...(item.brandName ? { vendor: item.brandName } : {}),
    };
  }

  const detail = await getFoodById(item.id);
  if (detail.habitPayload) {
    return detail.habitPayload;
  }

  const serving =
    detail.servings.find((s) => s.kcal != null || s.calories != null) ??
    detail.servings[0];
  const servingKcal = serving?.kcal ?? serving?.calories;
  if (servingKcal == null) {
    throw new FitPixelApiError(
      502,
      "This food has no calorie data yet. Try another result.",
    );
  }

  return {
    name: detail.name,
    kcal: servingKcal,
    ...(serving.proteinG != null || serving.protein != null
      ? { proteinG: serving.proteinG ?? serving.protein }
      : {}),
    ...(serving.carbsG != null || serving.carbohydrate != null
      ? { carbsG: serving.carbsG ?? serving.carbohydrate }
      : {}),
    ...(serving.fatG != null || serving.fat != null
      ? { fatG: serving.fatG ?? serving.fat }
      : {}),
    ...(serving.portionSize || serving.description
      ? { portionSize: serving.portionSize ?? serving.description }
      : {}),
    ...(detail.brandName ? { vendor: detail.brandName } : {}),
  };
}
