import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { ActionListSectionDivider } from "@/features/actions/components/action-list-section-divider";
import { useAuth } from "@/features/auth/auth-context";
import { ChatEmptyState } from "@/features/chat/components/chat-empty-state";
import { ChatListRow } from "@/features/chat/components/chat-list-row";
import { usePixelLoadout } from "@/features/pixel/pixel-loadout-context";
import { usePrefsProfile } from "@/features/settings/prefs-profile-context";
import {
  FriendshipButton,
  Pill,
} from "@/features/social/components/friendship-button";
import { PixelHeadAvatar } from "@/features/social/components/pixel-head-avatar";
import { useFriendshipActions } from "@/features/social/use-friendship-actions";
import {
  searchPixels,
  type FriendsOverview,
  type FriendshipStatus,
  type PixelSearchItem,
} from "@/lib/api/chat";

const HEART_ICON = require("@/assets/icons/heart.png");
const ROW_AVATAR_SIZE = 44;
/** Lines footer buttons up with the row's text column (avatar + gap). */
const TEXT_COLUMN_INSET = ROW_AVATAR_SIZE + 12;

type Props = {
  friends: FriendsOverview;
  query: string;
  refreshing: boolean;
  onRefresh: () => void;
  /** Re-fetch after accepting / declining / cancelling. */
  onChanged: () => void;
  onMessageFriend: (userId: string) => void;
  openingDmFor: string | null;
  onFindPixels: () => void;
};

function openPixel(userId: string) {
  router.push({
    pathname: "/(tabs)/chat/pixel/[userId]",
    params: { userId },
  });
}

/** Friend requests, your friends, and Pixel search (from the header field). */
export function ChatFriendsSection({
  friends,
  query,
  refreshing,
  onRefresh,
  onChanged,
  onMessageFriend,
  openingDmFor,
  onFindPixels,
}: Props) {
  const { session, user } = useAuth();
  const { loadout } = usePixelLoadout();
  const { profile } = usePrefsProfile();
  const friendActions = useFriendshipActions();
  const [results, setResults] = useState<PixelSearchItem[] | null>(null);
  const [resultStatus, setResultStatus] = useState<
    Record<string, FriendshipStatus>
  >({});

  const q = query.trim();
  const searching = q.length >= 2;

  useEffect(() => {
    if (!searching || !session?.access_token) {
      setResults(null);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      void searchPixels(q)
        .then((rows) => {
          if (cancelled) return;
          setResults(rows);
          setResultStatus({});
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q, searching, session?.access_token]);

  const statusFor = useCallback(
    (pixel: PixelSearchItem): FriendshipStatus =>
      resultStatus[pixel.userId] ?? pixel.friendship ?? "none",
    [resultStatus],
  );

  const hasAnyone =
    friends.friends.length > 0 ||
    friends.incoming.length > 0 ||
    friends.outgoing.length > 0;

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
      {q.length === 0 && user ? (
        <>
          <ActionListSectionDivider label="you" />
          <ChatListRow
            leading={
              <PixelHeadAvatar equipped={loadout} size={ROW_AVATAR_SIZE} />
            }
            title={profile.displayName.trim() || "Your Pixel"}
            subtitle="Your profile and items"
            showChevron
            onPress={() => openPixel(user.id)}
            accessibilityLabel="Open your Pixel profile"
          />
        </>
      ) : null}
      {q.length > 0 ? (
        <>
          <ActionListSectionDivider label="find pixels" />
          {!searching ? (
            <Hint>Keep typing to search Pixels...</Hint>
          ) : results == null ? (
            <Hint>Searching...</Hint>
          ) : results.length === 0 ? (
            <Hint>No Pixels match that name.</Hint>
          ) : (
            results.map((pixel) => (
              <ChatListRow
                key={pixel.userId}
                leading={
                  <PixelHeadAvatar
                    equipped={pixel.equipped ?? {}}
                    size={ROW_AVATAR_SIZE}
                  />
                }
                title={pixel.displayName}
                onPress={() => openPixel(pixel.userId)}
                accessibilityLabel={`Open ${pixel.displayName}`}
                trailing={
                  <FriendshipButton
                    compact
                    target={pixel}
                    status={statusFor(pixel)}
                    actions={friendActions}
                    onChange={(next) => {
                      setResultStatus((current) => ({
                        ...current,
                        [pixel.userId]: next,
                      }));
                      onChanged();
                    }}
                  />
                }
              />
            ))
          )}
        </>
      ) : !hasAnyone ? (
        <ChatEmptyState
          icon={HEART_ICON}
          title="No friends yet"
          body="Search for Pixels by name, or meet people in your gym chat."
          action={{ label: "Find Pixels", onPress: onFindPixels }}
        />
      ) : (
        <>
          {friends.incoming.length > 0 ? (
            <>
              <ActionListSectionDivider
                label={`requests · ${friends.incoming.length}`}
              />
              {friends.incoming.map((request) => (
                <ChatListRow
                  key={request.userId}
                  leading={
                    <PixelHeadAvatar
                      equipped={request.equipped}
                      size={ROW_AVATAR_SIZE}
                    />
                  }
                  title={request.displayName}
                  subtitle="Wants to be friends"
                  unread
                  onPress={() => openPixel(request.userId)}
                  accessibilityLabel={`${request.displayName} wants to be friends`}
                  footer={
                    <View style={styles.requestActions}>
                      <FriendshipButton
                        compact
                        target={request}
                        status="pending_incoming"
                        actions={friendActions}
                        onChange={onChanged}
                      />
                    </View>
                  }
                />
              ))}
            </>
          ) : null}

          <ActionListSectionDivider
            label={`friends · ${friends.friends.length}`}
          />
          {friends.friends.length === 0 ? (
            <Hint>
              Accepted friends show up here. Search above to add more.
            </Hint>
          ) : (
            friends.friends.map((friend) => (
              <ChatListRow
                key={friend.userId}
                leading={
                  <PixelHeadAvatar
                    equipped={friend.equipped}
                    size={ROW_AVATAR_SIZE}
                  />
                }
                title={friend.displayName}
                onPress={() => openPixel(friend.userId)}
                accessibilityLabel={`Open ${friend.displayName}`}
                trailing={
                  <Pill
                    compact
                    primary
                    label={openingDmFor === friend.userId ? "..." : "Message"}
                    disabled={openingDmFor != null}
                    accessibilityLabel={`Message ${friend.displayName}`}
                    onPress={() => onMessageFriend(friend.userId)}
                  />
                }
              />
            ))
          )}

          {friends.outgoing.length > 0 ? (
            <>
              <ActionListSectionDivider label="sent requests" />
              {friends.outgoing.map((request) => (
                <ChatListRow
                  key={request.userId}
                  leading={
                    <PixelHeadAvatar
                      equipped={request.equipped}
                      size={ROW_AVATAR_SIZE}
                    />
                  }
                  title={request.displayName}
                  subtitle="Waiting for reply"
                  onPress={() => openPixel(request.userId)}
                  accessibilityLabel={`Open ${request.displayName}. Request sent`}
                  trailing={
                    <FriendshipButton
                      compact
                      target={request}
                      status="pending_outgoing"
                      actions={friendActions}
                      onChange={onChanged}
                    />
                  }
                />
              ))}
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function Hint({ children }: { children: string }) {
  return (
    <ThemedText
      lightColor={APP_SHELL_LABEL_COLOR}
      darkColor={APP_SHELL_LABEL_COLOR}
      style={styles.hint}
    >
      {children}
    </ThemedText>
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
  requestActions: {
    paddingLeft: TEXT_COLUMN_INSET,
  },
  hint: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 16,
    paddingVertical: 8,
  },
});
