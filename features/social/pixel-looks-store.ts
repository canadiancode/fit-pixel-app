import { useEffect, useMemo, useSyncExternalStore } from "react";

import { listPixelLooks, type EquippedLook } from "@/lib/api/chat";

/** `null` = lookup failed (older API); missing key = not fetched yet. */
const looks = new Map<string, EquippedLook | null>();
const inFlight = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

const BATCH_MAX = 50;

function emit() {
  version += 1;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function fetchMissing(userIds: readonly string[]) {
  const missing = userIds.filter((id) => !looks.has(id) && !inFlight.has(id));
  for (let i = 0; i < missing.length; i += BATCH_MAX) {
    const batch = missing.slice(i, i + BATCH_MAX);
    for (const id of batch) inFlight.add(id);
    void listPixelLooks(batch)
      .then((rows) => {
        const found = new Map(rows.map((row) => [row.userId, row.equipped]));
        // Deleted accounts come back missing: show the starter look.
        for (const id of batch) looks.set(id, found.get(id) ?? {});
      })
      .catch(() => {
        for (const id of batch) looks.set(id, null);
      })
      .finally(() => {
        for (const id of batch) inFlight.delete(id);
        emit();
      });
  }
}

/** Teach the cache a look we already have (e.g. a profile fetch). */
export function rememberPixelLook(userId: string, equipped: EquippedLook) {
  looks.set(userId, equipped);
  emit();
}

/**
 * Equipped looks for chat senders, fetched in batches and cached for the
 * app session. Returns `undefined` for ids still loading.
 */
export function usePixelLooks(
  userIds: readonly string[],
): (userId: string) => EquippedLook | null | undefined {
  const key = useMemo(() => [...new Set(userIds)].sort().join(","), [userIds]);
  const snapshot = useSyncExternalStore(subscribe, () => version);

  useEffect(() => {
    if (key) fetchMissing(key.split(","));
  }, [key]);

  // `snapshot` re-creates the getter whenever the cache changes.
  return useMemo(() => {
    void snapshot;
    return (userId: string) => looks.get(userId);
  }, [snapshot]);
}
