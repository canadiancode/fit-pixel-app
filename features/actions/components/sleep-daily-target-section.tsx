import { Image } from "expo-image";
import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { useDailyGoals } from "@/features/actions/daily-goals-context";
import { useHoldToRepeat } from "@/hooks/use-hold-to-repeat";
import { DAILY_GOAL_LIMITS } from "@/lib/db";

import {
  SLEEP_ACTION_CARD_BACKGROUND,
  WATER_ADD_ICON,
  WATER_SUBTRACT_ICON,
} from "../constants";
import { getActionRowAccentColor } from "../data";

const SECTION_TITLE = "Daily target";
const TARGET_STEP_MINUTES = 5;
const TARGET_MIN_HOURS = DAILY_GOAL_LIMITS.sleepHours.min;
const TARGET_MAX_HOURS = DAILY_GOAL_LIMITS.sleepHours.max;
const TARGET_MIN_MINUTES = TARGET_MIN_HOURS * 60;
const TARGET_MAX_MINUTES = TARGET_MAX_HOURS * 60;

function sleepHoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}

export function SleepDailyTargetSection() {
  const accentColor = getActionRowAccentColor("sleep");
  const { goals, updateGoals } = useDailyGoals();
  const targetMinutes = sleepHoursToMinutes(goals.sleepHours);
  const hoursPart = Math.floor(targetMinutes / 60);
  const minutesPart = targetMinutes % 60;

  const decrease = useCallback(() => {
    void updateGoals((prev) => {
      const nextMinutes = Math.max(
        TARGET_MIN_MINUTES,
        sleepHoursToMinutes(prev.sleepHours) - TARGET_STEP_MINUTES,
      );
      return { sleepHours: nextMinutes / 60 };
    });
  }, [updateGoals]);

  const increase = useCallback(() => {
    void updateGoals((prev) => {
      const nextMinutes = Math.min(
        TARGET_MAX_MINUTES,
        sleepHoursToMinutes(prev.sleepHours) + TARGET_STEP_MINUTES,
      );
      return { sleepHours: nextMinutes / 60 };
    });
  }, [updateGoals]);

  const decreaseHold = useHoldToRepeat(decrease, {
    disabled: targetMinutes <= TARGET_MIN_MINUTES,
  });
  const increaseHold = useHoldToRepeat(increase, {
    disabled: targetMinutes >= TARGET_MAX_MINUTES,
  });

  const valueA11y =
    minutesPart === 0
      ? `${hoursPart} hours`
      : `${hoursPart} hours ${minutesPart} minutes`;

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
          source={SLEEP_ACTION_CARD_BACKGROUND}
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
              accessibilityLabel="Decrease daily sleep target"
              accessibilityState={{
                disabled: targetMinutes <= TARGET_MIN_MINUTES,
              }}
              hitSlop={8}
              disabled={targetMinutes <= TARGET_MIN_MINUTES}
              onPressIn={decreaseHold.onPressIn}
              onPressOut={decreaseHold.onPressOut}
              style={({ pressed }) => [
                styles.stepperColumn,
                pressed && styles.stepperPressed,
                targetMinutes <= TARGET_MIN_MINUTES && styles.stepperDisabled,
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
              style={styles.stepperColumn}
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
                  {hoursPart}
                </Text>
                <Text style={styles.valueSuffix}>H</Text>
                {minutesPart > 0 ? (
                  <>
                    <Text style={[styles.valueNumber, { color: accentColor }]}>
                      {minutesPart}
                    </Text>
                    <Text style={styles.valueSuffix}>M</Text>
                  </>
                ) : null}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Increase daily sleep target"
              accessibilityState={{
                disabled: targetMinutes >= TARGET_MAX_MINUTES,
              }}
              hitSlop={8}
              disabled={targetMinutes >= TARGET_MAX_MINUTES}
              onPressIn={increaseHold.onPressIn}
              onPressOut={increaseHold.onPressOut}
              style={({ pressed }) => [
                styles.stepperColumn,
                pressed && styles.stepperPressed,
                targetMinutes >= TARGET_MAX_MINUTES && styles.stepperDisabled,
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
  stepperColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
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
    marginLeft: 1,
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
});
