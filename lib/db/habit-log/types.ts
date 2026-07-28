import type { LocalRecord } from "../types";
import type { WaterUnit, WeightUnit } from "../daily-goals/types";

/** Habit domains stored in `habit_logs`. */
export const HABIT_LOG_TYPES = [
  "water",
  "food",
  "train",
  "sleep",
  "weight",
  "steps",
  "active_kcal",
] as const;

export type HabitLogType = (typeof HABIT_LOG_TYPES)[number];

/**
 * Client-asserted origin. Never trust `healthkit` for server scoring —
 * only enqueue HealthKit-derived rows when the user explicitly saves/imports.
 */
export const HABIT_LOG_SOURCES = ["manual", "healthkit", "import"] as const;

export type HabitLogSource = (typeof HABIT_LOG_SOURCES)[number];

export const FOOD_MEAL_TYPES = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "other",
] as const;

export type FoodMealType = (typeof FOOD_MEAL_TYPES)[number];

export type WaterHabitPayload = {
  amount: number;
  unit: WaterUnit;
};

export type FoodHabitPayload = {
  name: string;
  kcal: number;
  mealType?: FoodMealType;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  portionSize?: string;
};

export type TrainHabitPayload = {
  durationMin: number;
  trainType?: string;
};

/** Sleep as duration (UI logs minutes → hours at the write boundary). */
export type SleepHabitPayload = {
  durationHours: number;
};

export type WeightHabitPayload = {
  value: number;
  unit: WeightUnit;
};

export type StepsHabitPayload = {
  steps: number;
};

export type ActiveKcalHabitPayload = {
  kcal: number;
};

export type HabitLogPayloadByType = {
  water: WaterHabitPayload;
  food: FoodHabitPayload;
  train: TrainHabitPayload;
  sleep: SleepHabitPayload;
  weight: WeightHabitPayload;
  steps: StepsHabitPayload;
  active_kcal: ActiveKcalHabitPayload;
};

/** Shared event shape + typed domain payload. */
export type HabitLog<T extends HabitLogType = HabitLogType> = LocalRecord & {
  type: T;
  timestamp: string;
  source: HabitLogSource;
  /** Free text — treat as PII; do not ship to analytics without consent. */
  notes: string | null;
  /** App day key from day boundary + timestamp (denormalized for queries). */
  dayKey: string;
  payload: HabitLogPayloadByType[T];
};

export type HabitLogInsertInput<T extends HabitLogType = HabitLogType> = {
  type: T;
  payload: HabitLogPayloadByType[T];
  /** Defaults to now. */
  timestamp?: string;
  /** Defaults to `manual`. */
  source?: HabitLogSource;
  notes?: string | null;
};
