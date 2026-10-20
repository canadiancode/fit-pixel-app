import { useEffect, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

/** Same shape as `ProgressPulse` in features/actions; kept local to avoid a components → features import. */
export type BarPulse = { id: number; gold: boolean };

const GLINT_WIDTH = 16;
const GLINT_MS = 520;
const GOLD_COLOR = "#FFD23F";

/**
 * Drives the "this bar just got progress" effects: a white glint across the
 * fill, a brief glow over the whole bar, and on reaching 100% a double gold
 * flash with a small scale bump. Each new `pulse.id` replays it.
 */
export function useBarPulse(pulse: BarPulse | null | undefined) {
  const [width, setWidth] = useState(0);
  const glint = useSharedValue(0);
  const glow = useSharedValue(0);
  const scale = useSharedValue(1);
  const gold = pulse?.gold ?? false;

  useEffect(() => {
    if (pulse == null) return;
    glint.value = 0;
    glint.value = withTiming(1, {
      duration: GLINT_MS,
      easing: Easing.out(Easing.quad),
    });
    if (pulse.gold) {
      glow.value = withSequence(
        withTiming(0.75, { duration: 90 }),
        withTiming(0.2, { duration: 160 }),
        withTiming(0.7, { duration: 110 }),
        withTiming(0, { duration: 520 }),
      );
      scale.value = withSequence(
        withTiming(1.05, { duration: 120, easing: Easing.steps(2) }),
        withTiming(1, { duration: 240, easing: Easing.steps(3) }),
      );
    } else {
      glow.value = withSequence(
        withTiming(0.45, { duration: 90 }),
        withTiming(0, { duration: 420 }),
      );
    }
    // Shared values are stable; replay only when a new pulse arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulse?.id]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const glintStyle = useAnimatedStyle(() => ({
    opacity: glint.value > 0 && glint.value < 1 ? 0.85 : 0,
    transform: [
      { translateX: -GLINT_WIDTH + glint.value * (width + GLINT_WIDTH * 2) },
      { skewX: "-20deg" },
    ],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  return { containerStyle, glintStyle, glowStyle, gold, onLayout };
}

/** Place inside the bar's fill clip so the glint only crosses filled pixels. */
export function BarGlint({
  style,
}: {
  style: ReturnType<typeof useBarPulse>["glintStyle"];
}) {
  return (
    <Animated.View pointerEvents="none" style={[styles.glint, style]} />
  );
}

/** Place over the whole bar (above the container art). */
export function BarGlow({
  style,
  gold,
  height,
}: {
  style: ReturnType<typeof useBarPulse>["glowStyle"];
  gold: boolean;
  height: number;
}) {
  return (
    <View pointerEvents="none" style={styles.glowWrap}>
      <Animated.View
        style={[
          styles.glow,
          { borderRadius: height / 2 },
          gold && styles.glowGold,
          style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  glint: {
    position: "absolute",
    top: -4,
    bottom: -4,
    left: 0,
    width: GLINT_WIDTH,
    backgroundColor: "#FFFFFF",
  },
  glowWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
  },
  glowGold: {
    backgroundColor: GOLD_COLOR,
  },
});
