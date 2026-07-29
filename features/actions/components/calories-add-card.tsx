import { Image } from "expo-image";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { useHabitProgress } from "@/features/actions/habit-progress-context";
import { useHoldToRepeat } from "@/hooks/use-hold-to-repeat";

import {
  CALORIES_ADD_CALORIES_BUTTON_BACKGROUND,
  CALORIES_ADD_CARD_BACKGROUND,
  CALORIES_BULK_ADD_BACKGROUND,
  CALORIES_BULK_KCAL_OPTIONS,
  CALORIES_SERVING_KCAL,
  CALORIES_SUBTRACT_CALORIES_BUTTON_BACKGROUND,
  WATER_ADD_ICON,
  WATER_SUBTRACT_ICON,
} from "../constants";

const CALORIES_ADD_CARD_TITLE = "Add calories";
const CALORIES_ADD_BUTTON_LABEL = "Add calories";
const SERVING_STEP_KCAL = 10;

function formatKcalDelta(n: number): string {
  const sign = n < 0 ? "-" : "+";
  return `${sign}${Math.abs(n)}`;
}

export function CaloriesAddCard() {
  const { addActiveKcal } = useHabitProgress();
  const [servingKcal, setServingKcal] = useState(CALORIES_SERVING_KCAL);
  const [isSaving, setIsSaving] = useState(false);

  const isSubtract = servingKcal < 0;
  const absKcal = Math.abs(servingKcal);
  const commitButtonLabel = isSubtract
    ? `Subtract ${absKcal}`
    : CALORIES_ADD_BUTTON_LABEL;
  const commitButtonBackground = isSubtract
    ? CALORIES_SUBTRACT_CALORIES_BUTTON_BACKGROUND
    : CALORIES_ADD_CALORIES_BUTTON_BACKGROUND;
  const commitA11y = isSubtract
    ? `Subtract ${absKcal} kilocalories from today's total`
    : "Add calories to today's total";

  const servingAmountDisplay = `${formatKcalDelta(servingKcal)}\u00A0KCAL`;
  const servingA11y =
    servingKcal === 0
      ? "0 kilocalories"
      : `${servingKcal > 0 ? "Plus" : "Minus"} ${absKcal} kilocalories`;

  const adjustServing = useCallback((delta: number) => {
    setServingKcal((current) => current + delta);
  }, []);

  const decreaseServing = useCallback(() => {
    adjustServing(-SERVING_STEP_KCAL);
  }, [adjustServing]);

  const increaseServing = useCallback(() => {
    adjustServing(SERVING_STEP_KCAL);
  }, [adjustServing]);

  const decreaseHold = useHoldToRepeat(decreaseServing, { disabled: isSaving });
  const increaseHold = useHoldToRepeat(increaseServing, { disabled: isSaving });

  const commitKcal = useCallback(
    async (kcal: number) => {
      if (kcal === 0 || isSaving) return;
      setIsSaving(true);
      try {
        await addActiveKcal({ kcal });
      } finally {
        setIsSaving(false);
      }
    },
    [addActiveKcal, isSaving],
  );

  return (
    <View
      accessible
      accessibilityLabel={`${CALORIES_ADD_CARD_TITLE}. ${servingA11y}`}
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
          source={CALORIES_ADD_CARD_BACKGROUND}
          style={StyleSheet.absoluteFillObject}
          contentFit="fill"
        />
        <View style={styles.cardInner}>
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.title}
          >
            {CALORIES_ADD_CARD_TITLE}
          </ThemedText>
          <View style={styles.stepperRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Decrease calorie amount"
              hitSlop={8}
              disabled={isSaving}
              onPressIn={decreaseHold.onPressIn}
              onPressOut={decreaseHold.onPressOut}
              style={({ pressed }) => [
                styles.stepperSide,
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
            <View style={styles.stepperValue}>
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={styles.servingLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                {servingAmountDisplay}
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Increase calorie amount"
              hitSlop={8}
              disabled={isSaving}
              onPressIn={increaseHold.onPressIn}
              onPressOut={increaseHold.onPressOut}
              style={({ pressed }) => [
                styles.stepperSide,
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
              {CALORIES_BULK_KCAL_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.kcal}
                  accessibilityRole="button"
                  accessibilityLabel={`Increase amount by ${String(opt.kcal)} kilocalories`}
                  disabled={isSaving}
                  onPress={() => adjustServing(opt.kcal)}
                  style={({ pressed }) => [
                    styles.bulkColumn,
                    pressed && styles.stepperPressed,
                  ]}
                >
                  <View style={styles.bulkCellShell}>
                    <Image
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      source={CALORIES_BULK_ADD_BACKGROUND}
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
            disabled={isSaving || servingKcal === 0}
            onPress={() => {
              void commitKcal(servingKcal);
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
                source={commitButtonBackground}
                style={StyleSheet.absoluteFillObject}
                contentFit="fill"
              />
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={styles.addButtonLabel}
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
  stepperSide: {
    width: 48,
    flexShrink: 0,
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
    paddingHorizontal: 4,
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
    alignSelf: "stretch",
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
    minWidth: 76,
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
