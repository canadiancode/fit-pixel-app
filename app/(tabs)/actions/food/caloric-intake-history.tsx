import { StyleSheet, View } from "react-native";

import { BarChart } from "@/components/charts/bar-chart";
import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_LABEL_COLOR, APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { ActionsSubScreenLayout } from "@/features/actions/components/actions-sub-screen-layout";
import {
  FOOD_DAILY_CHART_INCREMENT,
  FOOD_DAILY_CHART_Y_DOMAIN_FROM_ZERO,
} from "@/features/actions/components/food-daily-history-section";
import { useDailyGoals } from "@/features/actions/daily-goals-context";
import { useWeeklyHabitHistoryChart } from "@/features/actions/use-habit-history-chart";

export default function FoodCaloricIntakeHistoryScreen() {
  const { goals } = useDailyGoals();
  const { userData } = useWeeklyHabitHistoryChart("foodKcal");

  return (
    <ActionsSubScreenLayout>
      <View style={styles.block}>
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.title}
          accessibilityRole="header"
        >
          Caloric intake history
        </ThemedText>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.body}
        >
          Longer-range history and filters can live here; chart below shows the last seven
          days from local daily summaries.
        </ThemedText>
        <BarChart
          increment={FOOD_DAILY_CHART_INCREMENT}
          targetLabel={`${goals.foodKcal.toLocaleString("en-US")} KCAL`}
          targetVal={goals.foodKcal}
          theme="blue"
          userData={userData}
          yDomainFromZero={FOOD_DAILY_CHART_Y_DOMAIN_FROM_ZERO}
          accessibilityLabel="Food energy, last seven days"
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
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  body: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    lineHeight: 20,
  },
});
