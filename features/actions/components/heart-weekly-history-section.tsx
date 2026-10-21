import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BarChart } from "@/components/charts/bar-chart";
import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import {
  restingHeartRateWeekAverage,
  type RestingHeartRateDay,
} from "@/hooks/resting-heart-rate-week";

import { HEART_WEEKLY_CHART_INCREMENT } from "../constants";

const SECTION_TITLE = "Last 7 days";

type Props = {
  days: readonly RestingHeartRateDay[];
};

export function HeartWeeklyHistorySection({ days }: Props) {
  const average = restingHeartRateWeekAverage(days);
  const userData = useMemo(
    () => ({ x: days.map((d) => d.label), y: days.map((d) => d.bpm ?? 0) }),
    [days],
  );

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
      {average == null ? (
        <Text style={styles.emptyText}>
          No readings this week. Your watch estimates resting heart rate after a
          day of wear.
        </Text>
      ) : (
        <BarChart
          increment={HEART_WEEKLY_CHART_INCREMENT}
          // The line marks the weekly average, not a goal: lower is better.
          targetLabel={`AVG ${average} BPM`}
          targetVal={average}
          theme="blue"
          userData={userData}
          yDomainFromZero
          accessibilityLabel={`Resting heart rate, last seven days, average ${average} BPM`}
        />
      )}
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
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
  },
  emptyText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
    color: APP_SHELL_LABEL_COLOR,
  },
});
