import { Image } from "expo-image";
import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { useDailyGoals } from "@/features/actions/daily-goals-context";
import { useHabitProgress } from "@/features/actions/habit-progress-context";
import { useHoldToRepeat } from "@/hooks/use-hold-to-repeat";
import {
  DAILY_GOAL_LIMITS,
  getFoodGoalRange,
  type FoodGoalMode,
} from "@/lib/db";

import {
  FOOD_ACTION_CARD_BACKGROUND,
  WATER_ADD_ICON,
  WATER_SUBTRACT_ICON,
} from "../constants";
import { getActionRowAccentColor, getFoodGoalModeForTotals } from "../data";

const SECTION_TITLE = "Daily target";
const FOOD_DAILY_TARGET_STEP_KCAL = 50;
const FOOD_DAILY_TARGET_MIN_KCAL = DAILY_GOAL_LIMITS.foodKcal.min;
const FOOD_DAILY_TARGET_MAX_KCAL = DAILY_GOAL_LIMITS.foodKcal.max;

/** Rounds range ends to the stepper's 50 kcal so the copy reads cleanly. */
function roundKcal(kcal: number): string {
  return (Math.round(kcal / 50) * 50).toLocaleString("en-US");
}

/** What counts as hitting the target, from the weight journey's direction. */
function foodGoalHint(mode: FoodGoalMode, targetKcal: number): string {
  const { min, max } = getFoodGoalRange(mode, targetKcal);
  switch (mode) {
    case "under":
      return `Losing weight: land between ${roundKcal(min)} and ${roundKcal(max)} kcal. Staying under counts.`;
    case "over":
      return `Gaining weight: reach ${roundKcal(min)} kcal or more.`;
    case "near":
      return `Maintaining: land between ${roundKcal(min)} and ${roundKcal(max)} kcal.`;
  }
}

export function FoodDailyTargetSection() {
  const accentColor = getActionRowAccentColor("food");
  const { goals, updateGoals } = useDailyGoals();
  const { totals } = useHabitProgress();
  const dailyTargetKcal = goals.foodKcal;
  const hint = foodGoalHint(
    getFoodGoalModeForTotals(goals, totals),
    dailyTargetKcal,
  );

  const decrease = useCallback(() => {
    void updateGoals((prev) => ({
      foodKcal: Math.max(
        FOOD_DAILY_TARGET_MIN_KCAL,
        prev.foodKcal - FOOD_DAILY_TARGET_STEP_KCAL,
      ),
    }));
  }, [updateGoals]);

  const increase = useCallback(() => {
    void updateGoals((prev) => ({
      foodKcal: Math.min(
        FOOD_DAILY_TARGET_MAX_KCAL,
        prev.foodKcal + FOOD_DAILY_TARGET_STEP_KCAL,
      ),
    }));
  }, [updateGoals]);

  const decreaseHold = useHoldToRepeat(decrease, {
    disabled: dailyTargetKcal <= FOOD_DAILY_TARGET_MIN_KCAL,
  });
  const increaseHold = useHoldToRepeat(increase, {
    disabled: dailyTargetKcal >= FOOD_DAILY_TARGET_MAX_KCAL,
  });

  const valueA11y = `${dailyTargetKcal.toLocaleString("en-US")} kilocalories daily`;

  return (
    <View
      accessible
      accessibilityLabel={`${SECTION_TITLE}. ${valueA11y}. ${hint}`}
      style={styles.card}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.cardImageShell}
      >
        <Image
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          source={FOOD_ACTION_CARD_BACKGROUND}
          style={StyleSheet.absoluteFillObject}
          contentFit="fill"
        />
        <View style={styles.cardInner}>
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.title}
            accessibilityRole="header"
          >
            {SECTION_TITLE}
          </ThemedText>
          <View style={styles.stepperRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Decrease daily food energy target"
              accessibilityState={{
                disabled: dailyTargetKcal <= FOOD_DAILY_TARGET_MIN_KCAL,
              }}
              hitSlop={8}
              disabled={dailyTargetKcal <= FOOD_DAILY_TARGET_MIN_KCAL}
              onPressIn={decreaseHold.onPressIn}
              onPressOut={decreaseHold.onPressOut}
              style={({ pressed }) => [
                styles.stepperButton,
                pressed && styles.stepperPressed,
                dailyTargetKcal <= FOOD_DAILY_TARGET_MIN_KCAL &&
                  styles.stepperDisabled,
              ]}
            >
              <Image
                accessibilityIgnoresInvertColors
                source={WATER_SUBTRACT_ICON}
                style={styles.stepperIcon}
                contentFit="contain"
              />
            </Pressable>
            <View
              style={styles.stepperValue}
              accessible
              accessibilityLabel={valueA11y}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={styles.valueText}
              >
                <Text style={[styles.valueNumber, { color: accentColor }]}>
                  {dailyTargetKcal.toLocaleString("en-US")}
                </Text>
                <Text style={styles.valueSuffix}>{" "}KCAL</Text>
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Increase daily food energy target"
              accessibilityState={{
                disabled: dailyTargetKcal >= FOOD_DAILY_TARGET_MAX_KCAL,
              }}
              hitSlop={8}
              disabled={dailyTargetKcal >= FOOD_DAILY_TARGET_MAX_KCAL}
              onPressIn={increaseHold.onPressIn}
              onPressOut={increaseHold.onPressOut}
              style={({ pressed }) => [
                styles.stepperButton,
                pressed && styles.stepperPressed,
                dailyTargetKcal >= FOOD_DAILY_TARGET_MAX_KCAL &&
                  styles.stepperDisabled,
              ]}
            >
              <Image
                accessibilityIgnoresInvertColors
                source={WATER_ADD_ICON}
                style={styles.stepperIcon}
                contentFit="contain"
              />
            </Pressable>
          </View>
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.hint}
          >
            {hint}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "stretch",
    borderRadius: 12,
    overflow: "hidden",
  },
  cardImageShell: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  cardInner: {
    paddingVertical: 28,
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    alignSelf: "stretch",
    textAlign: "center",
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.75,
    textAlign: "center",
    alignSelf: "stretch",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
  },
  /** Fixed width so the value column gets the rest of the row. */
  stepperButton: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  stepperValue: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 8,
  },
  stepperIcon: {
    width: 40,
    height: 40,
  },
  stepperPressed: {
    opacity: 0.85,
  },
  stepperDisabled: {
    opacity: 0.35,
  },
  valueText: {
    fontFamily: FONT_FAMILY,
    textAlign: "center",
  },
  valueNumber: {
    fontFamily: FONT_FAMILY,
    fontSize: 27.5,
    lineHeight: 35,
  },
  valueSuffix: {
    fontFamily: FONT_FAMILY,
    fontSize: 20,
    lineHeight: 25,
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
});
