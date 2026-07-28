import { Image } from "expo-image";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { useHabitProgress } from "@/features/actions/habit-progress-context";

import {
  SLEEP_ADD_CARD_BACKGROUND,
  SLEEP_ADD_SLEEP_BUTTON_BACKGROUND,
  SLEEP_BULK_ADD_BACKGROUND,
  SLEEP_BULK_DURATION_OPTIONS,
  SLEEP_SERVING_MINUTES,
  WATER_ADD_ICON,
  WATER_SUBTRACT_ICON,
} from "../constants";

const SLEEP_ADD_CARD_TITLE = "Add sleep";
const SLEEP_ADD_BUTTON_LABEL = "Add sleep";
const SERVING_STEP_MIN = 15;

export function SleepAddCard() {
  const { addSleep } = useHabitProgress();
  const [servingMinutes, setServingMinutes] =
    useState<number>(SLEEP_SERVING_MINUTES);
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

  const commitMinutes = useCallback(
    async (durationMin: number) => {
      if (durationMin === 0 || isSaving) return;
      setIsSaving(true);
      try {
        await addSleep({ durationMin });
      } finally {
        setIsSaving(false);
      }
    },
    [addSleep, isSaving],
  );

  return (
    <View
      accessible
      accessibilityLabel={`${SLEEP_ADD_CARD_TITLE}. ${servingA11y}`}
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
          source={SLEEP_ADD_CARD_BACKGROUND}
          style={StyleSheet.absoluteFillObject}
          contentFit="fill"
        />
        <View style={styles.cardInner}>
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.title}
          >
            {SLEEP_ADD_CARD_TITLE}
          </ThemedText>
          <View style={styles.stepperRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Decrease sleep duration amount"
              hitSlop={8}
              disabled={isSaving}
              onPress={() => adjustServing(-SERVING_STEP_MIN)}
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
              accessibilityLabel="Increase sleep duration amount"
              hitSlop={8}
              disabled={isSaving}
              onPress={() => adjustServing(SERVING_STEP_MIN)}
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
              {SLEEP_BULK_DURATION_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.minutes}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${String(opt.minutes)} minutes of sleep`}
                  disabled={isSaving}
                  onPress={() => {
                    void commitMinutes(opt.minutes);
                  }}
                  style={({ pressed }) => [
                    styles.bulkColumn,
                    pressed && styles.stepperPressed,
                  ]}
                >
                  <View style={styles.bulkCellShell}>
                    <Image
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      source={SLEEP_BULK_ADD_BACKGROUND}
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
            accessibilityLabel="Add sleep to today's total"
            disabled={isSaving || servingMinutes === 0}
            onPress={() => {
              void commitMinutes(servingMinutes);
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
                source={SLEEP_ADD_SLEEP_BUTTON_BACKGROUND}
                style={StyleSheet.absoluteFillObject}
                contentFit="fill"
              />
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={styles.addButtonLabel}
              >
                {SLEEP_ADD_BUTTON_LABEL}
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
