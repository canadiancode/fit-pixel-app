import { Image } from "expo-image";
import { useCallback } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { useDailyGoals } from "@/features/actions/daily-goals-context";
import { useWeightFormat } from "@/features/actions/weight/use-weight-format";
import { targetCaption } from "@/features/actions/weight/weight-copy";
import { useWeightJourney } from "@/features/actions/weight/weight-journey-context";
import { useHoldToRepeat } from "@/hooks/use-hold-to-repeat";
import { weightGoalLimits } from "@/lib/db";

import {
  WATER_ADD_ICON,
  WATER_SUBTRACT_ICON,
  WEIGHT_ACTION_CARD_BACKGROUND,
} from "../constants";
import { getActionRowAccentColor } from "../data";

const SECTION_TITLE = "Target";
const TARGET_STEP = 1;

export function WeightTargetSection() {
  const accentColor = getActionRowAccentColor("weight");
  const { goals, updateGoals } = useDailyGoals();
  const { journey, entries, restartJourney } = useWeightJourney();
  const { format } = useWeightFormat();
  const latest = entries.at(-1)?.value;
  const canRestart =
    latest != null && journey != null && latest !== journey.start;

  const confirmRestart = () => {
    Alert.alert(
      "Start a new journey?",
      `Your journey will start again from ${format(latest)}. Milestones you've already earned stay unlocked.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Start new journey", onPress: () => void restartJourney() },
      ],
    );
  };
  const targetWeight = goals.weightGoal;
  const unit = goals.weightUnit;
  const { min: targetMin, max: targetMax } = weightGoalLimits(unit);
  const suffix = unit === "lb" ? "LBS" : "KG";

  const decrease = useCallback(() => {
    void updateGoals((prev) => ({
      weightGoal: Math.max(targetMin, prev.weightGoal - TARGET_STEP),
    }));
  }, [targetMin, updateGoals]);

  const increase = useCallback(() => {
    void updateGoals((prev) => ({
      weightGoal: Math.min(targetMax, prev.weightGoal + TARGET_STEP),
    }));
  }, [targetMax, updateGoals]);

  const decreaseHold = useHoldToRepeat(decrease, {
    disabled: targetWeight <= targetMin,
  });
  const increaseHold = useHoldToRepeat(increase, {
    disabled: targetWeight >= targetMax,
  });

  const valueA11y =
    unit === "lb"
      ? `${targetWeight} pounds`
      : `${targetWeight} kilograms`;

  return (
    <View
      accessible
      accessibilityLabel={`${SECTION_TITLE}. ${valueA11y}`}
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
          source={WEIGHT_ACTION_CARD_BACKGROUND}
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
              accessibilityLabel="Decrease goal weight"
              accessibilityState={{ disabled: targetWeight <= targetMin }}
              hitSlop={8}
              disabled={targetWeight <= targetMin}
              onPressIn={decreaseHold.onPressIn}
              onPressOut={decreaseHold.onPressOut}
              style={({ pressed }) => [
                styles.stepperButton,
                pressed && styles.stepperPressed,
                targetWeight <= targetMin && styles.stepperDisabled,
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
                  {targetWeight}
                </Text>
                <Text style={styles.valueSuffix}>{" "}{suffix}</Text>
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Increase goal weight"
              accessibilityState={{ disabled: targetWeight >= targetMax }}
              hitSlop={8}
              disabled={targetWeight >= targetMax}
              onPressIn={increaseHold.onPressIn}
              onPressOut={increaseHold.onPressOut}
              style={({ pressed }) => [
                styles.stepperButton,
                pressed && styles.stepperPressed,
                targetWeight >= targetMax && styles.stepperDisabled,
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
          <Text style={styles.caption}>
            {targetCaption(journey?.direction ?? null)}
          </Text>
          {canRestart ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start a new journey from your latest weight"
              onPress={confirmRestart}
              style={({ pressed }) => [styles.restart, pressed && styles.stepperPressed]}
            >
              <Text style={styles.restartLabel}>Start a new journey</Text>
            </Pressable>
          ) : null}
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
  caption: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 13,
    textAlign: "center",
    color: APP_SHELL_MAIN_TEXT_COLOR,
    opacity: 0.75,
  },
  restart: {
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  restartLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 12,
    color: APP_SHELL_MAIN_TEXT_COLOR,
    textDecorationLine: "underline",
  },
  valueSuffix: {
    fontFamily: FONT_FAMILY,
    fontSize: 20,
    lineHeight: 25,
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
});
