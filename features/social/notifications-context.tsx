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

import { useAuth } from "@/features/auth/auth-context";
import { listNotifications, type NotificationItem } from "@/lib/api/chat";
import { getSupabaseClient } from "@/lib/supabase/client";

type NotificationsContextValue = {
  notifications: readonly NotificationItem[];
  unreadCount: number;
  /** False until the first fetch settles (success or failure). */
  loaded: boolean;
  /** Bumps on every server-side change so friend / DM lists can refetch. */
  changeKey: number;
  refresh: () => Promise<void>;
  /** Optimistically mark rows read locally (server call is the caller's job). */
  markReadLocally: (ids?: readonly string[]) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

/**
 * In-app notifications (friend requests / accepts, DMs) for the signed-in user.
 * Refetches on realtime inserts/updates to the user's rows and when the app
 * returns to the foreground.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [changeKey, setChangeKey] = useState(0);
  const inFlight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    if (inFlight.current) return inFlight.current;
    const run = listNotifications()
      .then((result) => {
        setNotifications(result.notifications);
        setUnreadCount(result.unreadCount);
      })
      .catch(() => {
        // Keep the last known list (older servers have no /v1/notifications).
      })
      .finally(() => {
        inFlight.current = null;
        setLoaded(true);
      });
    inFlight.current = run;
    return run;
  }, [userId]);

  useEffect(() => {
    setNotifications([]);
    setUnreadCount(0);
    setLoaded(false);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    const client = getSupabaseClient();
    if (!client) return;
    const channel = client.channel(`notifications:${userId}`).on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      () => {
        setChangeKey((key) => key + 1);
        void refresh();
      },
    );
    void channel.subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [refresh, userId]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  const markReadLocally = useCallback((ids?: readonly string[]) => {
    const only = ids ? new Set(ids) : null;
    const shouldClear = (item: NotificationItem) =>
      !item.read && (only == null || only.has(item.id));
    const cleared = notificationsRef.current.filter(shouldClear).length;
    setNotifications((current) =>
      current.map((item) =>
        shouldClear(item) ? { ...item, read: true } : item,
      ),
    );
    // Unread rows past the first page are only cleared by "mark all".
    setUnreadCount((count) => (only ? Math.max(0, count - cleared) : 0));
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loaded,
      changeKey,
      refresh,
      markReadLocally,
    }),
    [notifications, unreadCount, loaded, changeKey, refresh, markReadLocally],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (ctx == null) {
    throw new Error(
      "useNotifications must be used within NotificationsProvider",
    );
  }
  return ctx;
}
