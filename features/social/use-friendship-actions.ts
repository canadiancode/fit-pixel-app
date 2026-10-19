import { useCallback, useState } from "react";
import { Alert } from "react-native";

import { usePush } from "@/features/push/push-context";
import { useNotifications } from "@/features/social/notifications-context";
import {
  FitPixelApiError,
  removeFriend,
  respondToFriendRequest,
  sendFriendRequest,
  type FriendshipStatus,
} from "@/lib/api/chat";

type Target = { userId: string; displayName: string };

function errorMessage(err: unknown): string {
  if (err instanceof FitPixelApiError) {
    // Older API deploys have no /v1/friends routes yet.
    if (err.status === 404 && err.message === "Not found") {
      return "Friends aren't available yet. Try again after the next update.";
    }
    return err.message;
  }
  return "Please try again.";
}

/**
 * Friend request lifecycle for one Pixel. Each action resolves to the new
 * status (or `null` when cancelled / failed) and refreshes notifications.
 */
export function useFriendshipActions() {
  const { refresh } = useNotifications();
  const { askAfterSocialAction } = usePush();
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const run = useCallback(
    async (
      target: Target,
      title: string,
      action: () => Promise<FriendshipStatus>,
    ): Promise<FriendshipStatus | null> => {
      setBusyUserId(target.userId);
      try {
        const next = await action();
        void refresh();
        return next;
      } catch (err) {
        Alert.alert(title, errorMessage(err));
        return null;
      } finally {
        setBusyUserId(null);
      }
    },
    [refresh],
  );

  const add = useCallback(
    async (target: Target) => {
      const next = await run(target, "Could not send request", () =>
        sendFriendRequest(target.userId),
      );
      // They'll answer later: a good moment to offer push notifications.
      if (next) askAfterSocialAction();
      return next;
    },
    [askAfterSocialAction, run],
  );

  const accept = useCallback(
    async (target: Target) => {
      const next = await run(target, "Could not accept", () =>
        respondToFriendRequest(target.userId, true),
      );
      if (next) askAfterSocialAction();
      return next;
    },
    [askAfterSocialAction, run],
  );

  const decline = useCallback(
    (target: Target) =>
      run(target, "Could not decline", () =>
        respondToFriendRequest(target.userId, false),
      ),
    [run],
  );

  const cancel = useCallback(
    (target: Target) =>
      run(target, "Could not cancel request", async () => {
        await removeFriend(target.userId);
        return "none" as const;
      }),
    [run],
  );

  /** Confirms first; resolves `null` if the user backs out. */
  const remove = useCallback(
    (target: Target) =>
      new Promise<FriendshipStatus | null>((resolve) => {
        Alert.alert(
          `Remove ${target.displayName}?`,
          "You'll stop being friends. You can still message each other.",
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
            {
              text: "Remove",
              style: "destructive",
              onPress: () => {
                void run(target, "Could not remove friend", async () => {
                  await removeFriend(target.userId);
                  return "none" as const;
                }).then(resolve);
              },
            },
          ],
          { cancelable: true, onDismiss: () => resolve(null) },
        );
      }),
    [run],
  );

  return { busyUserId, add, accept, decline, cancel, remove };
}
