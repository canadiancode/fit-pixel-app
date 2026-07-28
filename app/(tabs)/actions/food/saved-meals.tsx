import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { ActionsSubScreenLayout } from "@/features/actions/components/actions-sub-screen-layout";
import { FoodMealListRow } from "@/features/actions/components/food-meal-list-row";
import { listItemToFoodPayload } from "@/features/actions/food-meal-types";
import { useFoodMeals } from "@/features/actions/food-meals-context";
import { useHabitProgress } from "@/features/actions/habit-progress-context";

export default function FoodSavedMealsScreen() {
  const { addFood } = useHabitProgress();
  const { savedMeals, toggleSaveMeal } = useFoodMeals();

  return (
    <ActionsSubScreenLayout>
      <View style={styles.block}>
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.title}
          accessibilityRole="header"
        >
          Saved meals
        </ThemedText>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.body}
        >
          Tap the heart to save or unsave a meal.
        </ThemedText>
        <View style={styles.list} accessibilityRole="list">
          {savedMeals.length === 0 ? (
            <ThemedText
              lightColor={APP_SHELL_LABEL_COLOR}
              darkColor={APP_SHELL_LABEL_COLOR}
              style={styles.empty}
            >
              No saved meals yet. Heart a recent meal or save from custom meal.
            </ThemedText>
          ) : (
            savedMeals.map((item, index) => (
              <FoodMealListRow
                key={item.savedId ?? `${item.name}-${index}`}
                name={item.name}
                calories={item.calories}
                protein={item.protein}
                carbs={item.carbs}
                fat={item.fat}
                showBottomBorder={index < savedMeals.length - 1}
                isSaved={item.savedId != null}
                onToggleSave={() => toggleSaveMeal(item)}
                onQuickAdd={() => addFood(listItemToFoodPayload(item))}
              />
            ))
          )}
        </View>
      </View>
    </ActionsSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 12,
    alignSelf: "stretch",
  },
  title: {
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  body: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    lineHeight: 20,
  },
  empty: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  list: {
    alignSelf: "stretch",
    marginTop: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
});
