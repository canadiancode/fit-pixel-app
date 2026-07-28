import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { ActionsSubScreenLayout } from "@/features/actions/components/actions-sub-screen-layout";
import { FoodMealListRow } from "@/features/actions/components/food-meal-list-row";
import { FAKE_SAVED_MEALS } from "@/features/actions/food-meals-fake-data";
import { useHabitProgress } from "@/features/actions/habit-progress-context";

export default function FoodSavedMealsScreen() {
  const { addFood } = useHabitProgress();
  const meals = FAKE_SAVED_MEALS;

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
          Hold and press down on meal name to save/unsave.
        </ThemedText>
        <View style={styles.list} accessibilityRole="list">
          {meals.map((item, index) => (
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
          ))}
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
  list: {
    alignSelf: "stretch",
    marginTop: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
});
