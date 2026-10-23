import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { APP_SHELL_PRIMARY_BACKGROUND } from "@/constants/app-colors";
import { PixelFigure } from "@/features/pixel/components/pixel-character";
import { DEFAULT_PIXEL_LOADOUT } from "@/features/pixel/default-loadout";
import {
  figureFrameForCrop,
  PIXEL_HEAD_CROP,
} from "@/features/pixel/figure-geometry";
import type { PixelLoadout } from "@/features/pixel/types";
import type { EquippedLook } from "@/lib/api/chat";

type Props = {
  /** Server look; `undefined` loading / `null` unavailable (blank circle), empty = starter look. */
  equipped?: EquippedLook | null;
  /** Use a local loadout directly (your own pixel). */
  loadout?: PixelLoadout;
  size: number;
  style?: StyleProp<ViewStyle>;
};

/** Circular head-and-shoulders crop of a Pixel (chat sender bubbles). */
export function PixelHeadAvatar({ equipped, loadout, size, style }: Props) {
  const source: PixelLoadout | null =
    loadout ??
    (equipped == null
      ? null
      : equipped && Object.keys(equipped).length > 0
        ? (equipped as PixelLoadout)
        : DEFAULT_PIXEL_LOADOUT);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      {source ? (
        <PixelFigure
          loadout={source}
          style={[styles.figure, figureFrameForCrop(PIXEL_HEAD_CROP, size)]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    overflow: "hidden",
    backgroundColor: APP_SHELL_PRIMARY_BACKGROUND,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  figure: {
    position: "absolute",
  },
});
