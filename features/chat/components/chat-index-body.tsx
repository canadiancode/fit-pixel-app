import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_INPUT_BOARDER_COLOR,
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_SECONDARY_BACKGROUND,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { useAuth } from "@/features/auth/auth-context";
import { useChatSearch } from "@/features/chat/chat-search-context";
import { ViewGymChatsCard } from "@/features/chat/components/view-gym-chats-card";
import {
  FriendshipButton,
  Pill,
} from "@/features/social/components/friendship-button";
import { PixelHeadAvatar } from "@/features/social/components/pixel-head-avatar";
import { useNotifications } from "@/features/social/notifications-context";
import { useFriendshipActions } from "@/features/social/use-friendship-actions";
import {
  createOrGetDm,
  listDms,
  listFriends,
  searchPixels,
  type DmListItem,
  type FriendsOverview,
  type FriendshipStatus,
  type PixelSearchItem,
} from "@/lib/api/chat";
import { FitPixelApiError } from "@/lib/api/client";

const FOOTER_CARD_ESTIMATED_HEIGHT = 100;
const ROW_AVATAR_SIZE = 40;
const UNREAD_DOT_COLOR = "#7CFFB2";

const EMPTY_FRIENDS: FriendsOverview = {
  friends: [],
  incoming: [],
  outgoing: [],
};

function openPixel(userId: string) {
  router.push({
    pathname: "/(tabs)/chat/pixel/[userId]",
    params: { userId },
  });
}

function openDm(conversationId: string) {
  router.push({
    pathname: "/(tabs)/chat/dm/[conversationId]",
    params: { conversationId },
  });
}

export function ChatIndexBody() {
  const { query } = useChatSearch();
  const { session } = useAuth();
  const { changeKey } = useNotifications();
  const friendActions = useFriendshipActions();
  const [dms, setDms] = useState<DmListItem[]>([]);
  const [friends, setFriends] = useState<FriendsOverview>(EMPTY_FRIENDS);
  const [pixels, setPixels] = useState<PixelSearchItem[]>([]);
  const [searchStatus, setSearchStatus] = useState<
    Record<string, FriendshipStatus>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [openingDmFor, setOpeningDmFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.access_token) {
      setDms([]);
      setFriends(EMPTY_FRIENDS);
      return;
    }
    const [dmResult, friendsResult] = await Promise.allSettled([
      listDms(),
      listFriends(),
    ]);
    if (dmResult.status === "fulfilled") {
      setDms(dmResult.value);
      setError(null);
    } else {
      const err = dmResult.reason;
      if (!(err instanceof FitPixelApiError && err.status === 401)) {
        setError(
          err instanceof FitPixelApiError
            ? err.message
            : "Could not load messages.",
        );
      }
    }
    // Older API deploys have no /v1/friends; keep the section empty.
    if (friendsResult.status === "fulfilled") {
      setFriends(friendsResult.value);
    }
  }, [session?.access_token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Friend requests / accepts / new DMs arrive via the notifications channel.
  useEffect(() => {
    if (changeKey > 0) void load();
  }, [changeKey, load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load().finally(() => setRefreshing(false));
  }, [load]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || !session?.access_token) {
      setPixels([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      void searchPixels(q)
        .then((rows) => {
          if (cancelled) return;
          setPixels(rows);
          setSearchStatus({});
        })
        .catch(() => {
          if (!cancelled) setPixels([]);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, session?.access_token]);

  const searching = query.trim().length >= 2;

  const statusFor = useCallback(
    (pixel: PixelSearchItem): FriendshipStatus =>
      searchStatus[pixel.userId] ?? pixel.friendship ?? "none",
    [searchStatus],
  );

  const messageFriend = useCallback(
    async (userId: string) => {
      if (openingDmFor) return;
      setOpeningDmFor(userId);
      try {
        const { conversationId } = await createOrGetDm(userId);
        openDm(conversationId);
      } catch (err) {
        Alert.alert(
          "Could not open chat",
          err instanceof FitPixelApiError ? err.message : "Please try again.",
        );
      } finally {
        setOpeningDmFor(null);
      }
    },
    [openingDmFor],
  );

  const pendingCount = friends.incoming.length;
  const friendCountLabel = useMemo(
    () =>
      friends.friends.length > 0
        ? `Friends (${friends.friends.length})`
        : "Friends",
    [friends.friends.length],
  );

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={APP_SHELL_MAIN_TEXT_COLOR}
          />
        }
      >
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.heading}
        >
          Make friends!
        </ThemedText>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.body}
        >
          Search for Pixels by name above
        </ThemedText>
        {error ? (
          <ThemedText
            lightColor={APP_SHELL_LABEL_COLOR}
            darkColor={APP_SHELL_LABEL_COLOR}
            style={styles.body}
          >
            {error}
          </ThemedText>
        ) : null}

        {searching ? (
          <View style={styles.section}>
            {pixels.length === 0 ? (
              <ThemedText
                lightColor={APP_SHELL_LABEL_COLOR}
                darkColor={APP_SHELL_LABEL_COLOR}
                style={styles.body}
              >
                No Pixels match that name.
              </ThemedText>
            ) : (
              pixels.map((pixel) => (
                <PersonRow
                  key={pixel.userId}
                  displayName={pixel.displayName}
                  equipped={pixel.equipped}
                  onPress={() => openPixel(pixel.userId)}
                  trailing={
                    <FriendshipButton
                      compact
                      target={pixel}
                      status={statusFor(pixel)}
                      actions={friendActions}
                      onChange={(next) =>
                        setSearchStatus((current) => ({
                          ...current,
                          [pixel.userId]: next,
                        }))
                      }
                    />
                  }
                />
              ))
            )}
          </View>
        ) : (
          <>
            {pendingCount > 0 ? (
              <View style={styles.section}>
                <SectionTitle>{`Friend requests (${pendingCount})`}</SectionTitle>
                {friends.incoming.map((request) => (
                  <PersonRow
                    key={request.userId}
                    displayName={request.displayName}
                    equipped={request.equipped}
                    caption="Wants to be friends"
                    onPress={() => openPixel(request.userId)}
                    trailing={
                      <FriendshipButton
                        compact
                        target={request}
                        status="pending_incoming"
                        actions={friendActions}
                        onChange={() => void load()}
                      />
                    }
                  />
                ))}
              </View>
            ) : null}

            <View style={styles.section}>
              <SectionTitle>{friendCountLabel}</SectionTitle>
              {friends.friends.length === 0 ? (
                <ThemedText
                  lightColor={APP_SHELL_LABEL_COLOR}
                  darkColor={APP_SHELL_LABEL_COLOR}
                  style={styles.hint}
                >
                  {friends.outgoing.length > 0
                    ? `Waiting on ${friends.outgoing.length} request${friends.outgoing.length === 1 ? "" : "s"}.`
                    : "No friends yet. Search for a Pixel to add one."}
                </ThemedText>
              ) : (
                friends.friends.map((friend) => (
                  <PersonRow
                    key={friend.userId}
                    displayName={friend.displayName}
                    equipped={friend.equipped}
                    onPress={() => openPixel(friend.userId)}
                    trailing={
                      <Pill
                        compact
                        label={
                          openingDmFor === friend.userId ? "..." : "Message"
                        }
                        disabled={openingDmFor != null}
                        accessibilityLabel={`Message ${friend.displayName}`}
                        onPress={() => void messageFriend(friend.userId)}
                      />
                    }
                  />
                ))
              )}
            </View>

            <View style={styles.section}>
              <SectionTitle>Messages</SectionTitle>
              {dms.length === 0 ? (
                <ThemedText
                  lightColor={APP_SHELL_LABEL_COLOR}
                  darkColor={APP_SHELL_LABEL_COLOR}
                  style={styles.hint}
                >
                  Direct messages will show up here.
                </ThemedText>
              ) : (
                dms.map((dm) => (
                  <Pressable
                    key={dm.conversationId}
                    accessibilityRole="button"
                    accessibilityLabel={`Message ${dm.peerDisplayName}${dm.hasUnread ? ", unread" : ""}`}
                    onPress={() => openDm(dm.conversationId)}
                    style={({ pressed }) =>
                      pressed ? styles.rowPressed : undefined
                    }
                  >
                    <View style={styles.dmRow}>
                      <View style={styles.dmText}>
                        <ThemedText
                          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                          style={[
                            styles.rowTitle,
                            dm.hasUnread && styles.rowTitleUnread,
                          ]}
                          numberOfLines={1}
                        >
                          {dm.peerDisplayName}
                        </ThemedText>
                        {dm.lastMessageBody ? (
                          <ThemedText
                            lightColor={
                              dm.hasUnread
                                ? APP_SHELL_MAIN_TEXT_COLOR
                                : APP_SHELL_LABEL_COLOR
                            }
                            darkColor={
                              dm.hasUnread
                                ? APP_SHELL_MAIN_TEXT_COLOR
                                : APP_SHELL_LABEL_COLOR
                            }
                            style={styles.rowPreview}
                            numberOfLines={1}
                          >
                            {dm.lastMessageBody}
                          </ThemedText>
                        ) : null}
                      </View>
                      {dm.hasUnread ? <View style={styles.unreadDot} /> : null}
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
      <View style={styles.footer} pointerEvents="box-none">
        <ViewGymChatsCard />
      </View>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <ThemedText
      lightColor={APP_SHELL_MAIN_TEXT_COLOR}
      darkColor={APP_SHELL_MAIN_TEXT_COLOR}
      style={styles.sectionTitle}
      accessibilityRole="header"
    >
      {children}
    </ThemedText>
  );
}

type PersonRowProps = {
  displayName: string;
  equipped?: Record<string, string>;
  caption?: string;
  onPress: () => void;
  trailing?: React.ReactNode;
};

function PersonRow({
  displayName,
  equipped,
  caption,
  onPress,
  trailing,
}: PersonRowProps) {
  return (
    <View style={styles.personRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${displayName}`}
        onPress={onPress}
        style={({ pressed }) => [
          styles.personHit,
          pressed && styles.rowPressed,
        ]}
      >
        <View style={styles.personMain}>
          <PixelHeadAvatar equipped={equipped ?? null} size={ROW_AVATAR_SIZE} />
          <View style={styles.personText}>
            <ThemedText
              lightColor={APP_SHELL_MAIN_TEXT_COLOR}
              darkColor={APP_SHELL_MAIN_TEXT_COLOR}
              style={styles.rowTitle}
              numberOfLines={1}
            >
              {displayName}
            </ThemedText>
            {caption ? (
              <ThemedText
                lightColor={APP_SHELL_LABEL_COLOR}
                darkColor={APP_SHELL_LABEL_COLOR}
                style={styles.rowPreview}
                numberOfLines={1}
              >
                {caption}
              </ThemedText>
            ) : null}
          </View>
        </View>
      </Pressable>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: FOOTER_CARD_ESTIMATED_HEIGHT + 24,
  },
  heading: {
    fontSize: 18,
    lineHeight: 26,
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    paddingVertical: 8,
  },
  section: {
    marginTop: 22,
    gap: 4,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: APP_SHELL_INPUT_BOARDER_COLOR,
  },
  personHit: {
    flex: 1,
    minWidth: 0,
  },
  personMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  personText: {
    flex: 1,
    minWidth: 0,
  },
  dmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: APP_SHELL_INPUT_BOARDER_COLOR,
  },
  dmText: {
    flex: 1,
    minWidth: 0,
  },
  rowPressed: {
    opacity: 0.85,
  },
  rowTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    lineHeight: 18,
  },
  rowTitleUnread: {
    fontWeight: "700",
  },
  rowPreview: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 4,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: UNREAD_DOT_COLOR,
  },
  footer: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
  },
});
