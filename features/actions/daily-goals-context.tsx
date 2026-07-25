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

import {
  DEFAULT_DAILY_GOALS,
  getDailyGoals,
  setDailyGoals,
  type DailyGoals,
  type DailyGoalsUpdate,
} from "@/lib/db";

type DailyGoalsContextValue = {
  goals: DailyGoals;
  /** False until SQLite has been read once. */
  isHydrated: boolean;
  updateGoals: (update: DailyGoalsUpdate) => Promise<DailyGoals>;
};

const DailyGoalsContext = createContext<DailyGoalsContextValue | null>(null);

const INITIAL_GOALS: DailyGoals = {
  ...DEFAULT_DAILY_GOALS,
  updatedAt: "",
};

export function DailyGoalsProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [goals, setGoals] = useState<DailyGoals>(INITIAL_GOALS);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const loaded = await getDailyGoals(db);
        if (!cancelled) {
          setGoals(loaded);
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
  }, [db]);

  const updateGoals = useCallback(
    async (update: DailyGoalsUpdate) => {
      const next = await setDailyGoals(db, update);
      setGoals(next);
      return next;
    },
    [db],
  );

  const value = useMemo<DailyGoalsContextValue>(
    () => ({ goals, isHydrated, updateGoals }),
    [goals, isHydrated, updateGoals],
  );

  return (
    <DailyGoalsContext.Provider value={value}>
      {children}
    </DailyGoalsContext.Provider>
  );
}

export function useDailyGoals(): DailyGoalsContextValue {
  const ctx = useContext(DailyGoalsContext);
  if (ctx == null) {
    throw new Error("useDailyGoals must be used within DailyGoalsProvider");
  }
  return ctx;
}
