import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";

import { FAKE_RECENT_MEALS } from "../food-meals-fake-data";
import {
  FOOD_MEALS_LIST_AREA_MIN_HEIGHT,
  FOOD_SAVED_RECENT_MEALS_CARD_BACKGROUND,
} from "../constants";
import { useHabitProgress } from "../habit-progress-context";
import { FoodMealListRow } from "./food-meal-list-row";

const SECTION_TITLE = "Recent meals";
const EMPTY_LIST_MESSAGE = "no recent meals";

/** Recent meals list shell; quick-add writes a food habit_log (catalog still fake). */
export function FoodRecentMealsSection() {
  const { addFood } = useHabitProgress();
  const meals = FAKE_RECENT_MEALS;
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
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.title}
            accessibilityRole="header"
          >
            {SECTION_TITLE}
          </ThemedText>
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
  listArea: {
    alignSelf: "stretch",
    justifyContent: "flex-start",
    minHeight: FOOD_MEALS_LIST_AREA_MIN_HEIGHT,
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    alignSelf: "stretch",
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
