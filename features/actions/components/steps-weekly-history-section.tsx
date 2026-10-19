import { StyleSheet, View } from "react-native";

import { BarChart } from "@/components/charts/bar-chart";
import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { useDailyGoals } from "@/features/actions/daily-goals-context";
import { useWeeklyHabitHistoryChart } from "@/features/actions/use-habit-history-chart";

/** Charts only go back a week; there is no longer-range history screen. */
const SECTION_TITLE = "Last 7 days";
/** Y-axis tick step for the weekly steps chart. */
export const STEPS_WEEKLY_CHART_INCREMENT = 2_000;

/** `true` = Y-axis from 0; `false` = Y-axis from data min (snapped to increment). */
export const STEPS_WEEKLY_CHART_Y_DOMAIN_FROM_ZERO = true;

export function StepsWeeklyHistorySection() {
  const { goals } = useDailyGoals();
  const { userData } = useWeeklyHabitHistoryChart("steps");

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
        increment={STEPS_WEEKLY_CHART_INCREMENT}
        targetLabel={`${goals.steps.toLocaleString("en-US")} STEPS`}
        targetVal={goals.steps}
        theme="blue"
        userData={userData}
        yDomainFromZero={STEPS_WEEKLY_CHART_Y_DOMAIN_FROM_ZERO}
        accessibilityLabel="Steps, last seven days"
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
