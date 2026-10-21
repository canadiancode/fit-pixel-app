import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";

import { FOOD_ADD_ACTION_BUTTON_BACKGROUND } from "../constants";
import { FOOD_ACTION_HREFS } from "../food-routes";

const ACTION_ROWS = [
  {
    key: "search-food",
    label: "Search for food",
    href: FOOD_ACTION_HREFS.search,
  },
  {
    key: "custom-meal",
    label: "Input custom meal",
    href: FOOD_ACTION_HREFS.customMeal,
  },
  // Barcode scanner (FOOD_ACTION_HREFS.barcode) is hidden until scanning
  // works; its screen only says it is unavailable.
] as const;

/** Full-width food logging shortcuts between saved and recent meal lists. */
export function FoodMealActionButtons() {
  return (
    <View style={styles.stack} accessibilityRole="none">
      {ACTION_ROWS.map((row) => (
        <Pressable
          key={row.key}
          accessibilityRole="button"
          accessibilityLabel={row.label}
          hitSlop={4}
          onPress={() => router.push(row.href)}
          style={({ pressed }) => [
            styles.actionOuter,
            pressed && styles.actionPressed,
          ]}
        >
          <View style={styles.actionShell}>
            <Image
              accessibilityIgnoresInvertColors
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              source={FOOD_ADD_ACTION_BUTTON_BACKGROUND}
              style={StyleSheet.absoluteFillObject}
              contentFit="fill"
            />
            <ThemedText
              lightColor={APP_SHELL_MAIN_TEXT_COLOR}
              darkColor={APP_SHELL_MAIN_TEXT_COLOR}
              style={styles.actionLabel}
              numberOfLines={2}
            >
              {row.label}
            </ThemedText>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    alignSelf: "stretch",
    gap: 8,
  },
  actionOuter: {
    alignSelf: "stretch",
  },
  actionPressed: {
    opacity: 0.88,
  },
  actionShell: {
    width: "100%",
    minHeight: 48,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    fontWeight: "600",
  },
});
