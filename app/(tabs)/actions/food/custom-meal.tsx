import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Keyboard,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_INPUT_PLACEHOLDER_COLOR,
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { ActionsSubScreenLayout } from "@/features/actions/components/actions-sub-screen-layout";
import { FoodLimePillButton } from "@/features/actions/components/food-lime-pill-button";
import { useFoodMeals } from "@/features/actions/food-meals-context";
import { useHabitProgress } from "@/features/actions/habit-progress-context";

const BG_LONG = require("@/assets/backgrounds/text-input-long.png");
const BG_MED = require("@/assets/backgrounds/text-input-med.png");
const BG_SMALL = require("@/assets/backgrounds/text-input-small.png");

/** Pill widths vs. full content width (meal name = 100%). Matches layout reference art. */
const MEAL_CALORIES_INPUT_WIDTH = "55%";
/** Gram macros (protein, carbs, fat): same small pill asset and width. */
const MEAL_GRAM_MACRO_INPUT_WIDTH = "35%";

const INPUT_ROW_PLATFORM = Platform.select({
  android: {
    includeFontPadding: false,
    textAlignVertical: "center" as const,
  },
  default: {},
});

function parseOptionalNonNegative(raw: string, label: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    throw new Error(`${label} must be a number`);
  }
  return n;
}

export default function FoodCustomMealScreen() {
  const { addFood } = useHabitProgress();
  const { saveMeal } = useFoodMeals();
  const [mealName, setMealName] = useState("");
  const [mealCalories, setMealCalories] = useState("");
  const [mealProtein, setMealProtein] = useState("");
  const [mealCarbs, setMealCarbs] = useState("");
  const [mealFat, setMealFat] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const gramMacroFields = [
    {
      key: "protein",
      label: "Meal protein",
      value: mealProtein,
      onChangeText: setMealProtein,
      placeholder: "50",
      accessibilityLabel: "Meal protein, grams",
    },
    {
      key: "carbs",
      label: "Meal carbs",
      value: mealCarbs,
      onChangeText: setMealCarbs,
      placeholder: "53",
      accessibilityLabel: "Meal carbs, grams",
    },
    {
      key: "fat",
      label: "Meal fat",
      value: mealFat,
      onChangeText: setMealFat,
      placeholder: "9",
      accessibilityLabel: "Meal fat, grams",
    },
  ] as const;

  const onAddMeal = async () => {
    if (isSubmitting) return;
    Keyboard.dismiss();

    const name = mealName.trim();
    if (!name) {
      Alert.alert("Meal name required", "Enter a name for this meal.");
      return;
    }
    if (!mealCalories.trim()) {
      Alert.alert("Calories required", "Enter calories for this meal.");
      return;
    }

    try {
      const kcal = Number(mealCalories.trim());
      if (!Number.isFinite(kcal)) {
        throw new Error("Calories must be a number");
      }
      const proteinG = parseOptionalNonNegative(mealProtein, "Protein");
      const carbsG = parseOptionalNonNegative(mealCarbs, "Carbs");
      const fatG = parseOptionalNonNegative(mealFat, "Fat");

      setIsSubmitting(true);
      try {
        await addFood({
          name,
          kcal,
          ...(proteinG !== undefined ? { proteinG } : {}),
          ...(carbsG !== undefined ? { carbsG } : {}),
          ...(fatG !== undefined ? { fatG } : {}),
        });
        // Same-flow: persist as a reusable saved meal (local draft / favorite).
        await saveMeal({
          name,
          kcal,
          ...(proteinG !== undefined ? { proteinG } : {}),
          ...(carbsG !== undefined ? { carbsG } : {}),
          ...(fatG !== undefined ? { fatG } : {}),
        });
        router.back();
      } finally {
        setIsSubmitting(false);
      }
    } catch (err) {
      setIsSubmitting(false);
      const message =
        err instanceof Error ? err.message : "Could not save this meal.";
      Alert.alert("Could not add meal", message);
    }
  };

  return (
    <ActionsSubScreenLayout>
      <View style={styles.form}>
        <View style={styles.field}>
          <ThemedText
            lightColor={APP_SHELL_LABEL_COLOR}
            darkColor={APP_SHELL_LABEL_COLOR}
            style={styles.label}
          >
            Meal name
          </ThemedText>
          <View style={[styles.inputShell, styles.inputShellUniformHeight]}>
            <Image
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              source={BG_LONG}
              style={StyleSheet.absoluteFillObject}
              contentFit="fill"
            />
            <TextInput
              accessibilityLabel="Meal name"
              value={mealName}
              onChangeText={setMealName}
              placeholder="Chicken wrap"
              placeholderTextColor={APP_SHELL_INPUT_PLACEHOLDER_COLOR}
              style={[
                styles.input,
                styles.inputUniformHeight,
                styles.inputLong,
              ]}
              autoCapitalize="sentences"
              autoCorrect
              underlineColorAndroid="transparent"
              {...INPUT_ROW_PLATFORM}
            />
          </View>
        </View>

        <View style={styles.field}>
          <ThemedText
            lightColor={APP_SHELL_LABEL_COLOR}
            darkColor={APP_SHELL_LABEL_COLOR}
            style={styles.label}
          >
            Meal calories
          </ThemedText>
          <View style={styles.inputWithSuffix}>
            <View
              style={[
                styles.inputShell,
                styles.inputShellUniformHeight,
                { width: MEAL_CALORIES_INPUT_WIDTH },
              ]}
            >
              <Image
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                source={BG_MED}
                style={StyleSheet.absoluteFillObject}
                contentFit="fill"
              />
              <TextInput
                accessibilityLabel="Meal calories"
                value={mealCalories}
                onChangeText={setMealCalories}
                placeholder="500"
                placeholderTextColor={APP_SHELL_INPUT_PLACEHOLDER_COLOR}
                style={[
                  styles.input,
                  styles.inputUniformHeight,
                  styles.inputMed,
                ]}
                keyboardType="number-pad"
                underlineColorAndroid="transparent"
                {...INPUT_ROW_PLATFORM}
              />
            </View>
            <ThemedText
              lightColor={APP_SHELL_MAIN_TEXT_COLOR}
              darkColor={APP_SHELL_MAIN_TEXT_COLOR}
              style={styles.suffix}
              accessibilityElementsHidden
            >
              KCAL
            </ThemedText>
          </View>
        </View>

        {gramMacroFields.map((row) => (
          <View key={row.key} style={styles.field}>
            <ThemedText
              lightColor={APP_SHELL_LABEL_COLOR}
              darkColor={APP_SHELL_LABEL_COLOR}
              style={styles.label}
            >
              {row.label}
            </ThemedText>
            <View style={styles.inputWithSuffix}>
              <View
                style={[
                  styles.inputShell,
                  styles.inputShellUniformHeight,
                  { width: MEAL_GRAM_MACRO_INPUT_WIDTH },
                ]}
              >
                <Image
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  source={BG_SMALL}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="fill"
                />
                <TextInput
                  accessibilityLabel={row.accessibilityLabel}
                  value={row.value}
                  onChangeText={row.onChangeText}
                  placeholder={row.placeholder}
                  placeholderTextColor={APP_SHELL_INPUT_PLACEHOLDER_COLOR}
                  style={[
                    styles.input,
                    styles.inputUniformHeight,
                    styles.inputSmall,
                  ]}
                  keyboardType="decimal-pad"
                  underlineColorAndroid="transparent"
                  {...INPUT_ROW_PLATFORM}
                />
              </View>
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={styles.suffix}
                accessibilityElementsHidden
              >
                G
              </ThemedText>
            </View>
          </View>
        ))}

        <FoodLimePillButton
          title={isSubmitting ? "Adding…" : "+ add meal"}
          accessibilityLabel="Add custom meal"
          onPress={() => {
            void onAddMeal();
          }}
        />
      </View>
    </ActionsSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  form: {
    alignSelf: "stretch",
    gap: 20,
  },
  field: {
    alignSelf: "stretch",
    gap: 8,
  },
  label: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  inputShell: {
    alignSelf: "stretch",
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
  },
  inputShellUniformHeight: {
    height: 52,
  },
  inputWithSuffix: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
    alignSelf: "flex-start",
  },
  input: {
    width: "100%",
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    color: APP_SHELL_MAIN_TEXT_COLOR,
    backgroundColor: "transparent",
    paddingVertical: 0,
  },
  inputUniformHeight: {
    height: 52,
  },
  inputLong: {
    paddingHorizontal: 18,
  },
  inputMed: {
    paddingLeft: 16,
    paddingRight: 14,
  },
  inputSmall: {
    paddingLeft: 14,
    paddingRight: 12,
  },
  suffix: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    flexShrink: 0,
  },
});
