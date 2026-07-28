import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_INPUT_BOARDER_COLOR,
  APP_SHELL_INPUT_PLACEHOLDER_COLOR,
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";

import {
  FOOD_MEAL_ROW_HEART_ICON,
  FOOD_QUICK_ADD_MEAL_BUTTON,
} from "../constants";

const ADD_HIT_SIZE = 48;
const HEART_ICON_SIZE = 22;

type Props = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  /** Fat in grams (nutrition label “Total Fat”). */
  fat: number;
  /** When false, omit bottom border (e.g. last row in a list). */
  showBottomBorder: boolean;
  /** Logs this meal into today's food total. */
  onQuickAdd?: () => void | Promise<unknown>;
};

const MEAL_NAME_FONT_SIZE = 12;
const MEAL_CALORIES_FONT_SIZE = MEAL_NAME_FONT_SIZE - 1;
const MEAL_MACRO_FONT_SIZE = MEAL_CALORIES_FONT_SIZE;

/** Single meal name, macros summary lines, + quick-add control; no row background, optional bottom divider. */
export function FoodMealListRow({
  name,
  calories,
  protein,
  carbs,
  fat,
  showBottomBorder,
  onQuickAdd,
}: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const caloriesLabel = `Calories: ${calories.toLocaleString("en-US")}`;
  const proteinLabel = `Protein: ${protein}g`;
  const carbsLabel = `Carbs: ${carbs}g`;
  const fatLabel = `Fat: ${fat}g`;
  const macrosA11y = `${proteinLabel}, ${carbsLabel}, ${fatLabel}`;

  return (
    <View style={[styles.cell, showBottomBorder && styles.cellBorderBottom]}>
      <View style={styles.row}>
        <View style={styles.textColumn}>
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.name}
            numberOfLines={2}
          >
            {name}
          </ThemedText>
          <ThemedText
            lightColor={APP_SHELL_LABEL_COLOR}
            darkColor={APP_SHELL_LABEL_COLOR}
            style={styles.calories}
            numberOfLines={1}
          >
            {caloriesLabel}
          </ThemedText>
          <ThemedText
            lightColor={APP_SHELL_INPUT_PLACEHOLDER_COLOR}
            darkColor={APP_SHELL_INPUT_PLACEHOLDER_COLOR}
            style={styles.macroLine}
            numberOfLines={1}
          >
            {proteinLabel}
          </ThemedText>
          <ThemedText
            lightColor={APP_SHELL_INPUT_PLACEHOLDER_COLOR}
            darkColor={APP_SHELL_INPUT_PLACEHOLDER_COLOR}
            style={styles.macroLine}
            numberOfLines={1}
          >
            {carbsLabel}
          </ThemedText>
          <ThemedText
            lightColor={APP_SHELL_INPUT_PLACEHOLDER_COLOR}
            darkColor={APP_SHELL_INPUT_PLACEHOLDER_COLOR}
            style={styles.macroLine}
            numberOfLines={1}
          >
            {fatLabel}
          </ThemedText>
        </View>
        <View style={styles.addColumn}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add ${name}, ${caloriesLabel}, ${macrosA11y}, to today`}
            hitSlop={8}
            disabled={isSaving || onQuickAdd == null}
            onPress={() => {
              if (onQuickAdd == null || isSaving) return;
              setIsSaving(true);
              void Promise.resolve(onQuickAdd()).finally(() => {
                setIsSaving(false);
              });
            }}
            style={({ pressed }) => [
              styles.addHit,
              pressed && styles.addHitPressed,
            ]}
          >
            <View style={styles.addVisual}>
              <Image
                accessibilityIgnoresInvertColors
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                source={FOOD_QUICK_ADD_MEAL_BUTTON}
                style={StyleSheet.absoluteFillObject}
                contentFit="contain"
              />
              <Text style={styles.plusGlyph} pointerEvents="none">
                +
              </Text>
            </View>
          </Pressable>
          <Image
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            source={FOOD_MEAL_ROW_HEART_ICON}
            style={styles.heartIcon}
            contentFit="contain"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    alignSelf: "stretch",
    paddingVertical: 10,
  },
  cellBorderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: APP_SHELL_INPUT_BOARDER_COLOR,
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
    alignSelf: "stretch",
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    justifyContent: "center",
  },
  name: {
    fontFamily: FONT_FAMILY,
    fontSize: MEAL_NAME_FONT_SIZE,
    lineHeight: 18,
    fontWeight: "600",
  },
  calories: {
    fontFamily: FONT_FAMILY,
    fontSize: MEAL_CALORIES_FONT_SIZE,
    lineHeight: 16,
    fontWeight: "500",
  },
  macroLine: {
    fontFamily: FONT_FAMILY,
    fontSize: MEAL_MACRO_FONT_SIZE,
    lineHeight: 16,
    fontWeight: "500",
  },
  addColumn: {
    flexShrink: 0,
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    alignSelf: "stretch",
    minWidth: ADD_HIT_SIZE,
  },
  addHit: {
    flexShrink: 0,
    width: ADD_HIT_SIZE,
    height: ADD_HIT_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  addHitPressed: {
    opacity: 0.85,
  },
  addVisual: {
    width: ADD_HIT_SIZE,
    height: ADD_HIT_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  plusGlyph: {
    fontFamily: FONT_FAMILY,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "700",
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
  heartIcon: {
    width: HEART_ICON_SIZE,
    height: HEART_ICON_SIZE,
    opacity: 0.85,
  },
});
