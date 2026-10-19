import { StyleSheet, View } from "react-native";

import { BarChart } from "@/components/charts/bar-chart";
import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { useDailyGoals } from "@/features/actions/daily-goals-context";
import {
  DEFAULT_HISTORY_LOOKBACK,
  historyLookbackLabel,
} from "@/features/actions/history-lookback";
import { useWeightHistoryChart } from "@/features/actions/use-weight-history-chart";
import type { WeightUnit } from "@/lib/db";

/** Charts only go back a week; there is no longer-range history screen. */
const SECTION_TITLE = "Last 7 days";
/** Y-axis tick step for the weight chart in pounds. */
export const WEIGHT_MONTHLY_CHART_INCREMENT = 20;
/** Y-axis tick step for weight history when the goal unit is kilograms. */
export const WEIGHT_HISTORY_CHART_INCREMENT_KG = 10;

export const WEIGHT_MONTHLY_CHART_Y_DOMAIN_FROM_ZERO = true;

export function weightHistoryChartIncrement(unit: WeightUnit): number {
  return unit === "kg"
    ? WEIGHT_HISTORY_CHART_INCREMENT_KG
    : WEIGHT_MONTHLY_CHART_INCREMENT;
}

export function WeightMonthlyHistorySection() {
  const lookback = DEFAULT_HISTORY_LOOKBACK;
  const { goals } = useDailyGoals();
  const { userData } = useWeightHistoryChart(lookback, goals.weightUnit);
  const unitLabel = goals.weightUnit === "kg" ? "KG" : "LBS";
  const rangeLabel = historyLookbackLabel(lookback);

  return (
    <View accessible accessibilityLabel={SECTION_TITLE} style={styles.section}>
      <ThemedText
        lightColor={APP_SHELL_MAIN_TEXT_COLOR}
        darkColor={APP_SHELL_MAIN_TEXT_COLOR}
        style={styles.title}
        accessibilityRole="header"
      >
        {SECTION_TITLE}
      </ThemedText>
      <BarChart
        increment={weightHistoryChartIncrement(goals.weightUnit)}
        targetLabel={`${String(goals.weightGoal)} ${unitLabel}`}
        targetVal={goals.weightGoal}
        theme="blue"
        userData={userData}
        yDomainFromZero={WEIGHT_MONTHLY_CHART_Y_DOMAIN_FROM_ZERO}
        accessibilityLabel={`Weight, ${rangeLabel}`}
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
  title: {
    alignSelf: "stretch",
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
  },
});
