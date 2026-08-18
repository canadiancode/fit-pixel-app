import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { useChatSearch } from "@/features/chat/chat-search-context";
import { ChatSubScreenLayout } from "@/features/chat/components/chat-sub-screen-layout";
import { GymChatListRow } from "@/features/chat/components/gym-chat-list-row";
import { gymHeroSource } from "@/features/map/gym-catalog";
import { listJoinedGymChats, type GymChatListItem } from "@/lib/api/chat";
import { FitPixelApiError } from "@/lib/api/client";

export default function GymChatsScreen() {
  const { query } = useChatSearch();
  const [chats, setChats] = useState<GymChatListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    void listJoinedGymChats()
      .then((rows) => {
        setChats(rows);
        setError(null);
      })
      .catch((err) => {
        setError(
          err instanceof FitPixelApiError
            ? err.message
            : "Could not load gym chats.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((item) => item.name.toLowerCase().includes(q));
  }, [chats, query]);

  return (
    <ChatSubScreenLayout>
      <View style={styles.block}>
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.title}
          accessibilityRole="header"
        >
          Gym chats
        </ThemedText>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.body}
        >
          Gyms you&apos;ve joined for community chat.
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
        {loading && chats.length === 0 ? (
          <ThemedText
            lightColor={APP_SHELL_LABEL_COLOR}
            darkColor={APP_SHELL_LABEL_COLOR}
            style={styles.body}
          >
            Loading gym chats...
          </ThemedText>
        ) : null}
        {!loading && filtered.length === 0 && !error ? (
          <ThemedText
            lightColor={APP_SHELL_LABEL_COLOR}
            darkColor={APP_SHELL_LABEL_COLOR}
            style={styles.body}
          >
            Join a gym from the map to see it here.
          </ThemedText>
        ) : null}
        <View style={styles.list} accessibilityRole="list">
          {filtered.map((item, index) => (
            <GymChatListRow
              key={item.gymId}
              gymId={item.gymId}
              name={item.name}
              memberCount={item.memberCount}
              liveViewerCount={0}
              background_img={gymHeroSource(item.imageKey)}
              showBottomBorder={index < filtered.length - 1}
            />
          ))}
        </View>
      </View>
    </ChatSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 12,
    alignSelf: "stretch",
  },
  title: {
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  body: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    alignSelf: "stretch",
    marginTop: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
});
