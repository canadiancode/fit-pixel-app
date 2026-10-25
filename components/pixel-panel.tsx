import type { ReactNode } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

/**
 * Pixel-art window frames (scripts/generate-pixel-frames.py): notched
 * corners, a bevel, a coloured rim and a dithered fill, drawn 1:1 on the
 * device's pixel grid. Use these instead of borderWidth + borderRadius, which
 * read as smooth vector UI.
 */
const FRAMES = {
  /** Default raised card. */
  blue: require("@/assets/frames/frame-blue.png"),
  /** Brighter raised tile: buttons, the selected chip or tab. */
  button: require("@/assets/frames/frame-button.png"),
  gold: require("@/assets/frames/frame-gold.png"),
  green: require("@/assets/frames/frame-green.png"),
  purple: require("@/assets/frames/frame-purple.png"),
  red: require("@/assets/frames/frame-red.png"),
  /** Recessed: tracks, thumbnail wells, inputs. */
  well: require("@/assets/frames/frame-well.png"),
} as const;

export type PixelFrame = keyof typeof FRAMES;

const ARROW_LEFT = require("@/assets/frames/glyph-arrow-left.png");
const CHEVRON_RIGHT = require("@/assets/frames/glyph-chevron-right.png");

/** Points the frame's corner caps cover; content padding should clear it. */
export const FRAME_CAP_INSET = 8;
/** 12 art pixels at 2 pt each. */
const FRAME_SIZE = 24;
const CAP_INSETS = {
  top: FRAME_CAP_INSET,
  left: FRAME_CAP_INSET,
  bottom: FRAME_CAP_INSET,
  right: FRAME_CAP_INSET,
};

/**
 * The frame stretched behind its parent. iOS 9-slices it natively (corners
 * 1:1, edges and fill tiled); Android has no cap insets, so it gets nine
 * clipped pieces instead.
 */
export function PixelFrameBackdrop({ frame = "blue" }: { frame?: PixelFrame }) {
  const source = FRAMES[frame];
  if (Platform.OS === "ios") {
    // The wrapper has no padding, so 100% is the panel's full border box.
    return (
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Image
          accessible={false}
          source={source}
          capInsets={CAP_INSETS}
          resizeMode="repeat"
          style={styles.fill}
        />
      </View>
    );
  }
  return <SlicedFrame source={source} />;
}

const C = FRAME_CAP_INSET;
const MID = FRAME_SIZE - C * 2;

/** One clipped window onto the frame image, stretched so `src` fills it. */
function Slice({
  source,
  src,
  style,
}: {
  source: ImageSourcePropType;
  /** Source rect in points: x, y, width, height. */
  src: [number, number, number, number];
  style: ViewStyle;
}) {
  return (
    <View style={[styles.slice, style]}>
      {/* Scale the whole image so the source rect fills this window (percent of the window). */}
      <Image
        source={source}
        resizeMode="stretch"
        fadeDuration={0}
        style={{
          position: "absolute",
          width: `${(FRAME_SIZE / src[2]) * 100}%`,
          height: `${(FRAME_SIZE / src[3]) * 100}%`,
          left: `${(-src[0] / src[2]) * 100}%`,
          top: `${(-src[1] / src[3]) * 100}%`,
        }}
      />
    </View>
  );
}

function SlicedFrame({ source }: { source: ImageSourcePropType }) {
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Slice source={source} src={[0, 0, C, C]} style={{ left: 0, top: 0, width: C, height: C }} />
      <Slice source={source} src={[C, 0, MID, C]} style={{ left: C, right: C, top: 0, height: C }} />
      <Slice source={source} src={[C + MID, 0, C, C]} style={{ right: 0, top: 0, width: C, height: C }} />
      <Slice source={source} src={[0, C, C, MID]} style={{ left: 0, top: C, bottom: C, width: C }} />
      <Slice source={source} src={[C, C, MID, MID]} style={{ left: C, right: C, top: C, bottom: C }} />
      <Slice source={source} src={[C + MID, C, C, MID]} style={{ right: 0, top: C, bottom: C, width: C }} />
      <Slice source={source} src={[0, C + MID, C, C]} style={{ left: 0, bottom: 0, width: C, height: C }} />
      <Slice source={source} src={[C, C + MID, MID, C]} style={{ left: C, right: C, bottom: 0, height: C }} />
      <Slice source={source} src={[C + MID, C + MID, C, C]} style={{ right: 0, bottom: 0, width: C, height: C }} />
    </View>
  );
}

type PanelProps = {
  frame?: PixelFrame;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
} & Omit<React.ComponentProps<typeof View>, "style" | "children">;

/** A View on a pixel-art frame. Pad content by at least FRAME_CAP_INSET. */
export function PixelPanel({ frame = "blue", children, style, ...rest }: PanelProps) {
  return (
    <View {...rest} style={[styles.panel, style]}>
      <PixelFrameBackdrop frame={frame} />
      {children}
    </View>
  );
}

type PressablePanelProps = Omit<PressableProps, "style" | "children"> & {
  frame?: PixelFrame;
  /** Frame while held down (defaults to the recessed well). */
  pressedFrame?: PixelFrame;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/** A pressable pixel panel that sinks into the well frame while pressed. */
export function PixelPressablePanel({
  frame = "blue",
  pressedFrame = "well",
  style,
  children,
  disabled,
  ...rest
}: PressablePanelProps) {
  return (
    <Pressable {...rest} disabled={disabled} style={[styles.panel, style]}>
      {({ pressed }) => (
        <>
          <PixelFrameBackdrop frame={pressed && !disabled ? pressedFrame : frame} />
          {children}
        </>
      )}
    </Pressable>
  );
}

/** Pixel "›" for rows that open another screen (10 × 14 pt). */
export function PixelChevron({ style }: { style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      accessible={false}
      source={CHEVRON_RIGHT}
      style={[styles.chevron, style]}
    />
  );
}

/** Square pixel button with a left arrow: the one back button for sub-screens. */
export function PixelBackButton({
  onPress,
  accessibilityLabel = "Back",
  size = 44,
}: {
  onPress: () => void;
  accessibilityLabel?: string;
  size?: number;
}) {
  return (
    <PixelPressablePanel
      frame="button"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={onPress}
      style={[styles.backButton, { width: size, height: size }]}
    >
      <Image accessible={false} source={ARROW_LEFT} style={styles.arrow} />
    </PixelPressablePanel>
  );
}

const styles = StyleSheet.create({
  panel: {
    padding: FRAME_CAP_INSET + 4,
  },
  /** Explicit size: Image otherwise takes the asset's own size over left/right. */
  fill: {
    width: "100%",
    height: "100%",
  },
  slice: {
    position: "absolute",
    overflow: "hidden",
  },
  chevron: {
    width: 10,
    height: 14,
  },
  backButton: {
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  arrow: {
    width: 18,
    height: 14,
  },
});
