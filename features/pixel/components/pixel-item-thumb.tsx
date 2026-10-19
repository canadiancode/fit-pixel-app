import { Image } from "expo-image";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import type { PixelItem, PixelLayerId } from "../types";

type Props = {
  item: PixelItem;
  size: number;
  style?: StyleProp<ViewStyle>;
  /** Dim + desaturate-ish look for items you don't own yet. */
  dimmed?: boolean;
};

/**
 * One layer asset framed for a list thumbnail. Every layer is drawn on the
 * full 1:1 character canvas, so each needs its own zoom / nudge to show the
 * part that matters (the transforms are tuned at BASE_SIZE and scale with
 * `size`).
 */
export function PixelItemThumb({ item, size, style, dimmed = false }: Props) {
  const factor = size / BASE_SIZE;
  const zoom = LAYER_ZOOM[item.layer];
  return (
    <View style={[styles.shell, { width: size, height: size }, style]}>
      <Image
        accessibilityIgnoresInvertColors
        source={item.source}
        style={[
          styles.image,
          zoom && {
            transform: [
              { translateX: zoom.x * factor },
              { translateY: zoom.y * factor },
              { scale: zoom.scale },
            ],
          },
          dimmed && styles.dimmed,
        ]}
        contentFit="cover"
      />
    </View>
  );
}

/** Size the transforms were tuned at (the picker's 72pt frame minus its 2pt border). */
const BASE_SIZE = 68;

const LAYER_ZOOM: Partial<
  Record<PixelLayerId, { x: number; y: number; scale: number }>
> = {
  skin: { x: 0, y: -8, scale: 1.5 },
  eyes: { x: -7, y: 35, scale: 6 },
  mouth: { x: -12, y: 38, scale: 12 },
  top: { x: 0, y: -10, scale: 3 },
  bottom: { x: 0, y: -38, scale: 2.6 },
  shoes: { x: 0, y: -60, scale: 3 },
  hair: { x: 4, y: 20, scale: 2.3 },
  item_left: { x: 55, y: -55, scale: 3 },
  item_right: { x: -46, y: -40, scale: 2.2 },
};

const styles = StyleSheet.create({
  shell: {
    borderRadius: 10,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  dimmed: {
    opacity: 0.55,
  },
});
