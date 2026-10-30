import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useRef, type ReactNode } from "react";
import { AppState } from "react-native";

import { useAuth } from "@/features/auth/auth-context";
import {
  enqueueDayBoundaryTimeZoneIfUnsynced,
  subscribePendingOpEnqueue,
} from "@/lib/db";
import { drainPendingServerOps } from "@/lib/sync/drain";
import { reconcileXpWithServer } from "@/lib/sync/xp-reconcile";

const DEBOUNCE_MS = 800;
const POLL_MS = 20_000;
/** After a failed POST: 5 s, 10 s, 20 s … capped at 5 min. */
const BACKOFF_BASE_MS = 5_000;
const BACKOFF_MAX_MS = 5 * 60_000;
/** Pick up XP earned on other devices at most this often while idle. */
const XP_RECONCILE_MIN_MS = 60_000;

export function SyncDrainProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const { session } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const token = session?.access_token ?? null;

  useEffect(() => {
    let inFlight = false;
    let failures = 0;
    let retryAt = 0;
    let xpCheckedAt = 0;

    // Once the outbox is empty, show the server's XP total (every device,
    // same as the leaderboard). `force` after a sync that sent ops.
    const reconcileXp = (force: boolean) => {
      if (!token) return;
      if (!force && Date.now() - xpCheckedAt < XP_RECONCILE_MIN_MS) return;
      xpCheckedAt = Date.now();
      void reconcileXpWithServer(db, token).catch(() => {
        // Next sync or foreground retries.
      });
    };

    // A failed drain marks its ops failed, which fires the enqueue listener;
    // without the backoff gate that re-sent the batch every ~800 ms while
    // offline or rate limited.
    const run = () => {
      if (inFlight || Date.now() < retryAt) return;
      inFlight = true;
      void drainPendingServerOps(db, token)
        .then((outcome) => {
          if (outcome === "failed") {
            failures += 1;
            retryAt =
              Date.now() +
              Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** (failures - 1));
          } else {
            failures = 0;
            retryAt = 0;
            reconcileXp(outcome === "sent");
          }
        })
        .catch(() => {
          // Local DB error: next poll retries.
        })
        .finally(() => {
          inFlight = false;
        });
    };

    const schedule = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(run, DEBOUNCE_MS);
    };

    // Signed in: tell the server this device's zone if it has not heard it
    // yet. A new op triggers `schedule` via the enqueue listener.
    const syncTimeZone = () => {
      if (!token) return;
      void enqueueDayBoundaryTimeZoneIfUnsynced(db).catch(() => {
        // Retried on the next foreground.
      });
    };

    const unsubscribeEnqueue = subscribePendingOpEnqueue(schedule);
    syncTimeZone();
    run();
    reconcileXp(true);
    const appSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        // Back in the foreground the network may be back: retry now.
        retryAt = 0;
        xpCheckedAt = 0;
        syncTimeZone();
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
