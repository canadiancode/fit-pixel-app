import * as Notifications from "expo-notifications";
import { router, usePathname } from "expo-router";
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
import { Alert, AppState, Linking } from "react-native";

import { WEIGH_IN_REMINDER_KIND } from "@/features/actions/weight/weigh-in-reminder";
import { useAuth } from "@/features/auth/auth-context";
import {
  canSoftAsk,
  getSocialPushOptOut,
  markSoftAsked,
  registerDeviceForPush,
  setSocialPushOptOut,
  unregisterDeviceForPush,
} from "@/features/push/push-registration";
import { useNotifications } from "@/features/social/notifications-context";
import { markNotificationsRead } from "@/lib/api/chat";

/** Matches the server's push `data` (fit-pixel-server/src/services/expo-push.ts). */
type PushData = {
  notificationId?: string;
  kind?:
    | "friend_request"
    | "friend_accepted"
    | "dm_message"
    | typeof WEIGH_IN_REMINDER_KIND;
  actorId?: string | null;
  conversationId?: string | null;
};

/** Current route, so a DM push for the open thread stays quiet. */
let activePathname = "";

function isViewingConversation(data: PushData): boolean {
  return (
    data.kind === "dm_message" &&
    !!data.conversationId &&
    activePathname.endsWith(`/dm/${data.conversationId}`)
  );
}

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const quiet = isViewingConversation(
      (notification.request.content.data ?? {}) as PushData,
    );
    return {
      shouldShowBanner: !quiet,
      shouldShowList: !quiet,
      shouldPlaySound: !quiet,
      shouldSetBadge: true,
    };
  },
});

type PushContextValue = {
  /** Friends & messages pushes will reach this device. */
  enabled: boolean;
  /** False until permission + the device opt-out have been read. */
  loaded: boolean;
  setEnabled: (on: boolean) => Promise<void>;
  /**
   * Call after a social action (friend request, accept, DM). Offers to turn on
   * notifications once, then at most weekly, while the OS has never asked.
   */
  askAfterSocialAction: () => void;
};

const PushContext = createContext<PushContextValue | null>(null);

/**
 * OS push notifications for friend requests / accepts and DMs: permission,
 * Expo token registration with the API, badge, and routing taps to the DM or
 * the sender's Pixel card.
 */
export function PushProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const userId = user?.id ?? null;
  const accessTokenRef = useRef<string | null>(null);
  accessTokenRef.current = session?.access_token ?? null;
  const { unreadCount, loaded: notificationsLoaded, markReadLocally } =
    useNotifications();

  const [permission, setPermission] =
    useState<Notifications.PermissionStatus | null>(null);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [optOut, setOptOut] = useState<boolean | null>(null);
  const registeredFor = useRef<string | null>(null);
  /** Device token last registered; the OS re-emits it on every fetch. */
  const lastDeviceToken = useRef<string | null>(null);
  const registering = useRef(false);
  const asking = useRef(false);

  const pathname = usePathname();
  useEffect(() => {
    activePathname = pathname;
  }, [pathname]);

  const refreshPermission = useCallback(async () => {
    const current = await Notifications.getPermissionsAsync();
    setPermission(current.status);
    setCanAskAgain(current.canAskAgain);
    return current;
  }, []);

  useEffect(() => {
    void getSocialPushOptOut().then(setOptOut);
    void refreshPermission();
    const sub = AppState.addEventListener("change", (state) => {
      // The user may have flipped the switch in iOS Settings.
      if (state === "active") void refreshPermission();
    });
    return () => sub.remove();
  }, [refreshPermission]);

  const enabled = permission === "granted" && optOut === false;

  const register = useCallback(
    async (rotated?: Notifications.DevicePushToken) => {
      const accessToken = accessTokenRef.current;
      if (!accessToken || registering.current) return;
      registering.current = true;
      try {
        const device = rotated ?? (await Notifications.getDevicePushTokenAsync());
        lastDeviceToken.current = String(device.data);
        await registerDeviceForPush(accessToken, device);
      } catch {
        // Older API / offline / simulator without APNs: retried next launch.
        registeredFor.current = null;
      } finally {
        registering.current = false;
      }
    },
    [],
  );

  useEffect(() => {
    if (!enabled || !userId || registeredFor.current === userId) return;
    registeredFor.current = userId;
    void register();
  }, [enabled, register, userId]);

  useEffect(() => {
    if (!enabled) return;
    // Fetching the device token re-emits it here, so only a token that
    // actually changed (APNs / FCM rotation) is worth re-registering;
    // reacting to every event re-registered in a tight loop.
    const sub = Notifications.addPushTokenListener((device) => {
      if (String(device.data) === lastDeviceToken.current) return;
      void register(device);
    });
    return () => sub.remove();
  }, [enabled, register]);

  useEffect(() => {
    if (!notificationsLoaded || permission !== "granted") return;
    void Notifications.setBadgeCountAsync(unreadCount).catch(() => undefined);
  }, [notificationsLoaded, permission, unreadCount]);

  useEffect(
    () => () => {
      // Signed out: don't leave the last account's count on the icon.
      void Notifications.setBadgeCountAsync(0).catch(() => undefined);
    },
    [],
  );

  const handled = useRef(new Set<string>());
  const openFromPush = useCallback(
    (response: Notifications.NotificationResponse) => {
      if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
        return;
      }
      const id = response.notification.request.identifier;
      if (handled.current.has(id)) return;
      handled.current.add(id);
      Notifications.clearLastNotificationResponse();

      const data = (response.notification.request.content.data ?? {}) as PushData;
      if (data.kind === WEIGH_IN_REMINDER_KIND) {
        router.push("/(tabs)/actions/weight");
        return;
      }
      if (data.kind === "dm_message" && data.conversationId) {
        // Opening the thread clears its notification server-side.
        router.push({
          pathname: "/(tabs)/chat/dm/[conversationId]",
          params: { conversationId: data.conversationId },
        });
        return;
      }
      if (data.notificationId) {
        markReadLocally([data.notificationId]);
        void markNotificationsRead([data.notificationId]).catch(() => undefined);
      }
      if (data.actorId) {
        router.push({
          pathname: "/(tabs)/chat/pixel/[userId]",
          params: { userId: data.actorId },
        });
      }
    },
    [markReadLocally],
  );

  useEffect(() => {
    // Cold start from a tap: the response arrived before this listener.
    const last = Notifications.getLastNotificationResponse();
    if (last) openFromPush(last);
    const sub = Notifications.addNotificationResponseReceivedListener(openFromPush);
    return () => sub.remove();
  }, [openFromPush]);

  const requestPermission = useCallback(async () => {
    const result = await Notifications.requestPermissionsAsync();
    setPermission(result.status);
    setCanAskAgain(result.canAskAgain);
    return result.status;
  }, []);

  const setEnabled = useCallback(
    async (on: boolean) => {
      if (!on) {
        setOptOut(true);
        registeredFor.current = null;
        await setSocialPushOptOut(true);
        await unregisterDeviceForPush(accessTokenRef.current).catch(
          () => undefined,
        );
        return;
      }
      setOptOut(false);
      await setSocialPushOptOut(false);
      const current = await refreshPermission();
      if (current.status === "granted") return;
      if (current.canAskAgain) {
        await requestPermission();
        return;
      }
      Alert.alert(
        "Notifications are off",
        "Turn on notifications for Fit Pixel in iOS Settings to get friend requests and messages.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Open Settings", onPress: () => void Linking.openSettings() },
        ],
      );
    },
    [refreshPermission, requestPermission],
  );

  const askAfterSocialAction = useCallback(() => {
    if (optOut !== false || permission !== "undetermined" || !canAskAgain) {
      return;
    }
    if (asking.current) return;
    asking.current = true;
    void (async () => {
      if (!(await canSoftAsk())) {
        asking.current = false;
        return;
      }
      Alert.alert(
        "Turn on notifications?",
        "Get a heads-up when a Pixel messages you or answers your friend request.",
        [
          {
            text: "Not now",
            style: "cancel",
            onPress: () => {
              asking.current = false;
              void markSoftAsked();
            },
          },
          {
            text: "Turn on",
            onPress: () => {
              void requestPermission().finally(() => {
                asking.current = false;
              });
            },
          },
        ],
        { cancelable: false },
      );
    })();
  }, [canAskAgain, optOut, permission, requestPermission]);

  const value = useMemo(
    () => ({
      enabled,
      loaded: permission != null && optOut != null,
      setEnabled,
      askAfterSocialAction,
    }),
    [askAfterSocialAction, enabled, optOut, permission, setEnabled],
  );

  return <PushContext.Provider value={value}>{children}</PushContext.Provider>;
}

export function usePush(): PushContextValue {
  const ctx = useContext(PushContext);
  if (ctx == null) {
    throw new Error("usePush must be used within PushProvider");
  }
  return ctx;
}
