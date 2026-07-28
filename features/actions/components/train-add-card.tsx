import { Image } from "expo-image";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { useHabitProgress } from "@/features/actions/habit-progress-context";
import { useHoldToRepeat } from "@/hooks/use-hold-to-repeat";

import {
  TRAIN_ADD_CARD_BACKGROUND,
  TRAIN_ADD_TIME_BUTTON_BACKGROUND,
  TRAIN_BULK_ADD_BACKGROUND,
  TRAIN_BULK_DURATION_OPTIONS,
  TRAIN_SERVING_MINUTES,
  WATER_ADD_ICON,
  WATER_SUBTRACT_ICON,
} from "../constants";

const TRAIN_ADD_CARD_TITLE = "Add time";
const TRAIN_ADD_TIME_BUTTON_LABEL = "Add time";
const SERVING_STEP_MIN = 5;

export function TrainAddCard() {
  const { addTrain } = useHabitProgress();
  const [servingMinutes, setServingMinutes] =
    useState<number>(TRAIN_SERVING_MINUTES);
  const [isSaving, setIsSaving] = useState(false);

  const servingSign = servingMinutes < 0 ? "-" : "+";
  const servingAmountDisplay = `${servingSign}${Math.abs(servingMinutes)}M`;
  const servingA11y =
    servingMinutes === 0
      ? "0 minutes"
      : `${servingMinutes > 0 ? "Plus" : "Minus"} ${Math.abs(servingMinutes)} minutes`;

  const adjustServing = useCallback((delta: number) => {
    setServingMinutes((current) => current + delta);
  }, []);

  const decreaseServing = useCallback(() => {
    adjustServing(-SERVING_STEP_MIN);
  }, [adjustServing]);

  const increaseServing = useCallback(() => {
    adjustServing(SERVING_STEP_MIN);
  }, [adjustServing]);

  const decreaseHold = useHoldToRepeat(decreaseServing, { disabled: isSaving });
  const increaseHold = useHoldToRepeat(increaseServing, { disabled: isSaving });

  const commitMinutes = useCallback(
    async (durationMin: number) => {
      if (durationMin === 0 || isSaving) return;
      setIsSaving(true);
      try {
        await addTrain({ durationMin });
      } finally {
        setIsSaving(false);
      }
    },
    [addTrain, isSaving],
  );

  return (
    <View
      accessible
      accessibilityLabel={`${TRAIN_ADD_CARD_TITLE}. ${servingA11y}`}
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
          source={TRAIN_ADD_CARD_BACKGROUND}
          style={StyleSheet.absoluteFillObject}
          contentFit="fill"
        />
        <View style={styles.cardInner}>
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.title}
          >
            {TRAIN_ADD_CARD_TITLE}
          </ThemedText>
          <View style={styles.stepperRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Decrease training time amount"
              hitSlop={8}
              disabled={isSaving}
              onPressIn={decreaseHold.onPressIn}
              onPressOut={decreaseHold.onPressOut}
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
                {servingAmountDisplay}
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Increase training time amount"
              hitSlop={8}
              disabled={isSaving}
              onPressIn={increaseHold.onPressIn}
              onPressOut={increaseHold.onPressOut}
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
          <View style={styles.bulkRowWrap}>
            <View style={styles.bulkRow}>
              {TRAIN_BULK_DURATION_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.minutes}
                  accessibilityRole="button"
                  accessibilityLabel={`Increase amount by ${opt.minutes} minutes`}
                  disabled={isSaving}
                  onPress={() => adjustServing(opt.minutes)}
                  style={({ pressed }) => [
                    styles.bulkColumn,
                    pressed && styles.stepperPressed,
                  ]}
                >
                  <View style={styles.bulkCellShell}>
                    <Image
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      source={TRAIN_BULK_ADD_BACKGROUND}
                      style={StyleSheet.absoluteFillObject}
                      contentFit="fill"
                    />
                    <ThemedText
                      lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                      darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                      style={styles.bulkLabel}
                    >
                      {opt.label}
                    </ThemedText>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add training time to today's total"
            disabled={isSaving || servingMinutes === 0}
            onPress={() => {
              void commitMinutes(servingMinutes);
            }}
            style={({ pressed }) => [
              styles.addTimeButton,
              pressed && styles.stepperPressed,
            ]}
          >
            <View style={styles.addTimeButtonShell}>
              <Image
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                source={TRAIN_ADD_TIME_BUTTON_BACKGROUND}
                style={StyleSheet.absoluteFillObject}
                contentFit="fill"
              />
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={styles.addTimeButtonLabel}
              >
                {TRAIN_ADD_TIME_BUTTON_LABEL}
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
  bulkRowWrap: {
    width: "100%",
    alignItems: "center",
  },
  bulkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bulkColumn: {
    width: 76,
  },
  bulkCellShell: {
    width: "100%",
    minHeight: 52,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
  bulkLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 14,
    textAlign: "center",
  },
  addTimeButton: {
    alignSelf: "stretch",
  },
  addTimeButtonShell: {
    width: "100%",
    minHeight: 48,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  addTimeButtonLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
});
