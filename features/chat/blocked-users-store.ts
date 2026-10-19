import { useCallback, useEffect, useSyncExternalStore } from "react";

import { useAuth } from "@/features/auth/auth-context";
import {
  blockUser,
  listBlockedUsers,
  unblockUser,
  type BlockedUserItem,
} from "@/lib/api/chat";

type State = {
  /** Account the list belongs to; a different signed-in user refetches. */
  ownerId: string | null;
  blocked: readonly BlockedUserItem[];
  blockedIds: ReadonlySet<string>;
  loaded: boolean;
  /** Last fetch failed before any list arrived (e.g. API unreachable). */
  loadFailed: boolean;
};

const EMPTY: State = {
  ownerId: null,
  blocked: [],
  blockedIds: new Set(),
  loaded: false,
  loadFailed: false,
};

let state: State = EMPTY;
let inflight: { ownerId: string; promise: Promise<void> } | null = null;
const listeners = new Set<() => void>();

function setState(next: State) {
  state = next;
  for (const listener of listeners) listener();
}

function withBlocked(ownerId: string, blocked: readonly BlockedUserItem[]) {
  return {
    ownerId,
    blocked,
    blockedIds: new Set(blocked.map((item) => item.userId)),
    loaded: true,
    loadFailed: false,
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

async function load(ownerId: string): Promise<void> {
  if (inflight?.ownerId === ownerId) return inflight.promise;
  if (state.ownerId === ownerId && state.loadFailed) {
    setState({ ...state, loadFailed: false });
  }
  const promise = listBlockedUsers()
    .then((blocked) => {
      if (state.ownerId === ownerId) setState(withBlocked(ownerId, blocked));
    })
    .catch(() => {
      // Keep the last known list; the server still filters blocked content.
      // With no list yet, flag it so the UI can offer a retry, not spin.
      if (state.ownerId === ownerId && !state.loaded) {
        setState({ ...state, loadFailed: true });
      }
    })
    .finally(() => {
      if (inflight?.promise === promise) inflight = null;
    });
  inflight = { ownerId, promise };
  return promise;
}

/**
 * Blocked Pixels for the signed-in user. The server already hides blocked
 * users from history, DMs and search; this covers realtime messages and UI.
 */
export function useBlockedUsers() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    if (!userId) {
      if (state.ownerId !== null) setState(EMPTY);
      return;
    }
    if (state.ownerId !== userId) {
      setState({ ...EMPTY, ownerId: userId });
      void load(userId);
    }
  }, [userId]);

  const block = useCallback(
    async (target: { userId: string; displayName: string }) => {
      await blockUser(target.userId);
      if (!userId || state.ownerId !== userId) return;
      if (state.blockedIds.has(target.userId)) return;
      setState(
        withBlocked(userId, [
          {
            userId: target.userId,
            displayName: target.displayName,
            blockedAt: new Date().toISOString(),
          },
          ...state.blocked,
        ]),
      );
    },
    [userId],
  );

  const unblock = useCallback(
    async (targetUserId: string) => {
      await unblockUser(targetUserId);
      if (!userId || state.ownerId !== userId) return;
      setState(
        withBlocked(
          userId,
          state.blocked.filter((item) => item.userId !== targetUserId),
        ),
      );
    },
    [userId],
  );

  const refresh = useCallback(async () => {
    if (userId) await load(userId);
  }, [userId]);

  const isCurrent = snapshot.ownerId === userId;
  return {
    blocked: isCurrent ? snapshot.blocked : EMPTY.blocked,
    blockedIds: isCurrent ? snapshot.blockedIds : EMPTY.blockedIds,
    loaded: isCurrent && snapshot.loaded,
    loadFailed: isCurrent && snapshot.loadFailed,
    block,
    unblock,
    refresh,
  };
}
