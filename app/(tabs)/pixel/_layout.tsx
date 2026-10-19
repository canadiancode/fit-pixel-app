import { Stack, useRouter, useSegments } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedView } from "@/components/themed-view";
import { APP_SHELL_SECONDARY_BACKGROUND } from "@/constants/app-colors";
import { TAB_SCREEN_ROOT_ABOVE_TAB_BAR } from "@/constants/app-shell";
import { PixelCharacter } from "@/features/pixel/components/pixel-character";
import { usePixelLoadout } from "@/features/pixel/pixel-loadout-context";

export const unstable_settings = {
  initialRouteName: "index",
};

function PixelTabChrome() {
  const router = useRouter();
  const segments = useSegments();
  const { loadout } = usePixelLoadout();

  // Typed segments omit "index", but the runtime value can include it.
  const pixelSegments: string[] = segments.filter(
    (segment) => segment !== "(tabs)",
  );
  const isDashboard =
    (pixelSegments.length === 1 && pixelSegments[0] === "pixel") ||
    (pixelSegments.length === 2 && pixelSegments[1] === "index");

  return (
    <ThemedView
      lightColor={APP_SHELL_SECONDARY_BACKGROUND}
      darkColor={APP_SHELL_SECONDARY_BACKGROUND}
      style={styles.container}
    >
      <View style={[styles.row, styles.rowFull, styles.rowDouble]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open pixel details"
          disabled={!isDashboard}
          onPress={() => router.push("/(tabs)/pixel/customize")}
          style={styles.heroShell}
        >
          <PixelCharacter loadout={loadout} style={styles.heroCharacter} />
        </Pressable>
      </View>
      <View style={styles.lowerSection}>
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
  );
}

/** Loadout comes from `PixelLoadoutProvider` in the tabs layout (Settings shows it too). */
export default function PixelTabLayout() {
  return <PixelTabChrome />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...TAB_SCREEN_ROOT_ABOVE_TAB_BAR,
  },
  row: {
    flex: 1,
    flexDirection: "row",
    minHeight: 0,
  },
  rowFull: {
    alignSelf: "stretch",
  },
  rowDouble: {
    flex: 2,
  },
  lowerSection: {
    flex: 4,
    minHeight: 0,
  },
  heroShell: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    marginHorizontal: 0,
    paddingHorizontal: 0,
    backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
  },
  heroCharacter: {
    flex: 1,
    width: "100%",
    minHeight: 0,
  },
});
