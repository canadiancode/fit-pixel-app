import { Image } from "expo-image";
import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { useDailyGoals } from "@/features/actions/daily-goals-context";
import { DAILY_GOAL_LIMITS } from "@/lib/db";

import {
  CALORIES_ACTION_CARD_BACKGROUND,
  WATER_ADD_ICON,
  WATER_SUBTRACT_ICON,
} from "../constants";
import { getActionRowAccentColor } from "../data";

const SECTION_TITLE = "Daily target";
const TARGET_STEP_KCAL = 50;
const TARGET_MIN_KCAL = DAILY_GOAL_LIMITS.activeKcal.min;
const TARGET_MAX_KCAL = DAILY_GOAL_LIMITS.activeKcal.max;

export function CaloriesDailyTargetSection() {
  const accentColor = getActionRowAccentColor("calories");
  const { goals, updateGoals } = useDailyGoals();
  const targetKcal = goals.activeKcal;

  const decrease = useCallback(() => {
    void updateGoals({
      activeKcal: Math.max(TARGET_MIN_KCAL, targetKcal - TARGET_STEP_KCAL),
    });
  }, [targetKcal, updateGoals]);

  const increase = useCallback(() => {
    void updateGoals({
      activeKcal: Math.min(TARGET_MAX_KCAL, targetKcal + TARGET_STEP_KCAL),
    });
  }, [targetKcal, updateGoals]);

  const valueA11y = `${targetKcal} kilocalories`;

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
          source={CALORIES_ACTION_CARD_BACKGROUND}
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
              accessibilityLabel="Decrease daily calories target"
              accessibilityState={{ disabled: targetKcal <= TARGET_MIN_KCAL }}
              hitSlop={8}
              disabled={targetKcal <= TARGET_MIN_KCAL}
              onPress={decrease}
              style={({ pressed }) => [
                styles.stepperColumn,
                pressed && styles.stepperPressed,
                targetKcal <= TARGET_MIN_KCAL && styles.stepperDisabled,
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
                  {targetKcal}
                </Text>
                <Text style={styles.valueSuffix}>KCAL</Text>
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Increase daily calories target"
              accessibilityState={{ disabled: targetKcal >= TARGET_MAX_KCAL }}
              hitSlop={8}
              disabled={targetKcal >= TARGET_MAX_KCAL}
              onPress={increase}
              style={({ pressed }) => [
                styles.stepperColumn,
                pressed && styles.stepperPressed,
                targetKcal >= TARGET_MAX_KCAL && styles.stepperDisabled,
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
    marginLeft: 6,
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
});
