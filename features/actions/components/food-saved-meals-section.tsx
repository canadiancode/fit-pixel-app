import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";

import {
  FOOD_MEALS_LIST_AREA_MIN_HEIGHT,
  FOOD_SAVED_RECENT_MEALS_CARD_BACKGROUND,
  WATER_RIGHT_ARROW_ICON,
} from "../constants";
import { FOOD_ACTION_HREFS } from "../food-routes";
import { FAKE_SAVED_MEALS } from "../food-meals-fake-data";
import { useHabitProgress } from "../habit-progress-context";
import { FoodMealListRow } from "./food-meal-list-row";

const SECTION_TITLE = "Saved meals";
const SEE_ALL_LABEL = "See all";
const EMPTY_LIST_MESSAGE = "No saved meals";

/** Saved meals list shell; quick-add writes a food habit_log (catalog still fake). */
export function FoodSavedMealsSection() {
  const { addFood } = useHabitProgress();
  const meals = FAKE_SAVED_MEALS;
  const summaryA11y =
    meals.length === 0
      ? EMPTY_LIST_MESSAGE
      : `${meals.length} meal${meals.length === 1 ? "" : "s"}`;

  return (
    <View
      accessible
      accessibilityLabel={`${SECTION_TITLE}. ${summaryA11y}`}
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
          source={FOOD_SAVED_RECENT_MEALS_CARD_BACKGROUND}
          style={StyleSheet.absoluteFillObject}
          contentFit="fill"
        />
        <View style={styles.cardInner}>
          <View style={styles.headerRow}>
            <ThemedText
              lightColor={APP_SHELL_MAIN_TEXT_COLOR}
              darkColor={APP_SHELL_MAIN_TEXT_COLOR}
              style={styles.title}
              accessibilityRole="header"
            >
              {SECTION_TITLE}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={SEE_ALL_LABEL}
              hitSlop={8}
              onPress={() => router.push(FOOD_ACTION_HREFS.savedMeals)}
              style={({ pressed }) => [
                styles.seeAllControl,
                pressed && styles.seeAllPressed,
              ]}
            >
              <View style={styles.seeAllRow}>
                <ThemedText
                  lightColor={APP_SHELL_LABEL_COLOR}
                  darkColor={APP_SHELL_LABEL_COLOR}
                  numberOfLines={1}
                  style={styles.seeAllLabel}
                >
                  {SEE_ALL_LABEL}
                </ThemedText>
                <Image
                  accessibilityIgnoresInvertColors
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  source={WATER_RIGHT_ARROW_ICON}
                  style={styles.seeAllArrow}
                  contentFit="contain"
                />
              </View>
            </Pressable>
          </View>
          <View style={styles.listArea}>
            {meals.length === 0 ? (
              <ThemedText
                lightColor={APP_SHELL_LABEL_COLOR}
                darkColor={APP_SHELL_LABEL_COLOR}
                style={styles.emptyListText}
              >
                {EMPTY_LIST_MESSAGE}
              </ThemedText>
            ) : (
              meals.map((item, index) => (
                <FoodMealListRow
                  key={`${item.name}-${item.vendor ?? index}`}
                  name={item.name}
                  calories={item.calories}
                  protein={item.protein}
                  carbs={item.carbs}
                  fat={item.fat}
                  showBottomBorder={index < meals.length - 1}
                  onQuickAdd={() =>
                    addFood({
                      name: item.name,
                      kcal: item.calories,
                      proteinG: item.protein,
                      carbsG: item.carbs,
                      fatG: item.fat,
                      portionSize: item.portionSize,
                    })
                  }
                />
              ))
            )}
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
    paddingVertical: 20,
    paddingHorizontal: 32,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    alignSelf: "stretch",
    gap: 12,
  },
  seeAllControl: {
    flexShrink: 0,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  seeAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  seeAllPressed: {
    opacity: 0.85,
  },
  seeAllLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 14,
  },
  seeAllArrow: {
    width: 32,
    height: 32,
  },
  listArea: {
    alignSelf: "stretch",
    justifyContent: "flex-start",
    minHeight: FOOD_MEALS_LIST_AREA_MIN_HEIGHT,
  },
  title: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    textAlign: "left",
  },
  emptyListText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
    alignSelf: "stretch",
    textAlign: "left",
  },
});
