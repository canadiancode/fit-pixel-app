import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

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
  listDms,
  searchPixels,
  type DmListItem,
  type PixelSearchItem,
} from "@/lib/api/chat";
import { FitPixelApiError } from "@/lib/api/client";

const FOOTER_CARD_ESTIMATED_HEIGHT = 100;

export function ChatIndexBody() {
  const { query } = useChatSearch();
  const { session } = useAuth();
  const [dms, setDms] = useState<DmListItem[]>([]);
  const [pixels, setPixels] = useState<PixelSearchItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadDms = useCallback(() => {
    if (!session?.access_token) {
      setDms([]);
      return;
    }
    void listDms()
      .then(setDms)
      .catch((err) => {
        if (err instanceof FitPixelApiError && err.status === 401) return;
        setError(
          err instanceof FitPixelApiError
            ? err.message
            : "Could not load messages.",
        );
      });
  }, [session?.access_token]);

  useEffect(() => {
    loadDms();
  }, [loadDms]);

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
          if (!cancelled) setPixels(rows);
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

  const visibleDms = useMemo(() => {
    if (searching) return [];
    return dms;
  }, [dms, searching]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
          Search for Pixels by name
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
                <Pressable
                  key={pixel.userId}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${pixel.displayName}`}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/chat/pixel/[userId]",
                      params: { userId: pixel.userId },
                    })
                  }
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <ThemedText
                    lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                    darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                    style={styles.rowTitle}
                    numberOfLines={1}
                  >
                    {pixel.displayName}
                  </ThemedText>
                </Pressable>
              ))
            )}
          </View>
        ) : (
          <View style={styles.section}>
            {visibleDms.length === 0 ? (
              <ThemedText
                lightColor={APP_SHELL_LABEL_COLOR}
                darkColor={APP_SHELL_LABEL_COLOR}
                style={styles.body}
              >
                Direct messages will show up here.
              </ThemedText>
            ) : (
              visibleDms.map((dm) => (
                <Pressable
                  key={dm.conversationId}
                  accessibilityRole="button"
                  accessibilityLabel={`Message ${dm.peerDisplayName}`}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/chat/dm/[conversationId]",
                      params: { conversationId: dm.conversationId },
                    })
                  }
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <ThemedText
                    lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                    darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                    style={styles.rowTitle}
                    numberOfLines={1}
                  >
                    {dm.peerDisplayName}
                  </ThemedText>
                  {dm.lastMessageBody ? (
                    <ThemedText
                      lightColor={APP_SHELL_LABEL_COLOR}
                      darkColor={APP_SHELL_LABEL_COLOR}
                      style={styles.rowPreview}
                      numberOfLines={1}
                    >
                      {dm.lastMessageBody}
                    </ThemedText>
                  ) : null}
                </Pressable>
              ))
            )}
          </View>
        )}
      </ScrollView>
      <View style={styles.footer} pointerEvents="box-none">
        <ViewGymChatsCard />
      </View>
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
  section: {
    marginTop: 16,
    gap: 4,
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: APP_SHELL_INPUT_BOARDER_COLOR,
  },
  rowPressed: {
    opacity: 0.85,
  },
  rowTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    lineHeight: 18,
  },
  rowPreview: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 4,
  },
  footer: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
  },
});
