import { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_SECONDARY_BACKGROUND,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";

import { useStreak } from "../streak-context";
import { PixelFlame } from "./pixel-flame";

const CELL_HEADING_FONT_FAMILY = "PixeloidSans";

/** Dev builds: long-press the badge to preview each celebration tier. */
const DEV_PREVIEW_COUNTS = [3, 7, 14, 30, 100] as const;

/**
 * Daily streak tile beside Today's progress: a lit flame once today is
 * logged, a grey one while the streak waits on today's first log. Tap to
 * replay today's celebration.
 */
export function StreakBadge({ height }: { height: number }) {
  const { streak, isHydrated, replayCelebration } = useStreak();
  const lit = streak.todayActive;
  const atRisk = !lit && streak.count > 0;
  const previewIndexRef = useRef(0);

  const label =
    streak.count === 0
      ? "No streak yet"
      : `${streak.count} day streak${atRisk ? ", log something today to keep it" : ""}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={
        streak.count > 0 ? "Plays your streak celebration" : undefined
      }
      disabled={streak.count === 0 && !__DEV__}
      onPress={() => replayCelebration()}
      onLongPress={
        __DEV__
          ? () => {
              const i = previewIndexRef.current++ % DEV_PREVIEW_COUNTS.length;
              replayCelebration(DEV_PREVIEW_COUNTS[i]);
            }
          : undefined
      }
      hitSlop={6}
      style={({ pressed }) => [
        styles.tile,
        { height },
        lit && styles.tileLit,
        pressed && styles.pressed,
      ]}
    >
      <PixelFlame pixel={2.6} palette={lit ? "lit" : "out"} />
      <View style={styles.countRow}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          style={[styles.count, !lit && styles.countDim]}
        >
          {isHydrated ? streak.count : "–"}
        </Text>
      </View>
      <Text style={[styles.caption, !lit && styles.countDim]}>
        {atRisk ? "TODAY!" : "STREAK"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 64,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  tileLit: {
    borderColor: "rgba(255,170,60,0.75)",
    shadowColor: "#FF8A1F",
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
  countRow: {
    alignSelf: "stretch",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  count: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    lineHeight: 15,
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
  countDim: {
    opacity: 0.55,
  },
  caption: {
    fontFamily: CELL_HEADING_FONT_FAMILY,
    fontSize: 8,
    lineHeight: 9,
    letterSpacing: 0.5,
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
});
