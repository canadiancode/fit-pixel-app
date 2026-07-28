import { useMemo } from "react";

import { useDailyGoals } from "@/features/actions/daily-goals-context";
import { useHabitProgress } from "@/features/actions/habit-progress-context";

import {
  getActionRowFillPercent,
  getActionRowProgressDisplay,
  getActionRowProgressLabel,
  getTodaysProgressFillPercent,
  getTodaysProgressPercent,
  type ActionProgressDisplay,
  type ActionProgressTotals,
  type ActionRouteId,
} from "./data";

/**
 * Live progress for an Actions row from persisted goals + today's habit totals.
 * Pass `totals` to override the provider aggregate (tests / previews).
 */
export function useActionProgress(
  id: ActionRouteId,
  totalsOverride?: ActionProgressTotals,
): ActionProgressDisplay & {
  progressLabel: string;
  barFillPercent: number;
} {
  const { goals } = useDailyGoals();
  const { totals: liveTotals } = useHabitProgress();
  const totals = totalsOverride ?? liveTotals;

  return useMemo(() => {
    const display = getActionRowProgressDisplay(id, goals, totals);
    return {
      ...display,
      progressLabel: getActionRowProgressLabel(id, goals, totals),
      barFillPercent: getActionRowFillPercent(id, goals, totals),
    };
  }, [id, goals, totals]);
}

/** Aggregate Today's progress across the six daily habit rows. */
export function useTodaysProgress(totalsOverride?: ActionProgressTotals): {
  progressPercent: number;
  fillPercent: number;
} {
  const { goals } = useDailyGoals();
  const { totals: liveTotals } = useHabitProgress();
  const totals = totalsOverride ?? liveTotals;

  return useMemo(
    () => ({
      progressPercent: getTodaysProgressPercent(goals, totals),
      fillPercent: getTodaysProgressFillPercent(goals, totals),
    }),
    [goals, totals],
  );
}
