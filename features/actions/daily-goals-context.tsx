import { useSQLiteContext } from "expo-sqlite";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

export type DailyGoalsUpdateInput =
  | DailyGoalsUpdate
  | ((prev: DailyGoals) => DailyGoalsUpdate);

type DailyGoalsContextValue = {
  goals: DailyGoals;
  /** False until SQLite has been read once. */
  isHydrated: boolean;
  updateGoals: (update: DailyGoalsUpdateInput) => Promise<DailyGoals>;
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
  const goalsRef = useRef(goals);
  goalsRef.current = goals;
  /** Serialize SQLite writes so rapid stepper holds cannot race. */
  const writeChainRef = useRef(Promise.resolve());
  /** Skip applying stale write results after newer optimistic updates. */
  const writeGenRef = useRef(0);

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
    (update: DailyGoalsUpdateInput) => {
      const patch =
        typeof update === "function" ? update(goalsRef.current) : update;
      const optimistic: DailyGoals = { ...goalsRef.current, ...patch };
      goalsRef.current = optimistic;
      setGoals(optimistic);
      const gen = ++writeGenRef.current;

      const run = writeChainRef.current.then(async () => {
        const next = await setDailyGoals(db, patch);
        if (gen === writeGenRef.current) {
          goalsRef.current = next;
          setGoals(next);
        }
        return next;
      });
      writeChainRef.current = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
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
