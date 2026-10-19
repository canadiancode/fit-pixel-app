import { StyleSheet, View } from "react-native";

import { BarChart } from "@/components/charts/bar-chart";
import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { ActionsSubScreenLayout } from "@/features/actions/components/actions-sub-screen-layout";
import {
  FOOD_DAILY_CHART_INCREMENT,
  FOOD_DAILY_CHART_Y_DOMAIN_FROM_ZERO,
} from "@/features/actions/components/food-daily-history-section";
import { useDailyGoals } from "@/features/actions/daily-goals-context";
import {
  DEFAULT_HISTORY_LOOKBACK,
  historyLookbackLabel,
} from "@/features/actions/history-lookback";
import { useFoodHistoryChart } from "@/features/actions/use-food-history-chart";

/** Y-axis tick step for protein, carb, and fat history (grams per day). */
const FOOD_MACRO_CHART_INCREMENT = 50;

export default function FoodCaloricIntakeHistoryScreen() {
  const kcalLookback = DEFAULT_HISTORY_LOOKBACK;
  const proteinLookback = DEFAULT_HISTORY_LOOKBACK;
  const carbsLookback = DEFAULT_HISTORY_LOOKBACK;
  const fatLookback = DEFAULT_HISTORY_LOOKBACK;
  const { goals } = useDailyGoals();
  const { userData: kcalUserData } = useFoodHistoryChart(kcalLookback, "kcal");
  const { userData: proteinUserData } = useFoodHistoryChart(
    proteinLookback,
    "proteinG",
  );
  const { userData: carbsUserData } = useFoodHistoryChart(
    carbsLookback,
    "carbsG",
  );
  const { userData: fatUserData } = useFoodHistoryChart(fatLookback, "fatG");
  const kcalRangeLabel = historyLookbackLabel(kcalLookback);
  const proteinRangeLabel = historyLookbackLabel(proteinLookback);
  const carbsRangeLabel = historyLookbackLabel(carbsLookback);
  const fatRangeLabel = historyLookbackLabel(fatLookback);

  return (
    <ActionsSubScreenLayout>
      <View style={styles.stack}>
        <View style={styles.block}>
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.title}
            accessibilityRole="header"
          >
            Caloric intake history
          </ThemedText>
          <BarChart
            increment={FOOD_DAILY_CHART_INCREMENT}
            targetLabel={`${goals.foodKcal.toLocaleString("en-US")} KCAL`}
            targetVal={goals.foodKcal}
            theme="blue"
            userData={kcalUserData}
            yDomainFromZero={FOOD_DAILY_CHART_Y_DOMAIN_FROM_ZERO}
            accessibilityLabel={`Food energy, ${kcalRangeLabel}`}
          />
        </View>
        <View style={styles.block}>
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.title}
            accessibilityRole="header"
          >
            Protein intake history
          </ThemedText>
          <BarChart
            increment={FOOD_MACRO_CHART_INCREMENT}
            theme="blue"
            userData={proteinUserData}
            yDomainFromZero={FOOD_DAILY_CHART_Y_DOMAIN_FROM_ZERO}
            accessibilityLabel={`Food protein, ${proteinRangeLabel}`}
          />
        </View>
        <View style={styles.block}>
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.title}
            accessibilityRole="header"
          >
            Carb intake history
          </ThemedText>
          <BarChart
            increment={FOOD_MACRO_CHART_INCREMENT}
            theme="blue"
            userData={carbsUserData}
            yDomainFromZero={FOOD_DAILY_CHART_Y_DOMAIN_FROM_ZERO}
            accessibilityLabel={`Food carbs, ${carbsRangeLabel}`}
          />
        </View>
        <View style={styles.block}>
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.title}
            accessibilityRole="header"
          >
            Fat intake history
          </ThemedText>
          <BarChart
            increment={FOOD_MACRO_CHART_INCREMENT}
            theme="blue"
            userData={fatUserData}
            yDomainFromZero={FOOD_DAILY_CHART_Y_DOMAIN_FROM_ZERO}
            accessibilityLabel={`Food fat, ${fatRangeLabel}`}
          />
        </View>
      </View>
    </ActionsSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 48,
    alignSelf: "stretch",
  },
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
});
