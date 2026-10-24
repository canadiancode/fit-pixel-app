import { Image } from "expo-image";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";

import {
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_SECONDARY_BACKGROUND,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";

/** Device-level, like the push soft-ask: once per install is enough. */
const SEEN_KEY = "fitpixel.pixel.customizeHintSeen";
/** Lets the Pick-your-Pixel modal finish fading out first. */
const SHOW_DELAY_MS = 700;
const BOB_PX = 4;
const BOB_STEP_MS = 420;

/** Same lime asset as "Enter shop". */
const GOT_IT_BACKGROUND = require("@/assets/backgrounds/add-action.png");

async function readSeen(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(SEEN_KEY)) === "1";
  } catch {
    // Unreadable: don't nag.
    return true;
  }
}

async function writeSeen(): Promise<void> {
  try {
    await SecureStore.setItemAsync(SEEN_KEY, "1");
  } catch {
    // Best effort: worst case the hint shows once more.
  }
}

/**
 * One-time "tap your Pixel" hint. `ready` once the dashboard is showing and
 * the Pixel has been picked; `dismiss` (also called when the Pixel is tapped)
 * hides it for good.
 */
export function usePixelCustomizeHint(ready: boolean) {
  const [seen, setSeen] = useState<boolean | null>(null);
  const [delayPassed, setDelayPassed] = useState(false);

  useEffect(() => {
    let active = true;
    void readSeen().then((value) => {
      if (active) setSeen(value);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || seen !== false) return;
    const timer = setTimeout(() => setDelayPassed(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [ready, seen]);

  const dismiss = useCallback(() => {
    if (seen !== false) return;
    setSeen(true);
    void writeSeen();
  }, [seen]);

  return { visible: ready && seen === false && delayPassed, dismiss };
}

/**
 * Dims the dashboard below the hero and points a pixel speech bubble up at
 * the Pixel. Tapping anywhere on it dismisses.
 */
export function PixelCustomizeHint({ onDismiss }: { onDismiss: () => void }) {
  const reduceMotion = useReducedMotion();
  const bob = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    const step = { duration: BOB_STEP_MS, easing: Easing.steps(2) };
    bob.value = withRepeat(
      withSequence(withTiming(-BOB_PX, step), withTiming(0, step)),
      -1,
    );
    // Shared values are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(160)}
      style={styles.root}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tap your Pixel to change hair, outfits and more. Dismiss tip."
        onPress={onDismiss}
        style={styles.scrim}
      >
        <Animated.View
          entering={reduceMotion ? undefined : ZoomIn.duration(260).easing(Easing.steps(4))}
          style={[styles.bubbleWrap, bobStyle]}
        >
          {/* Pixel stair-step pointer up at the Pixel. */}
          <View style={styles.pointer}>
            <View style={[styles.pointerRow, { width: 6 }]} />
            <View style={[styles.pointerRow, { width: 12 }]} />
            <View style={[styles.pointerRow, { width: 18 }]} />
          </View>
          <View>
            <View style={styles.bubbleShadow} />
            <View style={styles.bubble}>
              <Text style={styles.title}>Tap your Pixel!</Text>
              <Text style={styles.body}>
                Change hair, tops, bottoms, shoes & more.
              </Text>
              <View style={styles.gotIt}>
                <Image
                  accessibilityIgnoresInvertColors
                  source={GOT_IT_BACKGROUND}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="fill"
                />
                <Text style={styles.gotItLabel}>Got it</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const BUBBLE_FILL = "#FFFFFF";
const POINTER_STEP = 4;

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  scrim: {
    flex: 1,
    alignItems: "center",
    paddingTop: 6,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  bubbleWrap: {
    alignItems: "center",
    maxWidth: 300,
  },
  pointer: {
    alignItems: "center",
  },
  pointerRow: {
    height: POINTER_STEP,
    backgroundColor: BUBBLE_FILL,
  },
  /** Hard drop shadow, offset like the bracket shadows. */
  bubbleShadow: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ translateX: 4 }, { translateY: 4 }],
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  bubble: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: BUBBLE_FILL,
  },
  title: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    lineHeight: 18,
    color: APP_SHELL_SECONDARY_BACKGROUND,
    textAlign: "center",
  },
  body: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 16,
    color: APP_SHELL_SECONDARY_BACKGROUND,
    textAlign: "center",
  },
  gotIt: {
    marginTop: 2,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 34,
  },
  gotItLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 16,
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
});
