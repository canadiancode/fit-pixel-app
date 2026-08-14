import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { BarChart } from "@/components/charts/bar-chart";
import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { ActionsSubScreenLayout } from "@/features/actions/components/actions-sub-screen-layout";
import { HistoryLookbackDropdown } from "@/features/actions/components/history-lookback-dropdown";
import {
  STEPS_WEEKLY_CHART_INCREMENT,
  STEPS_WEEKLY_CHART_Y_DOMAIN_FROM_ZERO,
} from "@/features/actions/components/steps-weekly-history-section";
import { useDailyGoals } from "@/features/actions/daily-goals-context";
import {
  DEFAULT_HISTORY_LOOKBACK,
  historyLookbackLabel,
  type HistoryLookbackId,
} from "@/features/actions/history-lookback";
import { useStepsHistoryChart } from "@/features/actions/use-steps-history-chart";

export default function StepsHistoryScreen() {
  const [lookback, setLookback] = useState<HistoryLookbackId>(
    DEFAULT_HISTORY_LOOKBACK,
  );
  const { goals } = useDailyGoals();
  const { userData } = useStepsHistoryChart(lookback);
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
          Steps history
        </ThemedText>
        <View style={styles.lookback}>
          <HistoryLookbackDropdown value={lookback} onChange={setLookback} />
        </View>
        <BarChart
          increment={STEPS_WEEKLY_CHART_INCREMENT}
          targetLabel={`${goals.steps.toLocaleString("en-US")} STEPS`}
          targetVal={goals.steps}
          theme="blue"
          userData={userData}
          yDomainFromZero={STEPS_WEEKLY_CHART_Y_DOMAIN_FROM_ZERO}
          accessibilityLabel={`Steps, ${rangeLabel}`}
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
