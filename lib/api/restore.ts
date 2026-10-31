import type { FoodMealType, HabitLogSource, HabitLogType } from "@/lib/db";
import type { RestoredWorkoutSession } from "@/lib/db/training";

import { fitPixelFetch } from "./client";

/** Wire shapes for GET /v1/me/snapshot and GET /v1/habits (see server types/restore.ts). */

export type RestoreHabitLog = {
  id: string;
  type: HabitLogType;
  timestamp: string;
  createdAt: string;
  source: HabitLogSource;
  notes: string | null;
  dayKey: string;
  payload: Record<string, unknown>;
};

export type RestoreSnapshot = {
  serverTime: string;
  profile: {
    displayName: string;
    bio: string;
    homeGymId: string | null;
    homeGymName: string | null;
    profileVisible: boolean;
    instagram: string | null;
    tiktok: string | null;
    youtube: string | null;
    updatedAt: string;
  } | null;
  prefs: {
    unitSystem: "metric" | "imperial";
    selectedThemeId: string;
    notifAccountability: boolean;
    notifNews: boolean;
    dayStartsAtMinutes: number;
    timeZone: string;
    updatedAt: string;
  } | null;
  dailyGoals: {
    foodKcal: number;
    waterAmount: number;
    waterUnit: "oz" | "ml";
    trainMinutes: number;
    sleepHours: number;
    steps: number;
    activeKcal: number;
    weightGoal: number;
    weightUnit: "lb" | "kg";
    updatedAt: string;
  } | null;
  xp: { lifetimeXp: number; level: number; updatedAt: string } | null;
  loadout: { equipped: Record<string, string>; updatedAt: string } | null;
  savedMeals: {
    id: string;
    name: string;
    vendor: string | null;
    portionSize: string | null;
    kcal: number;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
    mealType: FoodMealType | null;
    createdAt: string;
    updatedAt: string;
  }[];
  habitLogCount: number;
  /** Missing on servers older than training sync. */
  trainingPlan?: { plan: Record<string, unknown>; updatedAt: string } | null;
  workoutSessionCount?: number;
  /** Missing on servers older than weight journey sync. */
  weightJourney?: RestoreWeightJourney | null;
};

export type RestoreWeightJourney = {
  startWeight: number | null;
  startUnit: "lb" | "kg" | null;
  startDayKey: string | null;
  weighInWeekday: number;
  reminderEnabled: boolean;
  hideNumbers: boolean;
  updatedAt: string;
};

export async function fetchRestoreSnapshot(
  accessToken: string,
): Promise<RestoreSnapshot> {
  const data = await fitPixelFetch<{ ok: true } & RestoreSnapshot>(
    "/v1/me/snapshot",
    { accessToken },
  );
  return {
    ...data,
    savedMeals: Array.isArray(data.savedMeals) ? data.savedMeals : [],
  };
}

export async function fetchHabitLogsPage(
  accessToken: string,
  options: { after?: string | null; limit?: number } = {},
): Promise<{ logs: RestoreHabitLog[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  if (options.after) params.set("after", options.after);
  if (options.limit) params.set("limit", String(options.limit));
  const qs = params.toString();
  const data = await fitPixelFetch<{
    ok: true;
    logs: RestoreHabitLog[];
    nextCursor: string | null;
  }>(`/v1/habits${qs ? `?${qs}` : ""}`, { accessToken });
  return {
    logs: Array.isArray(data.logs) ? data.logs : [],
    nextCursor: data.nextCursor ?? null,
  };
}

export async function fetchWorkoutSessionsPage(
  accessToken: string,
  options: { after?: string | null; limit?: number } = {},
): Promise<{ sessions: RestoredWorkoutSession[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  if (options.after) params.set("after", options.after);
  if (options.limit) params.set("limit", String(options.limit));
  const qs = params.toString();
  const data = await fitPixelFetch<{
    ok: true;
    sessions: RestoredWorkoutSession[];
    nextCursor: string | null;
  }>(`/v1/workouts${qs ? `?${qs}` : ""}`, { accessToken });
  return {
    sessions: Array.isArray(data.sessions) ? data.sessions : [],
    nextCursor: data.nextCursor ?? null,
  };
}
