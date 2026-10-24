import { useMemo } from "react";

import { useDailyGoals } from "@/features/actions/daily-goals-context";
import { getFoodGoalModeForTotals } from "@/features/actions/data";
import { useHabitProgress } from "@/features/actions/habit-progress-context";
import { isFoodGoalMet } from "@/lib/db";

/**
 * How today's logs show on the Pixel (see PixelVitalsLayer). Each flag is a
 * small reward or nudge you can see on the home screen.
 */
export type PixelVitals = {
  /** Last night's logged sleep fell well short of the goal: Zzz, slow breathing. */
  sleepy: boolean;
  /** A good burn today (active calories or training): sweat drips. */
  sweaty: boolean;
  /** Food landed in today's goal range: little hearts. */
  wellFed: boolean;
  /** Water goal met: the bottle glows. */
  hydrated: boolean;
};

export const CALM_VITALS: PixelVitals = {
  sleepy: false,
  sweaty: false,
  wellFed: false,
  hydrated: false,
};

/** Under this share of the sleep goal counts as a short night. */
const SHORT_SLEEP_SHARE = 0.75;
/** This share of the active-calorie or training goal counts as a good burn. */
const BURN_SHARE = 0.5;

export function usePixelVitals(): PixelVitals {
  const { goals } = useDailyGoals();
  const { totals, isHydrated } = useHabitProgress();

  return useMemo(() => {
    if (!isHydrated) return CALM_VITALS;
    const sleepHours = totals.sleepHours ?? 0;
    const activeKcal = totals.activeKcal ?? 0;
    const trainMinutes = totals.trainMinutes ?? 0;
    return {
      // Nothing logged yet isn't a short night.
      sleepy: sleepHours > 0 && sleepHours < goals.sleepHours * SHORT_SLEEP_SHARE,
      sweaty:
        (goals.activeKcal > 0 && activeKcal >= goals.activeKcal * BURN_SHARE) ||
        (goals.trainMinutes > 0 && trainMinutes >= goals.trainMinutes * BURN_SHARE),
      wellFed: isFoodGoalMet(
        getFoodGoalModeForTotals(goals, totals),
        totals.foodKcal ?? 0,
        goals.foodKcal,
      ),
      hydrated:
        goals.waterAmount > 0 && (totals.waterAmount ?? 0) >= goals.waterAmount,
    };
  }, [goals, totals, isHydrated]);
}
