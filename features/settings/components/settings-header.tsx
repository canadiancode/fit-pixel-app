import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { XpLevelBar } from "@/components/xp-level-bar";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_PRIMARY_BACKGROUND,
} from "@/constants/app-colors";
import { TAB_HEADER_ROW_LAYOUT } from "@/constants/app-shell";
import { FONT_FAMILY } from "@/constants/fonts";
import { PixelFigure } from "@/features/pixel/components/pixel-character";
import { portraitLoadout } from "@/features/pixel/default-loadout";
import {
  figureFrameForCrop,
  PIXEL_HEAD_CROP,
} from "@/features/pixel/figure-geometry";
import { usePixelLoadout } from "@/features/pixel/pixel-loadout-context";
import { useXpState } from "@/features/xp/xp-state-context";
import { PROFILE_DISPLAY_NAME_FALLBACK } from "@/lib/db";
import {
  getPixelLevel,
  getXpBarFillPercent,
  XP_PER_LEVEL,
} from "@/lib/xp-progress";

import { usePrefsProfile } from "../prefs-profile-context";
import { DisplayNameDialog } from "./display-name-dialog";
import {
  SETTINGS_CARD_FILL,
  SETTINGS_CARD_RIM,
  SETTINGS_CARD_RIM_ACTIVE,
} from "./settings-ui";

const AVATAR_SIZE = 76;
const AVATAR_BORDER = 2;
const LEVEL_COLOR = "#6fc3ff";

/**
 * Pixel-art pencil, one string per row: `c` cap, `b` body, `t` tip.
 * Drawn from cells so it stays crisp next to the pixel font.
 */
const PENCIL_ROWS = [
  "......cc",
  ".....ccc",
  "....bbc.",
  "...bbb..",
  "..bbb...",
  ".bbb....",
  "tbb.....",
  "tt......",
] as const;
const PENCIL_CELL = 2;
const PENCIL_COLORS = {
  c: LEVEL_COLOR,
  b: APP_SHELL_MAIN_TEXT_COLOR,
  t: APP_SHELL_LABEL_COLOR,
} as const;

function PencilIcon() {
  return (
    <View style={styles.pencil}>
      {PENCIL_ROWS.flatMap((row, y) =>
        [...row].map((cell, x) =>
          cell === "." ? null : (
            <View
              key={`${x}-${y}`}
              style={[
                styles.pencilCell,
                {
                  left: x * PENCIL_CELL,
                  top: y * PENCIL_CELL,
                  backgroundColor:
                    PENCIL_COLORS[cell as keyof typeof PENCIL_COLORS],
                },
              ]}
            />
          ),
        ),
      )}
    </View>
  );
}

/**
 * Settings player card: head portrait, display name (pencil edits it), level
 * and XP toward the next level.
 */
export function SettingsHeader() {
  const { profile, isHydrated } = usePrefsProfile();
  const { loadout } = usePixelLoadout();
  const { xp, refreshXp } = useXpState();
  const [editingName, setEditingName] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshXp();
    }, [refreshXp]),
  );

  const displayName =
    profile.displayName.trim() === ""
      ? PROFILE_DISPLAY_NAME_FALLBACK
      : profile.displayName.trim();
  const lifetimeXp = xp.lifetimeXp;
  const level = getPixelLevel(lifetimeXp);
  const nextLevelXp = (level + 1) * XP_PER_LEVEL;

  return (
    <View style={styles.headerRow}>
      <View style={styles.card}>
        <View
          style={styles.avatar}
          accessibilityRole="image"
          accessibilityLabel="Your pixel"
        >
          <PixelFigure
            loadout={portraitLoadout(loadout)}
            style={[
              styles.avatarFigure,
              figureFrameForCrop(PIXEL_HEAD_CROP, AVATAR_SIZE - 2 * AVATAR_BORDER),
            ]}
          />
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <ThemedText
              lightColor={APP_SHELL_MAIN_TEXT_COLOR}
              darkColor={APP_SHELL_MAIN_TEXT_COLOR}
              style={styles.displayName}
              numberOfLines={1}
              accessibilityRole="header"
            >
              {displayName}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit display name"
              accessibilityState={{ disabled: !isHydrated }}
              disabled={!isHydrated}
              hitSlop={8}
              onPress={() => setEditingName(true)}
              style={({ pressed }) => [
                styles.editButton,
                pressed && styles.pressed,
              ]}
            >
              <PencilIcon />
            </Pressable>
          </View>

          <ThemedText
            lightColor={LEVEL_COLOR}
            darkColor={LEVEL_COLOR}
            style={styles.level}
          >
            Level {level}
          </ThemedText>

          <XpLevelBar
            fillPercent={getXpBarFillPercent(lifetimeXp)}
            height={16}
            style={styles.bar}
          />

          <ThemedText
            lightColor={APP_SHELL_LABEL_COLOR}
            darkColor={APP_SHELL_LABEL_COLOR}
            style={styles.xpText}
          >
            {lifetimeXp.toLocaleString("en-US")} /{" "}
            {nextLevelXp.toLocaleString("en-US")} XP
          </ThemedText>
        </View>
      </View>

      <DisplayNameDialog
        visible={editingName}
        onClose={() => setEditingName(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    ...TAB_HEADER_ROW_LAYOUT,
    backgroundColor: APP_SHELL_PRIMARY_BACKGROUND,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: SETTINGS_CARD_RIM_ACTIVE,
    backgroundColor: SETTINGS_CARD_FILL,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: 8,
    borderWidth: AVATAR_BORDER,
    borderColor: SETTINGS_CARD_RIM_ACTIVE,
    backgroundColor: APP_SHELL_PRIMARY_BACKGROUND,
    overflow: "hidden",
  },
  avatarFigure: {
    position: "absolute",
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  displayName: {
    flex: 1,
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    lineHeight: 22,
  },
  editButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: SETTINGS_CARD_RIM,
    backgroundColor: APP_SHELL_PRIMARY_BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
  },
  pencil: {
    width: PENCIL_ROWS[0].length * PENCIL_CELL,
    height: PENCIL_ROWS.length * PENCIL_CELL,
  },
  pencilCell: {
    position: "absolute",
    width: PENCIL_CELL,
    height: PENCIL_CELL,
  },
  level: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 16,
  },
  bar: {
    alignSelf: "stretch",
  },
  xpText: {
    alignSelf: "flex-end",
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 13,
  },
  pressed: {
    opacity: 0.8,
  },
});
