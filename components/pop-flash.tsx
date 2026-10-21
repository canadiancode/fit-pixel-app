import {
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import {
  StyleSheet,
  type StyleProp,
  type View,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

/** Squash-and-pop length; callers that navigate away can wait this long. */
export const POP_FLASH_MS = 300;

export type PopFlash = {
  ref: RefObject<View | null>;
  scale: SharedValue<number>;
  flash: SharedValue<number>;
  /** Pops (skipped under Reduce Motion) and flashes white. */
  play: () => void;
};

/** "This press did something" feedback. Pair with `PopFlashView`. */
export function usePopFlash(): PopFlash {
  const ref = useRef<View>(null);
  const scale = useSharedValue(1);
  const flash = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const play = useCallback(() => {
    flash.value = withSequence(
      withTiming(0.8, { duration: 60 }),
      withTiming(0, { duration: 240 }),
    );
    if (reduceMotion) return;
    // Stepped easing keeps the squash-and-pop chunky, like sprite frames.
    scale.value = withSequence(
      withTiming(0.9, { duration: 70, easing: Easing.steps(2) }),
      withTiming(1.07, { duration: 110, easing: Easing.steps(2) }),
      withTiming(1, { duration: 120, easing: Easing.steps(2) }),
    );
  }, [flash, scale, reduceMotion]);

  return useMemo(
    () => ({ ref, scale, flash, play }),
    [scale, flash, play],
  );
}

/** Wraps a visual so it can pop and flash white. */
export function PopFlashView({
  popFlash,
  style,
  flashRadius = 8,
  children,
}: {
  popFlash: Pick<PopFlash, "ref" | "scale" | "flash">;
  style?: StyleProp<ViewStyle>;
  flashRadius?: number;
  children: ReactNode;
}) {
  const { ref, scale, flash } = popFlash;
  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  return (
    <Animated.View ref={ref} style={[style, popStyle]}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[styles.flash, { borderRadius: flashRadius }, flashStyle]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
  },
});
