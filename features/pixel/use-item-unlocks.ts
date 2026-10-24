import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";

import { listInventoryUnlocks, type InventoryUnlockRecord } from "@/lib/db";

import type { PixelItemId } from "./types";

/**
 * When each item joined this player's inventory, read from the local unlock
 * log. Starter items have no entry (they come with the account).
 */
export function useItemUnlocks(): ReadonlyMap<PixelItemId, InventoryUnlockRecord> {
  const db = useSQLiteContext();
  const [unlocks, setUnlocks] = useState<
    ReadonlyMap<PixelItemId, InventoryUnlockRecord>
  >(() => new Map());

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void listInventoryUnlocks(db)
        .then((rows) => {
          if (!cancelled) {
            setUnlocks(new Map(rows.map((row) => [row.itemId, row])));
          }
        })
        .catch(() => {
          // History is a nice-to-have; cards fall back to no date.
        });
      return () => {
        cancelled = true;
      };
    }, [db]),
  );

  return unlocks;
}
