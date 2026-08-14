import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { FoodMealListRow } from "@/features/actions/components/food-meal-list-row";
import type { FoodMealListItem } from "@/features/actions/food-meal-types";
import { useFoodMeals } from "@/features/actions/food-meals-context";
import { useHabitProgress } from "@/features/actions/habit-progress-context";
import {
  FitPixelApiError,
  resolveFoodHabitPayload,
  searchFoods,
  type FoodSearchItem,
} from "@/lib/api";

const SEARCH_INPUT_BACKGROUND = require("@/assets/backgrounds/search-input.png");
const SEARCH_DEBOUNCE_MS = 400;

function searchItemToListItem(item: FoodSearchItem): FoodMealListItem {
  return {
    name: item.name,
    ...(item.brandName ? { vendor: item.brandName } : {}),
    ...(item.portionSize ? { portionSize: item.portionSize } : {}),
    calories: item.calories ?? item.kcal ?? 0,
    fat: item.fat ?? item.fatG ?? 0,
    carbs: item.carbs ?? item.carbsG ?? 0,
    protein: item.protein ?? item.proteinG ?? 0,
  };
}

export default function FoodSearchScreen() {
  const { addFood } = useHabitProgress();
  const { toggleSaveMeal } = useFoodMeals();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setErrorMessage(null);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    const handle = setTimeout(() => {
      void (async () => {
        try {
          const foods = await searchFoods(trimmed);
          if (cancelled) return;
          setResults(foods);
          setErrorMessage(null);
        } catch (err) {
          if (cancelled) return;
          setResults([]);
          const message =
            err instanceof FitPixelApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Search failed.";
          setErrorMessage(message);
        } finally {
          if (!cancelled) setIsSearching(false);
        }
      })();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  const onQuickAdd = async (item: FoodSearchItem) => {
    try {
      const payload = await resolveFoodHabitPayload(item);
      await addFood({
        name: payload.name,
        kcal: payload.kcal,
        ...(payload.proteinG !== undefined
          ? { proteinG: payload.proteinG }
          : {}),
        ...(payload.carbsG !== undefined ? { carbsG: payload.carbsG } : {}),
        ...(payload.fatG !== undefined ? { fatG: payload.fatG } : {}),
        ...(payload.portionSize
          ? { portionSize: payload.portionSize }
          : {}),
      });
      router.back();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not add this food.";
      Alert.alert("Could not add food", message);
    }
  };

  const onToggleSave = async (item: FoodSearchItem) => {
    try {
      const payload = await resolveFoodHabitPayload(item);
      const listItem: FoodMealListItem = {
        name: payload.name,
        calories: payload.kcal,
        protein: payload.proteinG ?? 0,
        carbs: payload.carbsG ?? 0,
        fat: payload.fatG ?? 0,
        ...(payload.vendor ? { vendor: payload.vendor } : {}),
        ...(payload.portionSize
          ? { portionSize: payload.portionSize }
          : {}),
      };
      // Heart saves/unsaves favorite; does not log to today (same as recent list).
      await toggleSaveMeal(listItem);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save this food.";
      Alert.alert("Could not save food", message);
    }
  };

  const trimmedQuery = query.trim();
  const showEmpty =
    !isSearching &&
    !errorMessage &&
    trimmedQuery.length > 0 &&
    results.length === 0;

  return (
    <ActionsSubScreenLayout>
      <View style={styles.inputShell}>
        <Image
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          source={SEARCH_INPUT_BACKGROUND}
          style={StyleSheet.absoluteFillObject}
          contentFit="fill"
        />
        <TextInput
          accessibilityLabel="Search food"
          value={query}
          onChangeText={setQuery}
          placeholder="Search foods…"
          placeholderTextColor={APP_SHELL_INPUT_PLACEHOLDER_COLOR}
          style={styles.input}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          underlineColorAndroid="transparent"
          {...Platform.select({
            android: {
              includeFontPadding: false,
              textAlignVertical: "center" as const,
            },
          })}
        />
      </View>

      <View style={styles.results}>
        {isSearching ? (
          <View style={styles.statusRow}>
            <ActivityIndicator color={APP_SHELL_MAIN_TEXT_COLOR} />
            <ThemedText
              lightColor={APP_SHELL_LABEL_COLOR}
              darkColor={APP_SHELL_LABEL_COLOR}
              style={styles.statusText}
            >
              Searching…
            </ThemedText>
          </View>
        ) : null}

        {errorMessage != null && !isSearching ? (
          <ThemedText
            lightColor={APP_SHELL_LABEL_COLOR}
            darkColor={APP_SHELL_LABEL_COLOR}
            style={styles.statusText}
          >
            {errorMessage}
          </ThemedText>
        ) : null}

        {showEmpty ? (
          <ThemedText
            lightColor={APP_SHELL_LABEL_COLOR}
            darkColor={APP_SHELL_LABEL_COLOR}
            style={styles.statusText}
          >
            No foods found
          </ThemedText>
        ) : null}

        {results.map((item, index) => {
          const listItem = searchItemToListItem(item);
          return (
            <FoodMealListRow
              key={`${item.id}-${index}`}
              name={listItem.name}
              calories={listItem.calories}
              protein={listItem.protein}
              carbs={listItem.carbs}
              fat={listItem.fat}
              showBottomBorder={index < results.length - 1}
              onQuickAdd={() => onQuickAdd(item)}
              onToggleSave={() => onToggleSave(item)}
            />
          );
        })}
      </View>
    </ActionsSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  inputShell: {
    alignSelf: "stretch",
    height: 52,
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
  },
  input: {
    width: "100%",
    height: "100%",
    paddingHorizontal: 16,
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
  results: {
    alignSelf: "stretch",
    marginTop: 16,
    gap: 0,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  statusText: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    lineHeight: 18,
  },
});
