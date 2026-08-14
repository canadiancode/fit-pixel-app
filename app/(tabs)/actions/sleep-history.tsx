import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { BarChart } from "@/components/charts/bar-chart";
import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { ActionsSubScreenLayout } from "@/features/actions/components/actions-sub-screen-layout";
import { HistoryLookbackDropdown } from "@/features/actions/components/history-lookback-dropdown";
import {
  SLEEP_WEEKLY_CHART_INCREMENT,
  SLEEP_WEEKLY_CHART_Y_DOMAIN_FROM_ZERO,
} from "@/features/actions/components/sleep-weekly-history-section";
import { useDailyGoals } from "@/features/actions/daily-goals-context";
import { formatSleepDurationLabel } from "@/features/actions/data";
import {
  DEFAULT_HISTORY_LOOKBACK,
  historyLookbackLabel,
  type HistoryLookbackId,
} from "@/features/actions/history-lookback";
import { useSleepHistoryChart } from "@/features/actions/use-sleep-history-chart";

export default function SleepHistoryScreen() {
  const [lookback, setLookback] = useState<HistoryLookbackId>(
    DEFAULT_HISTORY_LOOKBACK,
  );
  const { goals } = useDailyGoals();
  const { userData } = useSleepHistoryChart(lookback);
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
          Sleep history
        </ThemedText>
        <View style={styles.lookback}>
          <HistoryLookbackDropdown value={lookback} onChange={setLookback} />
        </View>
        <BarChart
          increment={SLEEP_WEEKLY_CHART_INCREMENT}
          targetLabel={formatSleepDurationLabel(goals.sleepHours)}
          targetVal={goals.sleepHours}
          theme="blue"
          userData={userData}
          yDomainFromZero={SLEEP_WEEKLY_CHART_Y_DOMAIN_FROM_ZERO}
          accessibilityLabel={`Sleep hours, ${rangeLabel}`}
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
