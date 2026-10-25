import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { FONT_FAMILY } from "@/constants/fonts";

import { PIXEL_FIGURE_IN_SCENE } from "../figure-geometry";
import type { PixelVitals } from "../use-pixel-vitals";

/**
 * Effects drawn on the scene canvas from today's vitals: Zzz after a short
 * night, sweat after a good burn, and hearts after a good day of eating.
 * Lives inside the scene view, so it follows the hero camera. Positions are fractions of the scene.
 */

/** A point on the character canvas (fractions) as a fraction of the scene. */
function onFigure(x: number, y: number) {
  return {
    x: PIXEL_FIGURE_IN_SCENE.left + x * PIXEL_FIGURE_IN_SCENE.width,
    y: PIXEL_FIGURE_IN_SCENE.top + y * PIXEL_FIGURE_IN_SCENE.height,
  };
}

const HEAD_SIDE = onFigure(0.76, 0.12);
const BROW_LEFT = onFigure(0.4, 0.15);
const BROW_RIGHT = onFigure(0.6, 0.15);
const BELLY = onFigure(0.5, 0.42);

const HEART = [".x.x.", "xxxxx", "xxxxx", ".xxx.", "..x.."] as const;

type Props = {
  vitals: PixelVitals;
  /** Scene canvas size on screen, in points. */
  width: number;
  height: number;
};

export function PixelVitalsLayer({ vitals, width, height }: Props) {
  if (width === 0) return null;
  const at = (p: { x: number; y: number }) => ({ left: p.x * width, top: p.y * height });
  // Effects are sized off the character's height so they read at any zoom.
  const unit = PIXEL_FIGURE_IN_SCENE.height * height;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {vitals.sleepy
        ? [0, 1, 2].map((i) => (
            <SleepZ key={i} index={i} at={at(HEAD_SIDE)} unit={unit} />
          ))
        : null}
      {vitals.sweaty
        ? [0, 1].map((i) => (
            <SweatDrop
              key={i}
              index={i}
              at={at(i === 0 ? BROW_LEFT : BROW_RIGHT)}
              unit={unit}
            />
          ))
        : null}
      {vitals.wellFed
        ? [0, 1, 2].map((i) => (
            <FloatingHeart key={i} index={i} at={at(BELLY)} unit={unit} />
          ))
        : null}
    </View>
  );
}

/** Loops 0 → 1 every `period` ms after `delay`, resting `rest` ms between. */
function useLoop(delay: number, period: number, rest = 0) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(1, { duration: period, easing: Easing.linear }),
          withTiming(1, { duration: rest }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(t);
  }, [delay, period, rest, t]);
  return t;
}

function SleepZ({
  index,
  at,
  unit,
}: {
  index: number;
  at: { left: number; top: number };
  unit: number;
}) {
  const t = useLoop(index * 900, 2700);
  const size = unit * (0.1 + index * 0.035);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.15, 0.7, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: t.value * unit * 0.16 },
      { translateY: -t.value * unit * 0.22 },
      { rotate: `${interpolate(t.value, [0, 1], [-10, 12])}deg` },
      { scale: interpolate(t.value, [0, 1], [0.6, 1.15]) },
    ],
  }));
  return (
    <Animated.View style={[styles.anchor, at, style]}>
      <Text style={[styles.z, { fontSize: size, lineHeight: size * 1.2 }]}>Z</Text>
    </Animated.View>
  );
}

function SweatDrop({
  index,
  at,
  unit,
}: {
  index: number;
  at: { left: number; top: number };
  unit: number;
}) {
  const t = useLoop(index * 700, 900, 500);
  const w = Math.max(4, unit * 0.034);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.1, 0.75, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: (index === 0 ? -1 : 1) * t.value * unit * 0.03 },
      { translateY: t.value * t.value * unit * 0.14 },
    ],
  }));
  return (
    <Animated.View style={[styles.anchor, at, style]}>
      {/* A two-step pixel drop: narrow top, round bottom. */}
      <View style={{ alignItems: "center" }}>
        <View style={{ width: w * 0.5, height: w * 0.6, backgroundColor: "#BFEFFF" }} />
        <View
          style={{
            width: w,
            height: w,
            backgroundColor: "#7FD8FF",
            borderBottomLeftRadius: w / 2,
            borderBottomRightRadius: w / 2,
          }}
        />
      </View>
    </Animated.View>
  );
}

function FloatingHeart({
  index,
  at,
  unit,
}: {
  index: number;
  at: { left: number; top: number };
  unit: number;
}) {
  const t = useLoop(800 + index * 450, 1700, 2600);
  const px = Math.max(2, unit * 0.017);
  const drift = [-1, 0.4, 1][index];
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.1, 0.7, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: drift * t.value * unit * 0.12 + Math.sin(t.value * 6) * unit * 0.01 },
      { translateY: -t.value * unit * 0.22 },
      { scale: interpolate(t.value, [0, 0.2, 1], [0.4, 1.1, 0.9]) },
    ],
  }));
  return (
    <Animated.View style={[styles.anchor, at, style]}>
      <View style={{ width: px * 5, height: px * 5 }}>
        {HEART.map((row, y) =>
          Array.from(row).map((cell, x) =>
            cell === "x" ? (
              <View
                key={`${x}-${y}`}
                style={{
                  position: "absolute",
                  left: x * px,
                  top: y * px,
                  width: px + 0.5,
                  height: px + 0.5,
                  backgroundColor: y === 1 && x === 1 ? "#FFC2D1" : "#FF5A7A",
                }}
              />
            ) : null,
          ),
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: "absolute",
    zIndex: 12,
  },
  z: {
    fontFamily: FONT_FAMILY,
    color: "#FFFFFF",
    textShadowColor: "#0B1446",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
});
