import { Image } from "expo-image";
import type { Ref } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

import {
  BarGlint,
  BarGlow,
  useBarPulse,
  type BarPulse,
} from "@/components/progress-bar-pulse";
import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";

const PERCENT_LABEL_FONT_FAMILY = "PixeloidSans";

/** Visual width of the rounded right-cap (px). Picked to match bar height. */
const XP_BAR_RIGHT_END_WIDTH = 14;
/**
 * How far LEFT the cap is shifted from the cut position. Lets the cap straddle
 * the hard right edge of the clipped fill so the seam reads as a rounded end.
 */
const XP_BAR_RIGHT_END_OFFSET = 8;
/** Inner edge of the frame's right border: x 1529 of 1555 in the container art. */
const XP_BAR_TRACK_RIGHT = 1529 / 1555;
/**
 * The cap art is opaque for 58 of its 78 px, so its rounded end shows this
 * far (px) past the fill's cut.
 */
const XP_BAR_RIGHT_END_OVERHANG =
  (XP_BAR_RIGHT_END_WIDTH * 58) / 78 - XP_BAR_RIGHT_END_OFFSET;

type Props = {
  fillPercent: number;
  /** Actual progress (0–100) shown as a label inside the bar. Omit to hide the label. */
  progressPercent?: number;
  style?: StyleProp<ViewStyle>;
  /** Bar track height in px. Matches My Pixel tile default. */
  height?: number;
  /** Replays the glint / glow (gold at 100%) each time its id changes. */
  pulse?: BarPulse | null;
  /** Measured as the landing spot for the flying "+amount" token. */
  barRef?: Ref<View>;
};

export function XpLevelBar(props: Props) {
  const { fillPercent, progressPercent, style, height = 28, pulse, barRef } =
    props;
  const { containerStyle, glintStyle, glowStyle, gold, onLayout, width } =
    useBarPulse(pulse);
  // Stop the fill where the cap's rounded end meets the border's inner edge,
  // so a full bar ends inside the frame instead of running over it.
  const fillWidth =
    width > 0
      ? Math.min(
          (fillPercent / 100) * width,
          width * XP_BAR_TRACK_RIGHT - XP_BAR_RIGHT_END_OVERHANG,
        )
      : null;

  const percentLabel =
    progressPercent != null
      ? `${Math.round(progressPercent)}%`
      : null;

  return (
    <Animated.View
      ref={barRef}
      onLayout={onLayout}
      style={[styles.barRow, { height }, style, containerStyle]}
      accessibilityLabel={
        percentLabel != null
          ? `Progress ${percentLabel}`
          : undefined
      }
    >
      <View
        style={[styles.fillClip, { width: fillWidth ?? `${fillPercent}%` }]}
      >
        <Image
          accessibilityIgnoresInvertColors
          source={require("@/assets/bars/xp-level-large.png")}
          style={[
            styles.fillImage,
            width > 0
              ? { width }
              : fillPercent > 0
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
          { left: fillWidth ?? `${fillPercent}%` },
        ]}
      >
        <Image
          accessibilityIgnoresInvertColors
          source={require("@/assets/bars/xp-level-right-end.png")}
          style={styles.fillRightEndImage}
          contentFit="fill"
        />
      </View>
      <Image
        accessibilityIgnoresInvertColors
        source={require("@/assets/bars/xp-level-container-large.png")}
        style={styles.containerImage}
        contentFit="fill"
      />
      <BarGlow style={glowStyle} gold={gold} height={height} />
      {percentLabel != null ? (
        <View
          pointerEvents="none"
          style={styles.percentOverlay}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.percentText}
          >
            {percentLabel}
          </ThemedText>
        </View>
      ) : null}
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
    width: XP_BAR_RIGHT_END_WIDTH,
    marginLeft: -XP_BAR_RIGHT_END_OFFSET,
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
  percentOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 10,
  },
  percentText: {
    fontFamily: PERCENT_LABEL_FONT_FAMILY,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "600",
  },
});
