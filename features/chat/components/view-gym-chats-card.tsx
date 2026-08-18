import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import {
  SETTINGS_ROW_BACKGROUND,
  SETTINGS_ROW_BG_ASPECT_RATIO,
} from "@/features/settings/constants";
import { listJoinedGymChats } from "@/lib/api/chat";
import { FitPixelApiError } from "@/lib/api/client";
import { useAuth } from "@/features/auth/auth-context";

export function ViewGymChatsCard() {
  const { session } = useAuth();
  const [count, setCount] = useState<number | null>(null);

  const loadCount = useCallback(() => {
    if (!session?.access_token) {
      setCount(0);
      return;
    }
    void listJoinedGymChats()
      .then((chats) => setCount(chats.length))
      .catch((err) => {
        if (err instanceof FitPixelApiError && err.status === 401) {
          setCount(0);
          return;
        }
        setCount(null);
      });
  }, [session?.access_token]);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  const caption =
    count == null ? "# of chats: —" : `# of chats: ${count}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View gym chats. ${caption}`}
      android_ripple={{ color: "rgba(255,255,255,0.12)" }}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push("/(tabs)/chat/gym-chats")}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.rowImageShell,
          { aspectRatio: SETTINGS_ROW_BG_ASPECT_RATIO },
        ]}
      >
        <Image
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          source={SETTINGS_ROW_BACKGROUND}
          style={StyleSheet.absoluteFillObject}
          contentFit="fill"
        />
        <View style={styles.rowImageInner}>
          <View style={styles.rowTextBlock}>
            <ThemedText
              lightColor={APP_SHELL_MAIN_TEXT_COLOR}
              darkColor={APP_SHELL_MAIN_TEXT_COLOR}
              style={styles.rowLabel}
            >
              View gym chats
            </ThemedText>
            <ThemedText
              lightColor={APP_SHELL_LABEL_COLOR}
              darkColor={APP_SHELL_LABEL_COLOR}
              style={styles.rowCaption}
            >
              {caption}
            </ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: "stretch",
    borderRadius: 12,
    overflow: "hidden",
  },
  rowPressed: {
    opacity: 0.85,
  },
  rowImageShell: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  rowImageInner: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    paddingVertical: 10,
    paddingLeft: 20,
    paddingRight: 44,
  },
  rowTextBlock: {
    gap: 6,
  },
  rowLabel: {
    fontSize: 15,
    lineHeight: 22,
  },
  rowCaption: {
    fontSize: 10,
    lineHeight: 14,
  },
});
