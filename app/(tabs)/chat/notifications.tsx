import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_INPUT_BOARDER_COLOR,
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { ChatSubScreenLayout } from "@/features/chat/components/chat-sub-screen-layout";
import { FriendshipButton } from "@/features/social/components/friendship-button";
import { useNotifications } from "@/features/social/notifications-context";
import { useFriendshipActions } from "@/features/social/use-friendship-actions";
import {
  listFriends,
  markNotificationsRead,
  type NotificationItem,
} from "@/lib/api/chat";

const UNREAD_DOT_COLOR = "#7CFFB2";

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

function describe(item: NotificationItem): string {
  switch (item.kind) {
    case "friend_request":
      return `${item.actorDisplayName} sent you a friend request`;
    case "friend_accepted":
      return `${item.actorDisplayName} accepted your friend request`;
    case "dm_message":
      return `${item.actorDisplayName}: ${item.body ?? "sent you a message"}`;
  }
}

export default function ChatNotificationsScreen() {
  const { notifications, unreadCount, loaded, refresh, markReadLocally } =
    useNotifications();
  const friendActions = useFriendshipActions();
  /** Requests still awaiting an answer (a read request may be answered already). */
  const [pendingFrom, setPendingFrom] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const unreadRef = useRef(unreadCount);
  unreadRef.current = unreadCount;

  const loadPending = useCallback(() => {
    void listFriends()
      .then((overview) =>
        setPendingFrom(new Set(overview.incoming.map((item) => item.userId))),
      )
      .catch(() => undefined);
  }, []);

  // Opening the feed marks everything read (rows keep their dot until next visit).
  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => {
        if (unreadRef.current > 0) {
          markReadLocally();
          void markNotificationsRead().catch(() => undefined);
        }
      };
    }, [markReadLocally, refresh]),
  );

  useEffect(() => {
    loadPending();
  }, [notifications, loadPending]);

  const openItem = useCallback(
    (item: NotificationItem) => {
      if (!item.read) {
        markReadLocally([item.id]);
        void markNotificationsRead([item.id]).catch(() => undefined);
      }
      if (item.kind === "dm_message" && item.conversationId) {
        router.push({
          pathname: "/(tabs)/chat/dm/[conversationId]",
          params: { conversationId: item.conversationId },
        });
        return;
      }
      if (item.actorId) {
        router.push({
          pathname: "/(tabs)/chat/pixel/[userId]",
          params: { userId: item.actorId },
        });
      }
    },
    [markReadLocally],
  );

  return (
    <ChatSubScreenLayout>
      <ThemedText
        lightColor={APP_SHELL_MAIN_TEXT_COLOR}
        darkColor={APP_SHELL_MAIN_TEXT_COLOR}
        style={styles.title}
        accessibilityRole="header"
      >
        Notifications
      </ThemedText>
      {loaded && notifications.length === 0 ? (
        <ThemedText
          style={styles.body}
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
        >
          Friend requests and new messages will appear here.
        </ThemedText>
      ) : null}
      {!loaded ? (
        <ThemedText
          style={styles.body}
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
        >
          Loading...
        </ThemedText>
      ) : null}
      <View style={styles.list} accessibilityRole="list">
        {notifications.map((item) => {
          const target =
            item.actorId != null
              ? { userId: item.actorId, displayName: item.actorDisplayName }
              : null;
          const showRequestActions =
            item.kind === "friend_request" &&
            target != null &&
            pendingFrom.has(target.userId);
          return (
            <View key={item.id} style={styles.row}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${describe(item)}${item.read ? "" : ", unread"}`}
                onPress={() => openItem(item)}
                style={({ pressed }) => (pressed ? styles.pressed : undefined)}
              >
                <View style={styles.rowMain}>
                  <View style={styles.dotSlot}>
                    {!item.read ? <View style={styles.unreadDot} /> : null}
                  </View>
                  <View style={styles.rowText}>
                    <ThemedText
                      lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                      darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                      style={styles.rowTitle}
                      numberOfLines={2}
                    >
                      {describe(item)}
                    </ThemedText>
                    <ThemedText
                      lightColor={APP_SHELL_LABEL_COLOR}
                      darkColor={APP_SHELL_LABEL_COLOR}
                      style={styles.rowMeta}
                    >
                      {timeAgo(item.createdAt)}
                    </ThemedText>
                  </View>
                </View>
              </Pressable>
              {showRequestActions && target ? (
                <View style={styles.rowActions}>
                  <FriendshipButton
                    compact
                    target={target}
                    status="pending_incoming"
                    actions={friendActions}
                    onChange={() => {
                      markReadLocally([item.id]);
                      loadPending();
                    }}
                  />
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </ChatSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    lineHeight: 22,
  },
  body: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 22,
  },
  list: {
    marginTop: 12,
  },
  row: {
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: APP_SHELL_INPUT_BOARDER_COLOR,
  },
  rowMain: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  pressed: {
    opacity: 0.85,
  },
  dotSlot: {
    width: 10,
    paddingTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: UNREAD_DOT_COLOR,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  rowTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 16,
  },
  rowMeta: {
    fontSize: 11,
    lineHeight: 14,
  },
  rowActions: {
    paddingLeft: 18,
  },
});
