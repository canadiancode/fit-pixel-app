import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { APP_SHELL_SECONDARY_BACKGROUND } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";

import {
  measureInWindowAsync,
  PROGRESS_TOKEN_FLIGHT_MS,
  subscribeProgressTokens,
  type ProgressTokenLaunch,
  type WindowRect,
} from "../progress-celebration";

/** How far above the straight line the token arcs mid-flight (px). */
const ARC_HEIGHT = 70;

type PlacedToken = ProgressTokenLaunch & { origin: WindowRect };

/**
 * Full-screen, touch-through overlay for the Actions tab that flies each
 * "+12oz" token from the pressed button into its progress bar.
 */
export function ProgressTokenLayer() {
  const ref = useRef<View>(null);
  const [tokens, setTokens] = useState<PlacedToken[]>([]);

  useEffect(
    () =>
      subscribeProgressTokens((launch) => {
        const view = ref.current;
        if (view == null) return;
        void measureInWindowAsync(view).then((origin) => {
          if (origin == null) return;
          setTokens((current) => [...current, { ...launch, origin }]);
          setTimeout(() => {
            setTokens((current) => current.filter((t) => t.id !== launch.id));
          }, PROGRESS_TOKEN_FLIGHT_MS + 50);
        });
      }),
    [],
  );

  return (
    <View
      ref={ref}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {tokens.map((token) => (
        <FlyingToken key={token.id} token={token} />
      ))}
    </View>
  );
}

function FlyingToken({ token }: { token: PlacedToken }) {
  const progress = useSharedValue(0);
  const { from, to, origin } = token;
  const startX = from.x + from.width / 2 - origin.x;
  const startY = from.y + from.height / 2 - origin.y;
  const endX = to.x + to.width / 2 - origin.x;
  const endY = to.y + to.height / 2 - origin.y;

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: PROGRESS_TOKEN_FLIGHT_MS,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [progress]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 0.08, 0.85, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: startX + (endX - startX) * p },
        {
          translateY:
            startY + (endY - startY) * p - ARC_HEIGHT * Math.sin(Math.PI * p),
        },
        { scale: interpolate(p, [0, 0.15, 1], [0.8, 1.25, 0.75]) },
      ],
    };
  });

  return (
    <Animated.View style={[styles.anchor, style]}>
      <View style={[styles.chip, { borderColor: token.color }]}>
        <Text style={[styles.label, { color: token.color }]}>
          {token.label}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Zero-size anchor at the layer origin; the chip centres on it.
  anchor: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  chip: {
    position: "absolute",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 2,
    borderRadius: 4,
    backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
  },
  label: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    lineHeight: 18,
  },
});
