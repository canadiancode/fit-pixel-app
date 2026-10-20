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

import type { ActionRouteId } from "../data";
import {
  launchProgressToken,
  measureInWindowAsync,
  playProgressAddHaptic,
} from "../progress-celebration";

export type ProgressAddFeedback = {
  ref: RefObject<View | null>;
  scale: SharedValue<number>;
  flash: SharedValue<number>;
  /** Call after the add succeeded: haptic, pop + flash, and the flying token. */
  celebrate: (input: { route: ActionRouteId; label: string }) => void;
};

/** Feedback for a button that adds to today's progress. Pair with `ProgressAddFeedbackView`. */
export function useProgressAddFeedback(): ProgressAddFeedback {
  const ref = useRef<View>(null);
  const scale = useSharedValue(1);
  const flash = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const celebrate = useCallback(
    ({ route, label }: { route: ActionRouteId; label: string }) => {
      playProgressAddHaptic();
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
      const view = ref.current;
      if (view == null) return;
      void measureInWindowAsync(view).then((from) => {
        if (from != null) void launchProgressToken({ route, label, from });
      });
    },
    [flash, scale, reduceMotion],
  );

  return useMemo(
    () => ({ ref, scale, flash, celebrate }),
    [scale, flash, celebrate],
  );
}

/** Wraps a button's visual so it can pop and flash white on a successful add. */
export function ProgressAddFeedbackView({
  feedback,
  style,
  flashRadius = 8,
  children,
}: {
  feedback: ProgressAddFeedback;
  style?: StyleProp<ViewStyle>;
  flashRadius?: number;
  children: ReactNode;
}) {
  const { ref, scale, flash } = feedback;
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
