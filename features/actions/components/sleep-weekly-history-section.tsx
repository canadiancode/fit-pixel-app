import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

import { BarChart } from "@/components/charts/bar-chart";
import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { useDailyGoals } from "@/features/actions/daily-goals-context";
import { useWeeklyHabitHistoryChart } from "@/features/actions/use-habit-history-chart";
import { formatSleepDurationLabel } from "@/features/actions/data";

import { WATER_RIGHT_ARROW_ICON } from "../constants";

const SECTION_TITLE = "History";
const VIEW_HISTORY_LABEL = "View history";
/** Y-axis tick step for the weekly sleep chart (hours). */
const SLEEP_WEEKLY_CHART_INCREMENT = 1;

const SLEEP_WEEKLY_CHART_Y_DOMAIN_FROM_ZERO = true;

export function SleepWeeklyHistorySection() {
  const { goals } = useDailyGoals();
  const { userData } = useWeeklyHabitHistoryChart("sleepHours");

  return (
    <View accessible accessibilityLabel={SECTION_TITLE} style={styles.section}>
      <View style={styles.headerRow}>
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.title}
          accessibilityRole="header"
        >
          {SECTION_TITLE}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={VIEW_HISTORY_LABEL}
          hitSlop={8}
          style={({ pressed }) => [
            styles.viewHistoryControl,
            pressed && styles.viewHistoryPressed,
          ]}
        >
          <View style={styles.viewHistoryRow}>
            <ThemedText
              lightColor={APP_SHELL_LABEL_COLOR}
              darkColor={APP_SHELL_LABEL_COLOR}
              numberOfLines={1}
              style={styles.viewHistoryLabel}
            >
              {VIEW_HISTORY_LABEL}
            </ThemedText>
            <Image
              accessibilityIgnoresInvertColors
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              source={WATER_RIGHT_ARROW_ICON}
              style={styles.viewHistoryArrow}
              contentFit="contain"
            />
          </View>
        </Pressable>
      </View>
      <BarChart
        increment={SLEEP_WEEKLY_CHART_INCREMENT}
        targetLabel={formatSleepDurationLabel(goals.sleepHours)}
        targetVal={goals.sleepHours}
        theme="blue"
        userData={userData}
        yDomainFromZero={SLEEP_WEEKLY_CHART_Y_DOMAIN_FROM_ZERO}
        accessibilityLabel="Sleep hours, last seven days"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    alignSelf: "stretch",
    paddingVertical: 8,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    alignSelf: "stretch",
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
  },
  viewHistoryControl: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  viewHistoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "nowrap",
    gap: 6,
    flexShrink: 0,
  },
  viewHistoryPressed: {
    opacity: 0.85,
  },
  viewHistoryLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 14,
    flexShrink: 0,
  },
  viewHistoryArrow: {
    width: 32,
    height: 32,
    flexShrink: 0,
  },
});
