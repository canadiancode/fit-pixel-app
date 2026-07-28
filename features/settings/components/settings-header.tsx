import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_PRIMARY_BACKGROUND,
} from "@/constants/app-colors";
import {
  TAB_HEADER_CONTENT_HEIGHT,
  TAB_HEADER_ROW_LAYOUT,
} from "@/constants/app-shell";
import { PROFILE_DISPLAY_NAME_FALLBACK } from "@/lib/db";

import { PIXEL_IMAGE } from "../constants";
import { usePrefsProfile } from "../prefs-profile-context";

export function SettingsHeader() {
  const { profile } = usePrefsProfile();
  const displayName =
    profile.displayName.trim() === ""
      ? PROFILE_DISPLAY_NAME_FALLBACK
      : profile.displayName.trim();

  return (
    <View style={styles.headerRow}>
      <ThemedText
        lightColor={APP_SHELL_MAIN_TEXT_COLOR}
        darkColor={APP_SHELL_MAIN_TEXT_COLOR}
        type="title"
        style={styles.displayName}
        accessibilityRole="header"
      >
        {displayName}
      </ThemedText>
      <Image
        accessibilityLabel="Pixel avatar"
        accessibilityIgnoresInvertColors
        source={PIXEL_IMAGE}
        style={styles.pixelImage}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    ...TAB_HEADER_ROW_LAYOUT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: APP_SHELL_PRIMARY_BACKGROUND,
  },
  displayName: {
    flex: 1,
    flexShrink: 1,
    fontSize: 22,
    lineHeight: 28,
  },
  pixelImage: {
    width: TAB_HEADER_CONTENT_HEIGHT,
    height: TAB_HEADER_CONTENT_HEIGHT,
  },
});
