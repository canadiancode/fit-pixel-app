import { Image } from "expo-image";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { useHabitProgress } from "@/features/actions/habit-progress-context";
import { useHoldToRepeat } from "@/hooks/use-hold-to-repeat";

import {
  STEPS_ADD_CARD_BACKGROUND,
  STEPS_ADD_STEPS_BUTTON_BACKGROUND,
  STEPS_BULK_ADD_BACKGROUND,
  STEPS_BULK_AMOUNT_OPTIONS,
  STEPS_SERVING_AMOUNT,
  STEPS_SUBTRACT_STEPS_BUTTON_BACKGROUND,
  WATER_ADD_ICON,
  WATER_SUBTRACT_ICON,
} from "../constants";

const STEPS_ADD_CARD_TITLE = "Add steps";
const STEPS_ADD_STEPS_BUTTON_LABEL = "Add steps";
const SERVING_STEP = 100;

function formatStepsDelta(n: number): string {
  const sign = n < 0 ? "-" : "+";
  return `${sign}${Math.abs(n).toLocaleString("en-US")}`;
}

export function StepsAddCard() {
  const { addSteps } = useHabitProgress();
  const [servingSteps, setServingSteps] = useState(STEPS_SERVING_AMOUNT);
  const [isSaving, setIsSaving] = useState(false);

  const isSubtract = servingSteps < 0;
  const absStepsLabel = Math.abs(servingSteps).toLocaleString("en-US");
  const commitButtonLabel = isSubtract
    ? `Subtract ${absStepsLabel}`
    : STEPS_ADD_STEPS_BUTTON_LABEL;
  const commitButtonBackground = isSubtract
    ? STEPS_SUBTRACT_STEPS_BUTTON_BACKGROUND
    : STEPS_ADD_STEPS_BUTTON_BACKGROUND;
  const commitA11y = isSubtract
    ? `Subtract ${absStepsLabel} steps from today's total`
    : "Add steps to today's total";

  const servingAmountDisplay = formatStepsDelta(servingSteps);
  const servingA11y =
    servingSteps === 0
      ? "0 steps"
      : `${servingSteps > 0 ? "Plus" : "Minus"} ${absStepsLabel} steps`;

  const adjustServing = useCallback((delta: number) => {
    setServingSteps((current) => current + delta);
  }, []);

  const decreaseServing = useCallback(() => {
    adjustServing(-SERVING_STEP);
  }, [adjustServing]);

  const increaseServing = useCallback(() => {
    adjustServing(SERVING_STEP);
  }, [adjustServing]);

  const decreaseHold = useHoldToRepeat(decreaseServing, { disabled: isSaving });
  const increaseHold = useHoldToRepeat(increaseServing, { disabled: isSaving });

  const commitSteps = useCallback(
    async (steps: number) => {
      if (steps === 0 || isSaving) return;
      setIsSaving(true);
      try {
        await addSteps({ steps });
      } finally {
        setIsSaving(false);
      }
    },
    [addSteps, isSaving],
  );

  return (
    <View
      accessible
      accessibilityLabel={`${STEPS_ADD_CARD_TITLE}. ${servingA11y}`}
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
          source={STEPS_ADD_CARD_BACKGROUND}
          style={StyleSheet.absoluteFillObject}
          contentFit="fill"
        />
        <View style={styles.cardInner}>
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.title}
          >
            {STEPS_ADD_CARD_TITLE}
          </ThemedText>
          <View style={styles.stepperRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Decrease step amount"
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
              accessibilityLabel="Increase step amount"
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
              {STEPS_BULK_AMOUNT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.amount}
                  accessibilityRole="button"
                  accessibilityLabel={`Increase amount by ${opt.amount.toLocaleString("en-US")} steps`}
                  disabled={isSaving}
                  onPress={() => adjustServing(opt.amount)}
                  style={({ pressed }) => [
                    styles.bulkColumn,
                    pressed && styles.stepperPressed,
                  ]}
                >
                  <View style={styles.bulkCellShell}>
                    <Image
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      source={STEPS_BULK_ADD_BACKGROUND}
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
            accessibilityLabel={commitA11y}
            disabled={isSaving || servingSteps === 0}
            onPress={() => {
              void commitSteps(servingSteps);
            }}
            style={({ pressed }) => [
              styles.addStepsButton,
              pressed && styles.stepperPressed,
            ]}
          >
            <View style={styles.addStepsButtonShell}>
              <Image
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                source={commitButtonBackground}
                style={StyleSheet.absoluteFillObject}
                contentFit="fill"
              />
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={styles.addStepsButtonLabel}
              >
                {commitButtonLabel}
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
    flex: 1,
    minWidth: 88,
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
  addStepsButton: {
    alignSelf: "stretch",
  },
  addStepsButtonShell: {
    width: "100%",
    minHeight: 48,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  addStepsButtonLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
});
