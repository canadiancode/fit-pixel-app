import { Image } from "expo-image";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { useDailyGoals } from "@/features/actions/daily-goals-context";
import { useHabitProgress } from "@/features/actions/habit-progress-context";

import {
  WATER_ADD_ICON,
  WATER_SUBTRACT_ICON,
  WEIGHT_ADD_CARD_BACKGROUND,
  WEIGHT_ADD_WEIGHT_BUTTON_BACKGROUND,
  WEIGHT_SERVING_LBS,
} from "../constants";

const WEIGHT_ADD_CARD_TITLE = "Input weight";
const WEIGHT_ADD_BUTTON_LABEL = "Input weight";

export function WeightAddCard() {
  const { goals } = useDailyGoals();
  const { totals, isHydrated, addWeight } = useHabitProgress();
  const unitLabel = goals.weightUnit === "kg" ? "KG" : "LBS";
  const step =
    goals.weightUnit === "kg" ? Math.max(0.5, WEIGHT_SERVING_LBS * 0.5) : 1;

  const [value, setValue] = useState(goals.weightGoal);
  const [isSaving, setIsSaving] = useState(false);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!isHydrated || seeded) return;
    setValue(totals.weight ?? goals.weightGoal);
    setSeeded(true);
  }, [goals.weightGoal, isHydrated, seeded, totals.weight]);

  const displayValue = `${Math.round(value * 10) / 10} ${unitLabel}`;

  const adjustValue = useCallback(
    (delta: number) => {
      setValue((current) => Math.round((current + delta) * 10) / 10);
    },
    [],
  );

  const commitWeight = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await addWeight({ value, unit: goals.weightUnit });
    } finally {
      setIsSaving(false);
    }
  }, [addWeight, goals.weightUnit, isSaving, value]);

  return (
    <View
      accessible
      accessibilityLabel={`${WEIGHT_ADD_CARD_TITLE}. ${displayValue}`}
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
          source={WEIGHT_ADD_CARD_BACKGROUND}
          style={StyleSheet.absoluteFillObject}
          contentFit="fill"
        />
        <View style={styles.cardInner}>
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.title}
          >
            {WEIGHT_ADD_CARD_TITLE}
          </ThemedText>
          <View style={styles.stepperRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Decrease weight log amount"
              hitSlop={8}
              disabled={isSaving}
              onPress={() => adjustValue(-step)}
              style={({ pressed }) => [
                styles.stepperColumn,
                pressed && styles.stepperPressed,
              ]}
            >
              <Image
                accessibilityIgnoresInvertColors
                source={WATER_SUBTRACT_ICON}
                style={styles.stepperIcon}
                contentFit="contain"
              />
            </Pressable>
            <View style={styles.stepperColumn}>
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={styles.servingLabel}
              >
                {displayValue}
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Increase weight log amount"
              hitSlop={8}
              disabled={isSaving}
              onPress={() => adjustValue(step)}
              style={({ pressed }) => [
                styles.stepperColumn,
                pressed && styles.stepperPressed,
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Input weight to log"
            disabled={isSaving}
            onPress={() => {
              void commitWeight();
            }}
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.stepperPressed,
            ]}
          >
            <View style={styles.addButtonShell}>
              <Image
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                source={WEIGHT_ADD_WEIGHT_BUTTON_BACKGROUND}
                style={StyleSheet.absoluteFillObject}
                contentFit="fill"
              />
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={styles.addButtonLabel}
              >
                {WEIGHT_ADD_BUTTON_LABEL}
              </ThemedText>
            </View>
          </Pressable>
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
    alignSelf: "flex-start",
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
  servingLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    lineHeight: 22,
    textAlign: "center",
  },
  addButton: {
    alignSelf: "stretch",
  },
  addButtonShell: {
    width: "100%",
    minHeight: 48,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  addButtonLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
});
