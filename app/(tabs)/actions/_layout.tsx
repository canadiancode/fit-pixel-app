import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";

import { ThemedView } from "@/components/themed-view";
import {
  APP_SHELL_PRIMARY_BACKGROUND,
  APP_SHELL_SECONDARY_BACKGROUND,
} from "@/constants/app-colors";
import {
  TAB_SCREEN_ROOT_ABOVE_TAB_BAR,
  TAB_SCREEN_STACK_CHROME_LAYOUT,
} from "@/constants/app-shell";
import { ActionsHeader } from "@/features/actions/components/actions-header";
import { FoodMealsProvider } from "@/features/actions/food-meals-context";

/** Keeps stack base as `index` so pushes to child routes resolve (see Expo Router settings). */
export const unstable_settings = {
  initialRouteName: "index",
};

export default function ActionsLayout() {
  return (
    <FoodMealsProvider>
      <ThemedView
        lightColor={APP_SHELL_PRIMARY_BACKGROUND}
        darkColor={APP_SHELL_PRIMARY_BACKGROUND}
        style={styles.screenRoot}
      >
        <ActionsHeader />
        <View style={styles.stackChrome}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "slide_from_right",
              contentStyle: {
                flex: 1,
                backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
              },
            }}
          />
        </View>
      </ThemedView>
    </FoodMealsProvider>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    ...TAB_SCREEN_ROOT_ABOVE_TAB_BAR,
  },
  stackChrome: {
    ...TAB_SCREEN_STACK_CHROME_LAYOUT,
    backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
  },
});
