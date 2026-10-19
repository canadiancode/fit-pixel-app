import { router } from "expo-router";
import { useMemo } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { ActionListSectionDivider } from "@/features/actions/components/action-list-section-divider";
import { ChatEmptyState } from "@/features/chat/components/chat-empty-state";
import { ChatListRow } from "@/features/chat/components/chat-list-row";
import { CHAT_CARD_RIM } from "@/features/chat/constants";
import { timeAgo } from "@/features/chat/time-ago";
import { PixelHeadAvatar } from "@/features/social/components/pixel-head-avatar";
import { usePixelLooks } from "@/features/social/pixel-looks-store";
import type { DmListItem, FriendItem } from "@/lib/api/chat";

const SEND_MESSAGE_ICON = require("@/assets/icons/send-message.png");
const ROW_AVATAR_SIZE = 44;
const STRIP_AVATAR_SIZE = 52;
const STRIP_ITEM_WIDTH = 68;

type Props = {
  dms: DmListItem[] | null;
  friends: FriendItem[];
  error: string | null;
  query: string;
  refreshing: boolean;
  onRefresh: () => void;
  /** Opens (or creates) the DM with a friend. */
  onMessageFriend: (userId: string) => void;
  openingDmFor: string | null;
  onFindFriends: () => void;
};

function openDm(conversationId: string) {
  router.push({
    pathname: "/(tabs)/chat/dm/[conversationId]",
    params: { conversationId },
  });
}

/** DM inbox, with a quick "start a chat" strip of friends on top. */
export function ChatMessagesSection({
  dms,
  friends,
  error,
  query,
  refreshing,
  onRefresh,
  onMessageFriend,
  openingDmFor,
  onFindFriends,
}: Props) {
  const q = query.trim().toLowerCase();

  const visible = useMemo(
    () =>
      (dms ?? []).filter(
        (dm) =>
          !q ||
          dm.peerDisplayName.toLowerCase().includes(q) ||
          (dm.lastMessageBody ?? "").toLowerCase().includes(q),
      ),
    [dms, q],
  );

  const peerIds = useMemo(() => (dms ?? []).map((dm) => dm.peerUserId), [dms]);
  const lookFor = usePixelLooks(peerIds);
  // Friends already carry their look; use it while (or if) the lookup misses.
  const friendLooks = useMemo(
    () => new Map(friends.map((friend) => [friend.userId, friend.equipped])),
    [friends],
  );

  const showStrip = !q && friends.length > 0;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={APP_SHELL_MAIN_TEXT_COLOR}
        />
      }
    >
      {error ? (
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.hint}
        >
          {error}
        </ThemedText>
      ) : null}

      {showStrip ? (
        <>
          <ActionListSectionDivider label="start a chat" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.strip}
            style={styles.stripScroll}
          >
            {friends.map((friend) => (
              <Pressable
                key={friend.userId}
                accessibilityRole="button"
                accessibilityLabel={`Message ${friend.displayName}`}
                disabled={openingDmFor != null}
                onPress={() => onMessageFriend(friend.userId)}
              >
                {({ pressed }) => (
                  <View
                    style={[
                      styles.stripItem,
                      (pressed || openingDmFor === friend.userId) &&
                        styles.pressed,
                    ]}
                  >
                    <PixelHeadAvatar
                      equipped={friend.equipped}
                      size={STRIP_AVATAR_SIZE}
                      style={styles.stripAvatar}
                    />
                    <ThemedText
                      lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                      darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                      style={styles.stripName}
                      numberOfLines={1}
                    >
                      {friend.displayName}
                    </ThemedText>
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      {visible.length > 0 ? (
        <>
          {showStrip || q ? (
            <ActionListSectionDivider label={q ? "results" : "conversations"} />
          ) : null}
          {visible.map((dm) => (
            <ChatListRow
              key={dm.conversationId}
              leading={
                <PixelHeadAvatar
                  equipped={
                    lookFor(dm.peerUserId) ?? friendLooks.get(dm.peerUserId)
                  }
                  size={ROW_AVATAR_SIZE}
                />
              }
              title={dm.peerDisplayName}
              subtitle={dm.lastMessageBody ?? "Say hi!"}
              meta={dm.lastMessageAt ? timeAgo(dm.lastMessageAt) : null}
              unread={dm.hasUnread === true}
              onPress={() => openDm(dm.conversationId)}
              accessibilityLabel={`Chat with ${dm.peerDisplayName}${dm.hasUnread ? ", unread" : ""}${dm.lastMessageBody ? `. ${dm.lastMessageBody}` : ""}`}
            />
          ))}
        </>
      ) : dms == null ? (
        error ? null : (
          <ThemedText
            lightColor={APP_SHELL_LABEL_COLOR}
            darkColor={APP_SHELL_LABEL_COLOR}
            style={styles.hint}
          >
            Loading messages...
          </ThemedText>
        )
      ) : q ? (
        <ChatEmptyState
          icon={SEND_MESSAGE_ICON}
          title="No matches"
          body="No conversations match that search."
        />
      ) : (
        <ChatEmptyState
          icon={SEND_MESSAGE_ICON}
          title="No messages yet"
          body={
            friends.length > 0
              ? "Tap a friend above to start a conversation."
              : "Add friends to start a private conversation."
          }
          action={
            friends.length > 0
              ? undefined
              : { label: "Find friends", onPress: onFindFriends }
          }
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 4,
    paddingBottom: 24,
    gap: 8,
  },
  hint: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 16,
    paddingVertical: 8,
  },
  stripScroll: {
    marginHorizontal: -16,
    flexGrow: 0,
  },
  strip: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 6,
  },
  stripItem: {
    width: STRIP_ITEM_WIDTH,
    alignItems: "center",
    gap: 6,
  },
  stripAvatar: {
    borderWidth: 2,
    borderColor: CHAT_CARD_RIM,
  },
  stripName: {
    alignSelf: "stretch",
    textAlign: "center",
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 12,
  },
  pressed: {
    opacity: 0.7,
  },
});
