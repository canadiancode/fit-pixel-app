import { StyleSheet, View } from "react-native";

import { BarChart } from "@/components/charts/bar-chart";
import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { useDailyGoals } from "@/features/actions/daily-goals-context";
import { useWeeklyHabitHistoryChart } from "@/features/actions/use-habit-history-chart";
import type { WaterUnit } from "@/lib/db";

/** Charts only go back a week; there is no longer-range history screen. */
const SECTION_TITLE = "Last 7 days";
/** Y-axis tick step for the weekly water chart in ounces. */
export const WATER_WEEKLY_CHART_INCREMENT = 10;
/** Y-axis tick step for water history when the goal unit is milliliters. */
export const WATER_HISTORY_CHART_INCREMENT_ML = 250;

/** `true` = Y-axis from 0; `false` = Y-axis from data min (snapped to increment). */
export const WATER_HISTORY_CHART_Y_DOMAIN_FROM_ZERO = false;

export function waterHistoryChartIncrement(unit: WaterUnit): number {
  return unit === "ml"
    ? WATER_HISTORY_CHART_INCREMENT_ML
    : WATER_WEEKLY_CHART_INCREMENT;
}

export function WaterWeeklyHistorySection() {
  const { goals } = useDailyGoals();
  const { userData } = useWeeklyHabitHistoryChart("waterAmount");
  const targetSuffix = goals.waterUnit === "ml" ? "ml" : "oz";

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
      </View>
      <BarChart
        increment={WATER_WEEKLY_CHART_INCREMENT}
        targetLabelSuffix={targetSuffix}
        targetVal={goals.waterAmount}
        theme="blue"
        userData={userData}
        yDomainFromZero={WATER_HISTORY_CHART_Y_DOMAIN_FROM_ZERO}
        accessibilityLabel="Water intake, last seven days"
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
});
