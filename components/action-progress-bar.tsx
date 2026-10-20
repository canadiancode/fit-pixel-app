import { Image, type ImageSource } from "expo-image";
import type { Ref } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

import {
  BarGlint,
  BarGlow,
  useBarPulse,
  type BarPulse,
} from "@/components/progress-bar-pulse";

/** End-cap width scales from `action-bar-*-end.png` (69×133). */
function getEndCapMetrics(barHeight: number) {
  const width = (69 / 133) * barHeight;
  const offset = (8 / 14) * width;
  return { width, offset };
}

export type ActionProgressBarSources = {
  fill: ImageSource;
  end: ImageSource;
  container: ImageSource;
};

type Props = {
  sources: ActionProgressBarSources;
  fillPercent: number;
  style?: StyleProp<ViewStyle>;
  height?: number;
  /** Replays the glint / glow (gold at 100%) each time its id changes. */
  pulse?: BarPulse | null;
  /** Measured as the landing spot for the flying "+amount" token. */
  barRef?: Ref<View>;
};

export function ActionProgressBar({
  sources,
  fillPercent,
  style,
  height = 22,
  pulse,
  barRef,
}: Props) {
  const { width: endWidth, offset: endOffset } = getEndCapMetrics(height);
  const { containerStyle, glintStyle, glowStyle, gold, onLayout } =
    useBarPulse(pulse);

  return (
    <Animated.View
      ref={barRef}
      onLayout={onLayout}
      style={[styles.barRow, { height }, style, containerStyle]}
    >
      <View style={[styles.fillClip, { width: `${fillPercent}%` }]}>
        <Image
          accessibilityIgnoresInvertColors
          source={sources.fill}
          style={[
            styles.fillImage,
            fillPercent > 0
              ? { width: `${10000 / fillPercent}%` }
              : { width: "100%" },
          ]}
          contentFit="fill"
        />
        <BarGlint style={glintStyle} />
      </View>
      <View
        style={[
          styles.fillRightEndWrap,
          {
            left: `${fillPercent}%`,
            width: endWidth,
            marginLeft: -endOffset,
          },
        ]}
      >
        <Image
          accessibilityIgnoresInvertColors
          source={sources.end}
          style={styles.fillRightEndImage}
          contentFit="fill"
        />
      </View>
      <Image
        accessibilityIgnoresInvertColors
        source={sources.container}
        style={styles.containerImage}
        contentFit="fill"
      />
      <BarGlow style={glowStyle} gold={gold} height={height} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  barRow: {
    alignItems: "stretch",
    justifyContent: "center",
    position: "relative",
    width: "100%",
  },
  fillClip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    overflow: "hidden",
    zIndex: 1,
  },
  fillImage: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
  },
  fillRightEndWrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    zIndex: 1,
  },
  fillRightEndImage: {
    width: "100%",
    height: "100%",
  },
  containerImage: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
});
