import { Image } from "expo-image";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { completeLoadout, DEFAULT_PIXEL_LOADOUT } from "../default-loadout";
import { figureFrameForCrop, PIXEL_THUMB_CROP } from "../figure-geometry";
import type { PixelItem, PixelLayerId, PixelLoadout } from "../types";
import { PixelFigure } from "./pixel-character";

type Props = {
  item: PixelItem;
  size: number;
  style?: StyleProp<ViewStyle>;
  /** Dim + desaturate-ish look for items you don't own yet. */
  dimmed?: boolean;
  /**
   * Whose Pixel character parts are tried on (defaults to the starter look).
   * Clothing, hair and face parts show worn, zoomed to that part.
   */
  wearer?: PixelLoadout;
};

/**
 * One item framed for a list thumbnail. Character parts are drawn on the
 * wearer at the part's crop; scene items (backgrounds, held items) are drawn
 * on the full scene canvas with a per-layer zoom / nudge (tuned at BASE_SIZE,
 * scaled with `size`).
 */
export function PixelItemThumb({
  item,
  size,
  style,
  dimmed = false,
  wearer = DEFAULT_PIXEL_LOADOUT,
}: Props) {
  const crop = PIXEL_THUMB_CROP[item.layer];
  if (crop != null) {
    const look = completeLoadout({ ...wearer, [item.layer]: item.id });
    return (
      <View style={[styles.shell, { width: size, height: size }, style]}>
        <PixelFigure
          loadout={look}
          accessibilityLabel={item.label}
          style={[
            styles.figure,
            figureFrameForCrop(crop, size),
            dimmed && styles.dimmed,
          ]}
        />
      </View>
    );
  }

  const factor = size / BASE_SIZE;
  const zoom = SCENE_LAYER_ZOOM[item.layer];
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

const SCENE_LAYER_ZOOM: Partial<
  Record<PixelLayerId, { x: number; y: number; scale: number }>
> = {
  item_left: { x: 55, y: -55, scale: 3 },
  item_right: { x: -46, y: -40, scale: 2.2 },
};

const styles = StyleSheet.create({
  /** Square: thumbs sit in pixel frames, which have no rounded corners. */
  shell: {
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  figure: {
    position: "absolute",
  },
  dimmed: {
    opacity: 0.55,
  },
});
