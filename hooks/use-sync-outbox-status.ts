import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";

import {
  countDrainableOps,
  subscribePendingOpEnqueue,
  type DrainableOpCounts,
} from "@/lib/db";
import {
  getLastDrainError,
  subscribeDrainStatus,
} from "@/lib/sync/drain-status";

export type SyncOutboxStatus = DrainableOpCounts & {
  lastError: string | null;
  waiting: number;
};

const EMPTY: DrainableOpCounts = { pending: 0, failed: 0 };

export function useSyncOutboxStatus(): SyncOutboxStatus {
  const db = useSQLiteContext();
  const [counts, setCounts] = useState<DrainableOpCounts>(EMPTY);
  const [lastError, setLastError] = useState<string | null>(getLastDrainError);

  const refresh = useCallback(() => {
    setLastError(getLastDrainError());
    void countDrainableOps(db).then(setCounts);
  }, [db]);

  useEffect(() => {
    refresh();
    const unsubEnqueue = subscribePendingOpEnqueue(refresh);
    const unsubDrain = subscribeDrainStatus(refresh);
    return () => {
      unsubEnqueue();
      unsubDrain();
    };
  }, [refresh]);

  return {
    ...counts,
    lastError,
    waiting: counts.pending + counts.failed,
  };
}
