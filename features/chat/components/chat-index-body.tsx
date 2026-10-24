import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { APP_SHELL_SECONDARY_BACKGROUND } from "@/constants/app-colors";
import { useAuth } from "@/features/auth/auth-context";
import { useChatSearch } from "@/features/chat/chat-search-context";
import { ChatFriendsSection } from "@/features/chat/components/chat-friends-section";
import { ChatGymsSection } from "@/features/chat/components/chat-gyms-section";
import { ChatMessagesSection } from "@/features/chat/components/chat-messages-section";
import { ChatRanksSection } from "@/features/chat/components/chat-ranks-section";
import { ChatSectionTabs } from "@/features/chat/components/chat-section-tabs";
import { useNotifications } from "@/features/social/notifications-context";
import {
  createOrGetDm,
  listDms,
  listFriends,
  listGyms,
  type DmListItem,
  type FriendsOverview,
  type GymListItem,
} from "@/lib/api/chat";
import { FitPixelApiError } from "@/lib/api/client";

const EMPTY_FRIENDS: FriendsOverview = {
  friends: [],
  incoming: [],
  outgoing: [],
};

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof FitPixelApiError ? err.message : fallback;
}

function openDm(conversationId: string) {
  router.push({
    pathname: "/(tabs)/chat/dm/[conversationId]",
    params: { conversationId },
  });
}

/** Chat tab home: Gyms / Messages / Friends / Ranks sections under one switcher. */
export function ChatIndexBody() {
  const { query, section, setSection, focusSearch } = useChatSearch();
  const { session } = useAuth();
  const { changeKey } = useNotifications();
  const [gyms, setGyms] = useState<GymListItem[] | null>(null);
  const [gymsError, setGymsError] = useState<string | null>(null);
  const [dms, setDms] = useState<DmListItem[] | null>(null);
  const [dmsError, setDmsError] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendsOverview>(EMPTY_FRIENDS);
  const [refreshing, setRefreshing] = useState(false);
  const [openingDmFor, setOpeningDmFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.access_token) {
      setGyms([]);
      setDms([]);
      setFriends(EMPTY_FRIENDS);
      return;
    }
    const [gymResult, dmResult, friendsResult] = await Promise.allSettled([
      listGyms(),
      listDms(),
      listFriends(),
    ]);
    if (gymResult.status === "fulfilled") {
      setGyms(gymResult.value);
      setGymsError(null);
    } else {
      setGymsError(errorMessage(gymResult.reason, "Could not load gym chats."));
    }
    if (dmResult.status === "fulfilled") {
      setDms(dmResult.value);
      setDmsError(null);
    } else {
      setDmsError(errorMessage(dmResult.reason, "Could not load messages."));
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

  const findPixels = useCallback(() => {
    setSection("friends");
    // Let the section swap (and header placeholder) settle before focusing.
    setTimeout(focusSearch, 50);
  }, [focusSearch, setSection]);

  const unreadDms = (dms ?? []).filter((dm) => dm.hasUnread).length;

  return (
    <View style={styles.root}>
      <View style={styles.tabs}>
        <ChatSectionTabs
          active={section}
          onChange={setSection}
          badges={{
            messages: unreadDms,
            friends: friends.incoming.length,
          }}
        />
      </View>
      {section === "gyms" ? (
        <ChatGymsSection
          gyms={gyms}
          error={gymsError}
          query={query}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      ) : section === "messages" ? (
        <ChatMessagesSection
          dms={dms}
          friends={friends.friends}
          error={dmsError}
          query={query}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onMessageFriend={(userId) => void messageFriend(userId)}
          openingDmFor={openingDmFor}
          onFindFriends={findPixels}
        />
      ) : section === "ranks" ? (
        <ChatRanksSection query={query} onFindFriends={findPixels} />
      ) : (
        <ChatFriendsSection
          friends={friends}
          query={query}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onChanged={() => void load()}
          onMessageFriend={(userId) => void messageFriend(userId)}
          openingDmFor={openingDmFor}
          onFindPixels={findPixels}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
  },
  tabs: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
});
