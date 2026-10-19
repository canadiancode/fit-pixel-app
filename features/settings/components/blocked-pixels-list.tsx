import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { useBlockedUsers } from "@/features/chat/blocked-users-store";

export function BlockedPixelsList() {
  const { blocked, loaded, loadFailed, unblock, refresh } = useBlockedUsers();
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!loaded && loadFailed) {
    return (
      <View style={styles.root}>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.hint}
        >
          {"Couldn't load your blocked Pixels. Check your connection."}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try loading blocked Pixels again"
          onPress={() => {
            void refresh();
          }}
          style={({ pressed }) => [
            styles.unblock,
            styles.retry,
            pressed && styles.unblockPressed,
          ]}
        >
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.unblockLabel}
          >
            Try again
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  if (!loaded) {
    return (
      <ThemedText
        lightColor={APP_SHELL_LABEL_COLOR}
        darkColor={APP_SHELL_LABEL_COLOR}
        style={styles.hint}
      >
        Loading...
      </ThemedText>
    );
  }

  if (blocked.length === 0) {
    return (
      <ThemedText
        lightColor={APP_SHELL_LABEL_COLOR}
        darkColor={APP_SHELL_LABEL_COLOR}
        style={styles.hint}
      >
        {"You haven't blocked anyone. To block a Pixel, long-press one of " +
          "their chat messages or open their profile."}
      </ThemedText>
    );
  }

  return (
    <View style={styles.root}>
      <ThemedText
        lightColor={APP_SHELL_LABEL_COLOR}
        darkColor={APP_SHELL_LABEL_COLOR}
        style={styles.hint}
      >
        {"Blocked Pixels can't message you, and their chat messages are hidden."}
      </ThemedText>
      {blocked.map((item) => (
        <View key={item.userId} style={styles.row}>
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.name}
            numberOfLines={1}
          >
            {item.displayName}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Unblock ${item.displayName}`}
            disabled={pendingId === item.userId}
            onPress={() => {
              setPendingId(item.userId);
              void unblock(item.userId)
                .catch((err) => {
                  Alert.alert(
                    "Could not unblock",
                    err instanceof Error ? err.message : "Please try again.",
                  );
                })
                .finally(() => setPendingId(null));
            }}
            style={({ pressed }) => [
              styles.unblock,
              (pressed || pendingId === item.userId) && styles.unblockPressed,
            ]}
          >
            <ThemedText
              lightColor={APP_SHELL_MAIN_TEXT_COLOR}
              darkColor={APP_SHELL_MAIN_TEXT_COLOR}
              style={styles.unblockLabel}
            >
              Unblock
            </ThemedText>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 12,
    paddingBottom: 28,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.16)",
  },
  name: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  unblock: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  unblockPressed: {
    opacity: 0.6,
  },
  retry: {
    alignSelf: "flex-start",
  },
  unblockLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 14,
  },
});
