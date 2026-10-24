import * as Haptics from "expo-haptics";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedView } from "@/components/themed-view";
import { APP_SHELL_SECONDARY_BACKGROUND } from "@/constants/app-colors";
import { TAB_SCREEN_ROOT_ABOVE_TAB_BAR } from "@/constants/app-shell";
import { AnimatedPixelCharacter } from "@/features/pixel/components/animated-pixel-character";
import {
  PixelCustomizeHint,
  usePixelCustomizeHint,
} from "@/features/pixel/components/pixel-customize-hint";
import { isPixelLayerId } from "@/features/pixel/data";
import { usePixelLoadout } from "@/features/pixel/pixel-loadout-context";
import { usePixelVitals } from "@/features/pixel/use-pixel-vitals";

export const unstable_settings = {
  initialRouteName: "index",
};

function PixelTabChrome() {
  const router = useRouter();
  const segments = useSegments();
  const { loadout, isHydrated, gender } = usePixelLoadout();
  const [heroPressed, setHeroPressed] = useState(false);
  const insets = useSafeAreaInsets();
  const vitals = usePixelVitals();

  // Typed segments omit "index", but the runtime value can include it.
  const pixelSegments: string[] = segments.filter(
    (segment) => segment !== "(tabs)",
  );
  const isDashboard =
    (pixelSegments.length === 1 && pixelSegments[0] === "pixel") ||
    (pixelSegments.length === 2 && pixelSegments[1] === "index");
  // While a layer's picker is open the hero zooms in on that part.
  const pathLeaf = usePathname().split("/").pop() ?? "";
  const focus = isPixelLayerId(pathLeaf) ? pathLeaf : null;
  // Wait for Pick-your-Pixel so the tip lands on the Pixel they chose.
  const hint = usePixelCustomizeHint(isDashboard && isHydrated && gender != null);

  return (
    <ThemedView
      lightColor={APP_SHELL_SECONDARY_BACKGROUND}
      darkColor={APP_SHELL_SECONDARY_BACKGROUND}
      style={styles.container}
    >
      <View style={[styles.row, styles.rowFull, styles.rowDouble]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Customize your Pixel"
          accessibilityHint="Change hair, clothes, shoes and more"
          disabled={!isDashboard}
          onPressIn={() => {
            setHeroPressed(true);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          onPressOut={() => setHeroPressed(false)}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            hint.dismiss();
            router.push("/(tabs)/pixel/customize");
          }}
          style={styles.heroShell}
        >
          <AnimatedPixelCharacter
            loadout={loadout}
            focus={focus}
            focusInsetTop={insets.top}
            invite={isDashboard}
            pressed={heroPressed}
            alive={isDashboard}
            vitals={vitals}
            style={styles.heroCharacter}
          />
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
        {hint.visible ? <PixelCustomizeHint onDismiss={hint.dismiss} /> : null}
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
