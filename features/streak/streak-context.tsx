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
import { AppState } from "react-native";

import { PROGRESS_TOKEN_FLIGHT_MS } from "@/features/actions/progress-celebration";
import {
  EMPTY_STREAK,
  getDailyStreak,
  getTodayDayKey,
  type DailyStreak,
} from "@/lib/db";

import { subscribeHabitLogged } from "./streak-events";

export type StreakCelebration = {
  id: number;
  /** The streak being celebrated (today included). */
  count: number;
  /** First time this run passed the old best (and it's more than a day). */
  newBest: boolean;
  /** Opened from the header badge rather than earned just now. */
  replay: boolean;
};

type StreakContextValue = {
  streak: DailyStreak;
  isHydrated: boolean;
  celebration: StreakCelebration | null;
  /**
   * Header badge: play today's celebration again. `previewCount` (dev
   * builds) plays another streak length to preview its tier.
   */
  replayCelebration: (previewCount?: number) => void;
  dismissCelebration: () => void;
};

/** Let the "+12oz" token land and the bar fill before the takeover. */
const CELEBRATION_DELAY_MS = PROGRESS_TOKEN_FLIGHT_MS + 650;

const StreakContext = createContext<StreakContextValue | null>(null);

/**
 * The daily streak and its once-a-day celebration: the first log of an app
 * day extends the streak and opens the takeover. Logs restored from the
 * server or made on another device don't celebrate (no flip seen here).
 */
export function StreakProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [streak, setStreak] = useState<DailyStreak>(EMPTY_STREAK);
  const [isHydrated, setIsHydrated] = useState(false);
  const [celebration, setCelebration] = useState<StreakCelebration | null>(
    null,
  );
  const streakRef = useRef<DailyStreak | null>(null);
  const nextIdRef = useRef(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const readStreak = useCallback(async () => {
    const today = await getTodayDayKey(db);
    return getDailyStreak(db, today);
  }, [db]);

  const refresh = useCallback(
    async (fromLog: boolean) => {
      const next = await readStreak();
      const previous = streakRef.current;
      streakRef.current = next;
      setStreak(next);
      setIsHydrated(true);
      if (
        fromLog &&
        previous != null &&
        !previous.todayActive &&
        next.todayActive
      ) {
        const newBest = next.count > 1 && next.count > previous.best;
        if (timerRef.current != null) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setCelebration({
            id: nextIdRef.current++,
            count: next.count,
            newBest,
            replay: false,
          });
        }, CELEBRATION_DELAY_MS);
      }
    },
    [readStreak],
  );

  useEffect(() => {
    void refresh(false);
    const unsubscribe = subscribeHabitLogged(() => {
      void refresh(true);
    });
    // A new app day can start while the app is open or in the background.
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh(false);
    });
    return () => {
      unsubscribe();
      appState.remove();
      if (timerRef.current != null) clearTimeout(timerRef.current);
    };
  }, [refresh]);

  const replayCelebration = useCallback((previewCount?: number) => {
    const current = streakRef.current;
    const count = previewCount ?? current?.count ?? 0;
    if (count === 0) return;
    setCelebration({
      id: nextIdRef.current++,
      count,
      newBest: false,
      replay: true,
    });
  }, []);

  const dismissCelebration = useCallback(() => setCelebration(null), []);

  const value = useMemo<StreakContextValue>(
    () => ({
      streak,
      isHydrated,
      celebration,
      replayCelebration,
      dismissCelebration,
    }),
    [streak, isHydrated, celebration, replayCelebration, dismissCelebration],
  );

  return (
    <StreakContext.Provider value={value}>{children}</StreakContext.Provider>
  );
}

export function useStreak(): StreakContextValue {
  const ctx = useContext(StreakContext);
  if (ctx == null) {
    throw new Error("useStreak must be used within StreakProvider");
  }
  return ctx;
}
