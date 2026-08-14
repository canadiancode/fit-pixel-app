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

import { useDailyGoals } from "@/features/actions/daily-goals-context";
import type { ActionProgressTotals } from "@/features/actions/data";
import { useXpState } from "@/features/xp/xp-state-context";
import { useDashboardHealthMetrics } from "@/hooks/use-dashboard-health-metrics";
import {
  getLatestWeightValue,
  getTodayHabitTotals,
  logActiveKcal,
  logFood,
  logSleep,
  logSteps,
  logTrain,
  logWater,
  logWeight,
  maybeAwardGoalBonusesForDay,
  type FoodHabitPayload,
  type HabitLog,
  type HabitLogSource,
  type WaterUnit,
  type WeightUnit,
} from "@/lib/db";

/** HealthKit day values for Actions; `null` when that metric is not connected. */
export type ConnectedHealthDay = {
  steps: number | null;
  activeKcal: number | null;
};

type HabitProgressContextValue = {
  /** Today's progress totals (manual SQLite + connected HealthKit for steps/kcal). */
  totals: ActionProgressTotals;
  /** SQLite habit_logs aggregates only (no HealthKit merge). */
  manualTotals: ActionProgressTotals;
  /** Live HealthKit steps / active kcal when connected. */
  connectedHealth: ConnectedHealthDay;
  /** False until today's aggregates have been read once. */
  isHydrated: boolean;
  refreshTotals: () => Promise<void>;
  addWater: (input: {
    amount: number;
    unit?: WaterUnit;
    notes?: string | null;
  }) => Promise<HabitLog<"water">>;
  addFood: (
    input: FoodHabitPayload & {
      notes?: string | null;
      source?: HabitLogSource;
    },
  ) => Promise<HabitLog<"food">>;
  addTrain: (input: {
    durationMin: number;
    trainType?: string;
    notes?: string | null;
  }) => Promise<HabitLog<"train">>;
  addSleep: (input: {
    durationMin: number;
    notes?: string | null;
  }) => Promise<HabitLog<"sleep">>;
  addWeight: (input: {
    value: number;
    unit?: WeightUnit;
    notes?: string | null;
  }) => Promise<HabitLog<"weight">>;
  addSteps: (input: {
    steps: number;
    notes?: string | null;
  }) => Promise<HabitLog<"steps">>;
  addActiveKcal: (input: {
    kcal: number;
    notes?: string | null;
  }) => Promise<HabitLog<"active_kcal">>;
};

const HabitProgressContext = createContext<HabitProgressContextValue | null>(
  null,
);

const EMPTY_TOTALS: ActionProgressTotals = {};

function toActionTotals(
  day: Awaited<ReturnType<typeof getTodayHabitTotals>>,
  latestWeight?: number,
): ActionProgressTotals {
  const weight = latestWeight ?? day.weight;
  return {
    foodKcal: day.foodKcal,
    waterAmount: day.waterAmount,
    trainMinutes: day.trainMinutes,
    sleepHours: day.sleepHours,
    steps: day.steps,
    activeKcal: day.activeKcal,
    // Weight carries forward across days (latest log), unlike daily habits.
    ...(weight !== undefined ? { weight } : {}),
  };
}

function mergeConnectedHealth(
  manual: ActionProgressTotals,
  connected: ConnectedHealthDay,
): ActionProgressTotals {
  return {
    ...manual,
    steps: (manual.steps ?? 0) + (connected.steps ?? 0),
    activeKcal: (manual.activeKcal ?? 0) + (connected.activeKcal ?? 0),
  };
}

export function HabitProgressProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const { goals, isHydrated: goalsHydrated } = useDailyGoals();
  const { refreshXp } = useXpState();
  const { metrics, connectivity } = useDashboardHealthMetrics();
  const [manualTotals, setManualTotals] =
    useState<ActionProgressTotals>(EMPTY_TOTALS);
  const [isHydrated, setIsHydrated] = useState(false);

  const connectedHealth = useMemo<ConnectedHealthDay>(
    () => ({
      steps: connectivity.steps ? metrics.steps : null,
      activeKcal: connectivity.activeEnergyKcal
        ? metrics.activeEnergyKcal
        : null,
    }),
    [
      connectivity.steps,
      connectivity.activeEnergyKcal,
      metrics.steps,
      metrics.activeEnergyKcal,
    ],
  );

  const totals = useMemo(
    () => mergeConnectedHealth(manualTotals, connectedHealth),
    [manualTotals, connectedHealth],
  );

  const refreshTotals = useCallback(async () => {
    const [day, latestWeight] = await Promise.all([
      getTodayHabitTotals(db, {
        waterUnit: goals.waterUnit,
        weightUnit: goals.weightUnit,
      }),
      getLatestWeightValue(db, goals.weightUnit),
    ]);
    setManualTotals(toActionTotals(day, latestWeight));
  }, [db, goals.waterUnit, goals.weightUnit]);

  const afterHabitLog = useCallback(
    async (dayKey: string) => {
      await maybeAwardGoalBonusesForDay(db, dayKey, {
        waterUnit: goals.waterUnit,
        weightUnit: goals.weightUnit,
      });
      await refreshTotals();
      await refreshXp();
    },
    [db, goals.waterUnit, goals.weightUnit, refreshTotals, refreshXp],
  );

  useEffect(() => {
    if (!goalsHydrated) return;

    let cancelled = false;

    void (async () => {
      try {
        const [day, latestWeight] = await Promise.all([
          getTodayHabitTotals(db, {
            waterUnit: goals.waterUnit,
            weightUnit: goals.weightUnit,
          }),
          getLatestWeightValue(db, goals.weightUnit),
        ]);
        if (!cancelled) {
          setManualTotals(toActionTotals(day, latestWeight));
        }
      } finally {
        if (!cancelled) {
          setIsHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [db, goals.waterUnit, goals.weightUnit, goalsHydrated]);

  const addWater = useCallback(
    async (input: {
      amount: number;
      unit?: WaterUnit;
      notes?: string | null;
    }) => {
      const log = await logWater(db, {
        amount: input.amount,
        unit: input.unit ?? goals.waterUnit,
        notes: input.notes,
      });
      await afterHabitLog(log.dayKey);
      return log;
    },
    [db, goals.waterUnit, afterHabitLog],
  );

  const addFood = useCallback(
    async (
      input: FoodHabitPayload & {
        notes?: string | null;
        source?: HabitLogSource;
      },
    ) => {
      const log = await logFood(db, input);
      await afterHabitLog(log.dayKey);
      return log;
    },
    [db, afterHabitLog],
  );

  const addTrain = useCallback(
    async (input: {
      durationMin: number;
      trainType?: string;
      notes?: string | null;
    }) => {
      const log = await logTrain(db, input);
      await afterHabitLog(log.dayKey);
      return log;
    },
    [db, afterHabitLog],
  );

  const addSleep = useCallback(
    async (input: { durationMin: number; notes?: string | null }) => {
      const log = await logSleep(db, input);
      await afterHabitLog(log.dayKey);
      return log;
    },
    [db, afterHabitLog],
  );

  const addWeight = useCallback(
    async (input: {
      value: number;
      unit?: WeightUnit;
      notes?: string | null;
    }) => {
      const log = await logWeight(db, {
        value: input.value,
        unit: input.unit ?? goals.weightUnit,
        notes: input.notes,
      });
      await afterHabitLog(log.dayKey);
      return log;
    },
    [db, goals.weightUnit, afterHabitLog],
  );

  const addSteps = useCallback(
    async (input: { steps: number; notes?: string | null }) => {
      const log = await logSteps(db, input);
      await afterHabitLog(log.dayKey);
      return log;
    },
    [db, afterHabitLog],
  );

  const addActiveKcal = useCallback(
    async (input: { kcal: number; notes?: string | null }) => {
      const log = await logActiveKcal(db, input);
      await afterHabitLog(log.dayKey);
      return log;
    },
    [db, afterHabitLog],
  );

  const value = useMemo<HabitProgressContextValue>(
    () => ({
      totals,
      manualTotals,
      connectedHealth,
      isHydrated,
      refreshTotals,
      addWater,
      addFood,
      addTrain,
      addSleep,
      addWeight,
      addSteps,
      addActiveKcal,
    }),
    [
      totals,
      manualTotals,
      connectedHealth,
      isHydrated,
      refreshTotals,
      addWater,
      addFood,
      addTrain,
      addSleep,
      addWeight,
      addSteps,
      addActiveKcal,
    ],
  );

  return (
    <HabitProgressContext.Provider value={value}>
      {children}
    </HabitProgressContext.Provider>
  );
}

export function useHabitProgress(): HabitProgressContextValue {
  const ctx = useContext(HabitProgressContext);
  if (ctx == null) {
    throw new Error(
      "useHabitProgress must be used within HabitProgressProvider",
    );
  }
  return ctx;
}
