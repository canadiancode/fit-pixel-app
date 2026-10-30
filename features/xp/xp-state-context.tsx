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

import { getXpState, subscribeXpStateChange, type XpState } from "@/lib/db";
import { maybeAskForReview } from "@/lib/review-prompt";

type XpStateContextValue = {
  xp: XpState;
  /** False until xp_state has been read once. */
  isHydrated: boolean;
  refreshXp: () => Promise<void>;
};

const DEFAULT_XP: XpState = {
  lifetimeXp: 0,
  level: 0,
  updatedAt: "",
};

const XpStateContext = createContext<XpStateContextValue | null>(null);

/**
 * App-wide XP state from SQLite. Habit writes award XP there right away (call
 * refreshXp after awards so the UI updates); once synced, the server's total
 * replaces it and this refreshes on its own.
 */
export function XpStateProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [xp, setXp] = useState<XpState>(DEFAULT_XP);
  const [isHydrated, setIsHydrated] = useState(false);
  /** Level last read from SQLite; null until the first read. */
  const levelRef = useRef<number | null>(null);

  const refreshXp = useCallback(async () => {
    const next = await getXpState(db);
    const prev = levelRef.current;
    levelRef.current = next.level;
    setXp(next);
    // A level gained in play, not a restore landing many levels at once.
    if (prev != null && next.level > prev && next.level - prev <= 2) {
      void maybeAskForReview(next.level);
    }
  }, [db]);

  useEffect(() => subscribeXpStateChange(() => void refreshXp()), [refreshXp]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const next = await getXpState(db);
        if (!cancelled) {
          levelRef.current = next.level;
          setXp(next);
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

  const value = useMemo<XpStateContextValue>(
    () => ({
      xp,
      isHydrated,
      refreshXp,
    }),
    [xp, isHydrated, refreshXp],
  );

  return (
    <XpStateContext.Provider value={value}>{children}</XpStateContext.Provider>
  );
}

export function useXpState(): XpStateContextValue {
  const ctx = useContext(XpStateContext);
  if (ctx == null) {
    throw new Error("useXpState must be used within XpStateProvider");
  }
  return ctx;
}
