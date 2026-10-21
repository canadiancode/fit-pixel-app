import { useCallback } from "react";

import { useDailyGoals } from "@/features/actions/daily-goals-context";

import { useWeightJourney } from "./weight-journey-context";
import { formatWeight } from "./weight-journey-math";

/** Shown in place of a weight when "Hide numbers" is on. */
export const HIDDEN_WEIGHT = "***";

/**
 * Formats weights for overview surfaces, honouring "Hide numbers".
 * Pass `force` where the number is needed to act (entering a weigh-in).
 */
export function useWeightFormat() {
  const { settings } = useWeightJourney();
  const { goals } = useDailyGoals();
  const hidden = settings.hideNumbers;
  const unitLabel = goals.weightUnit === "kg" ? "KG" : "LBS";

  const format = useCallback(
    (
      value: number | null | undefined,
      options: { withUnit?: boolean; force?: boolean } = {},
    ): string => {
      if (value == null) return "—";
      if (hidden && options.force !== true) return HIDDEN_WEIGHT;
      const text = formatWeight(value);
      return options.withUnit === false ? text : `${text} ${unitLabel}`;
    },
    [hidden, unitLabel],
  );

  return { hidden, unitLabel, format };
}
