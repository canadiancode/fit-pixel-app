import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_PRIMARY_BACKGROUND,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { ChatSubScreenLayout } from "@/features/chat/components/chat-sub-screen-layout";
import { createOrGetDm, getPixel, type PixelSearchItem } from "@/lib/api/chat";
import { FitPixelApiError } from "@/lib/api/client";

export default function PixelProfileScreen() {
  const { userId: rawId } = useLocalSearchParams<{ userId: string }>();
  const userId = (Array.isArray(rawId) ? rawId[0] : rawId) ?? "";
  const [pixel, setPixel] = useState<PixelSearchItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void getPixel(userId)
      .then((row) => {
        if (!cancelled) setPixel(row);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof FitPixelApiError
              ? err.message
              : "Could not load this Pixel.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const openDm = useCallback(async () => {
    if (!userId || opening) return;
    setOpening(true);
    setError(null);
    try {
      const { conversationId } = await createOrGetDm(userId);
      router.push({
        pathname: "/(tabs)/chat/dm/[conversationId]",
        params: { conversationId },
      });
    } catch (err) {
      setError(
        err instanceof FitPixelApiError
          ? err.message
          : "Could not open a direct message.",
      );
    } finally {
      setOpening(false);
    }
  }, [opening, userId]);

  return (
    <ChatSubScreenLayout>
      <ThemedText
        type="title"
        lightColor={APP_SHELL_MAIN_TEXT_COLOR}
        darkColor={APP_SHELL_MAIN_TEXT_COLOR}
      >
        {pixel?.displayName || "Pixel profile"}
      </ThemedText>
      <ThemedText
        style={styles.body}
        lightColor={APP_SHELL_LABEL_COLOR}
        darkColor={APP_SHELL_LABEL_COLOR}
      >
        {error ??
          (pixel
            ? "Start a direct message or check back later for accessories."
            : "Loading Pixel...")}
      </ThemedText>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send direct message"
          disabled={!userId || opening}
          onPress={() => {
            void openDm();
          }}
          style={({ pressed }) => [
            styles.dmButton,
            pressed && styles.dmButtonPressed,
            (!userId || opening) && styles.dmButtonDisabled,
          ]}
        >
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.dmLabel}
          >
            {opening ? "Opening..." : "Message"}
          </ThemedText>
        </Pressable>
      </View>
    </ChatSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  body: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
  },
  actions: {
    marginTop: 18,
  },
  dmButton: {
    alignSelf: "flex-start",
    backgroundColor: APP_SHELL_PRIMARY_BACKGROUND,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dmButtonPressed: {
    opacity: 0.85,
  },
  dmButtonDisabled: {
    opacity: 0.5,
  },
  dmLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
  },
});
