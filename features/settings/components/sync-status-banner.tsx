import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { useSyncOutboxStatus } from "@/hooks/use-sync-outbox-status";

function statusCopy(status: ReturnType<typeof useSyncOutboxStatus>): {
  title: string;
  caption: string;
  failed: boolean;
} {
  if (status.waiting > 0) {
    const n = status.waiting;
    const noun = n === 1 ? "change" : "changes";
    if (status.lastError) {
      return {
        title: `Couldn't reach server · ${n} ${noun} waiting`,
        caption: status.lastError,
        failed: true,
      };
    }
    return {
      title: `${n} ${noun} waiting to sync`,
      caption: "Will retry automatically when you're online.",
      failed: status.failed > 0,
    };
  }
  return {
    title: "Cloud backup: up to date",
    caption: "Your habits and settings are saved to your account.",
    failed: false,
  };
}

/** Compact outbox status so pilots can see backup is actually working. */
export function SyncStatusBanner() {
  const status = useSyncOutboxStatus();
  const copy = statusCopy(status);

  return (
    <View
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${copy.title}. ${copy.caption}`}
      style={[styles.banner, copy.failed && styles.bannerFailed]}
    >
      <ThemedText
        lightColor={APP_SHELL_MAIN_TEXT_COLOR}
        darkColor={APP_SHELL_MAIN_TEXT_COLOR}
        style={styles.title}
      >
        {copy.title}
      </ThemedText>
      <ThemedText
        lightColor={APP_SHELL_LABEL_COLOR}
        darkColor={APP_SHELL_LABEL_COLOR}
        style={styles.caption}
      >
        {copy.caption}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(95,211,95,0.55)",
    backgroundColor: "rgba(95,211,95,0.08)",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 8,
  },
  bannerFailed: {
    borderColor: "rgba(255,138,138,0.6)",
    backgroundColor: "rgba(255,138,138,0.08)",
  },
  title: {
    fontSize: 12,
    lineHeight: 16,
  },
  caption: {
    fontSize: 9,
    lineHeight: 15,
  },
});
