import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { XpLevelBar } from "@/components/xp-level-bar";
import {
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_PRIMARY_BACKGROUND,
} from "@/constants/app-colors";
import {
  TAB_HEADER_CONTENT_HEIGHT,
  TAB_HEADER_ROW_LAYOUT,
} from "@/constants/app-shell";
import { useTodaysProgress } from "@/features/actions/use-action-progress";
import { StreakBadge } from "@/features/streak/components/streak-badge";
import {
  useCelebratedTotals,
  useProgressTarget,
} from "@/features/actions/use-celebrated-progress";

export function ActionsHeader() {
  const { totals, pulse } = useCelebratedTotals("today");
  const { fillPercent, progressPercent } = useTodaysProgress(totals);
  const barRef = useProgressTarget("today");

  return (
    <View style={[styles.headerRow, styles.headerContent]}>
      <View style={styles.contentBlock}>
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          type="title"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={styles.title}
          accessibilityRole="header"
        >
          Today&apos;s progress
        </ThemedText>
        <XpLevelBar
          fillPercent={fillPercent}
          progressPercent={progressPercent}
          pulse={pulse}
          barRef={barRef}
          style={styles.bar}
        />
      </View>
      <StreakBadge height={STREAK_BADGE_HEIGHT} />
    </View>
  );
}

/** Title (28) + gap (4) + bar (28): the badge matches that stack. */
const STREAK_BADGE_HEIGHT = 60;

const styles = StyleSheet.create({
  headerRow: {
    ...TAB_HEADER_ROW_LAYOUT,
    backgroundColor: APP_SHELL_PRIMARY_BACKGROUND,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  contentBlock: {
    flex: 1,
    minWidth: 0,
    height: TAB_HEADER_CONTENT_HEIGHT,
    justifyContent: "flex-end",
    gap: 4,
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
  },
  bar: {
    alignSelf: "stretch",
  },
});
