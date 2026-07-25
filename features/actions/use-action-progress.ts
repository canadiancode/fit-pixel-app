import { useMemo } from "react";

import { useDailyGoals } from "@/features/actions/daily-goals-context";

import {
  getActionRowFillPercent,
  getActionRowProgressDisplay,
  getActionRowProgressLabel,
  type ActionProgressDisplay,
  type ActionProgressTotals,
  type ActionRouteId,
} from "./data";

const EMPTY_TOTALS: ActionProgressTotals = {};

/**
 * Live progress for an Actions row from persisted goals.
 * Logged totals stay empty (0) until Phase 2 habit logs.
 */
export function useActionProgress(
  id: ActionRouteId,
  totals: ActionProgressTotals = EMPTY_TOTALS,
): ActionProgressDisplay & {
  progressLabel: string;
  barFillPercent: number;
} {
  const { goals } = useDailyGoals();

  return useMemo(() => {
    const display = getActionRowProgressDisplay(id, goals, totals);
    return {
      ...display,
      progressLabel: getActionRowProgressLabel(id, goals, totals),
      barFillPercent: getActionRowFillPercent(id, goals, totals),
    };
  }, [id, goals, totals]);
}
