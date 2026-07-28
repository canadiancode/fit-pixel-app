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

import { getXpState, type XpState } from "@/lib/db";

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
 * App-wide local XP state. Cheatable until server is authoritative.
 * Habit writes award XP in SQLite; call refreshXp after awards so UI updates.
 */
export function XpStateProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [xp, setXp] = useState<XpState>(DEFAULT_XP);
  const [isHydrated, setIsHydrated] = useState(false);

  const refreshXp = useCallback(async () => {
    const next = await getXpState(db);
    setXp(next);
  }, [db]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const next = await getXpState(db);
        if (!cancelled) {
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
