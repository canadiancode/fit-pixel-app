import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useRef, type ReactNode } from "react";
import { AppState } from "react-native";

import { useAuth } from "@/features/auth/auth-context";
import { subscribePendingOpEnqueue } from "@/lib/db";
import { drainPendingServerOps } from "@/lib/sync/drain";

const DEBOUNCE_MS = 800;
const POLL_MS = 20_000;

export function SyncDrainProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const { session } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const token = session?.access_token ?? null;

  useEffect(() => {
    const run = () => {
      void drainPendingServerOps(db, token);
    };

    const schedule = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(run, DEBOUNCE_MS);
    };

    run();
    const unsubscribeEnqueue = subscribePendingOpEnqueue(schedule);
    const appSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        schedule();
      }
    });
    const poll = setInterval(run, POLL_MS);

    return () => {
      unsubscribeEnqueue();
      appSub.remove();
      clearInterval(poll);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [db, token]);

  return children;
}
