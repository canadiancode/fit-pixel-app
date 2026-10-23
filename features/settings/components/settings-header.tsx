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
import { PixelFigure } from "@/features/pixel/components/pixel-character";
import { PIXEL_FIGURE_ASPECT_RATIO } from "@/features/pixel/figure-geometry";
import { usePixelLoadout } from "@/features/pixel/pixel-loadout-context";
import { PROFILE_DISPLAY_NAME_FALLBACK } from "@/lib/db";

import { usePrefsProfile } from "../prefs-profile-context";

export function SettingsHeader() {
  const { profile } = usePrefsProfile();
  const { loadout } = usePixelLoadout();
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
      <PixelFigure
        loadout={loadout}
        accessibilityLabel="Your pixel"
        style={styles.pixelImage}
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
    width: TAB_HEADER_CONTENT_HEIGHT * PIXEL_FIGURE_ASPECT_RATIO,
    height: TAB_HEADER_CONTENT_HEIGHT,
  },
});
