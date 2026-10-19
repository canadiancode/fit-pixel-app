import { Fragment, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { useBlockedUsers } from "@/features/chat/blocked-users-store";
import {
  SETTINGS_CARD_RIM_ACTIVE,
  SETTINGS_TRACK_FILL,
  SettingsButton,
  SettingsDivider,
  SettingsIntro,
  SettingsSection,
} from "@/features/settings/components/settings-ui";
import { timeAgo } from "@/features/chat/time-ago";

function blockedLabel(iso: string): string {
  const ago = timeAgo(iso);
  if (ago === "now") return "Blocked just now";
  return /^\d+[mhd]$/.test(ago) ? `Blocked ${ago} ago` : `Blocked on ${ago}`;
}

export function BlockedPixelsList() {
  const { blocked, loaded, loadFailed, unblock, refresh } = useBlockedUsers();
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const intro = (
    <SettingsIntro>
      {"Blocked Pixels can't message you or send friend requests, and their chat messages are hidden from you."}
    </SettingsIntro>
  );

  if (!loaded && loadFailed) {
    return (
      <View style={styles.root}>
        {intro}
        <SettingsSection
          title="blocked"
          footer="Couldn't load your blocked Pixels. Check your connection."
          bare
        >
          <SettingsButton label="Try again" onPress={() => void refresh()} />
        </SettingsSection>
      </View>
    );
  }

  if (!loaded) {
    return (
      <View style={styles.root}>
        {intro}
        <ActivityIndicator color={APP_SHELL_MAIN_TEXT_COLOR} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {intro}
      <SettingsSection
        title={`blocked · ${blocked.length}`}
        footer={
          blocked.length === 0
            ? "You haven't blocked anyone. To block a Pixel, long-press one of their chat messages or open their profile."
            : "Unblocking lets them message you again. They aren't told either way."
        }
        bare={blocked.length === 0}
      >
        {blocked.length === 0
          ? null
          : blocked.map((item, index) => {
              const busy = pendingId === item.userId;
              return (
                <Fragment key={item.userId}>
                  {index > 0 ? <SettingsDivider /> : null}
                  <View style={styles.row}>
                    <View style={styles.rowText}>
                      <ThemedText
                        lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                        darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                        style={styles.name}
                        numberOfLines={1}
                      >
                        {item.displayName}
                      </ThemedText>
                      <ThemedText
                        lightColor={APP_SHELL_LABEL_COLOR}
                        darkColor={APP_SHELL_LABEL_COLOR}
                        style={styles.meta}
                      >
                        {blockedLabel(item.blockedAt)}
                      </ThemedText>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Unblock ${item.displayName}`}
                      accessibilityState={{ busy, disabled: busy }}
                      disabled={busy}
                      onPress={() => {
                        setPendingId(item.userId);
                        void unblock(item.userId)
                          .catch((err) => {
                            Alert.alert(
                              "Could not unblock",
                              err instanceof Error
                                ? err.message
                                : "Please try again.",
                            );
                          })
                          .finally(() => setPendingId(null));
                      }}
                      style={({ pressed }) => [
                        styles.unblock,
                        (pressed || busy) && styles.pressed,
                      ]}
                    >
                      {busy ? (
                        <ActivityIndicator
                          size="small"
                          color={APP_SHELL_MAIN_TEXT_COLOR}
                        />
                      ) : (
                        <Text style={styles.unblockLabel}>Unblock</Text>
                      )}
                    </Pressable>
                  </View>
                </Fragment>
              );
            })}
      </SettingsSection>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  name: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
  },
  meta: {
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 12,
  },
  unblock: {
    minWidth: 88,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: SETTINGS_CARD_RIM_ACTIVE,
    backgroundColor: SETTINGS_TRACK_FILL,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  unblockLabel: {
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 13,
  },
});
