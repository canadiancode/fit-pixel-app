import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { BarChart } from "@/components/charts/bar-chart";
import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { ActionsSubScreenLayout } from "@/features/actions/components/actions-sub-screen-layout";
import {
  CALORIES_WEEKLY_CHART_INCREMENT,
  CALORIES_WEEKLY_CHART_Y_DOMAIN_FROM_ZERO,
} from "@/features/actions/components/calories-weekly-history-section";
import { HistoryLookbackDropdown } from "@/features/actions/components/history-lookback-dropdown";
import { useDailyGoals } from "@/features/actions/daily-goals-context";
import {
  DEFAULT_HISTORY_LOOKBACK,
  historyLookbackLabel,
  type HistoryLookbackId,
} from "@/features/actions/history-lookback";
import { useCaloriesHistoryChart } from "@/features/actions/use-calories-history-chart";

export default function CaloriesBurnedHistoryScreen() {
  const [lookback, setLookback] = useState<HistoryLookbackId>(
    DEFAULT_HISTORY_LOOKBACK,
  );
  const { goals } = useDailyGoals();
  const { userData } = useCaloriesHistoryChart(lookback);
  const rangeLabel = historyLookbackLabel(lookback);

  return (
    <ActionsSubScreenLayout>
      <View style={styles.block}>
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.title}
          accessibilityRole="header"
        >
          Calories burned history
        </ThemedText>
        <View style={styles.lookback}>
          <HistoryLookbackDropdown value={lookback} onChange={setLookback} />
        </View>
        <BarChart
          increment={CALORIES_WEEKLY_CHART_INCREMENT}
          targetLabel={`${String(goals.activeKcal)} KCAL`}
          targetVal={goals.activeKcal}
          theme="blue"
          userData={userData}
          yDomainFromZero={CALORIES_WEEKLY_CHART_Y_DOMAIN_FROM_ZERO}
          accessibilityLabel={`Calories burned, ${rangeLabel}`}
        />
      </View>
    </ActionsSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 12,
    alignSelf: "stretch",
  },
  title: {
    alignSelf: "stretch",
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
  },
  lookback: {
    alignSelf: "stretch",
    alignItems: "flex-end",
  },
});
