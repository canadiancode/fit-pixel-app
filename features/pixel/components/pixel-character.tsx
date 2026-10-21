import { Image } from "expo-image";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { DEFAULT_PIXEL_LOADOUT } from "../default-loadout";
import { getPixelItemSource } from "../layer-assets";
import {
  PIXEL_LAYER_Z_INDEX,
  type PixelLayerId,
  type PixelLayerSpec,
  type PixelLoadout,
} from "../types";

/** Native canvas size shared by every pixel layer asset. */
export const PIXEL_CANVAS_ASPECT_RATIO = 1484 / 1060;

const LAYER_ORDER = (
  Object.keys(PIXEL_LAYER_Z_INDEX) as PixelLayerId[]
).sort((a, b) => PIXEL_LAYER_Z_INDEX[a] - PIXEL_LAYER_Z_INDEX[b]);

export function resolveLayers(loadout: PixelLoadout): PixelLayerSpec[] {
  const layers: PixelLayerSpec[] = [];
  for (const id of LAYER_ORDER) {
    const itemId = loadout[id];
    if (itemId == null) continue;
    const source = getPixelItemSource(itemId);
    if (source == null) continue;
    layers.push({ id, zIndex: PIXEL_LAYER_Z_INDEX[id], source });
  }
  return layers;
}

type PixelCharacterProps = {
  loadout?: PixelLoadout;
  style?: StyleProp<ViewStyle>;
  /** Accessibility label for the composed character. */
  accessibilityLabel?: string;
};

/**
 * Stacks same-size pixel layers with CSS-like z-index so any combination lines up.
 * `loadout` stores catalog item ids; images are resolved from the local registry.
 */
export function PixelCharacter({
  loadout = DEFAULT_PIXEL_LOADOUT,
  style,
  accessibilityLabel = "Pixel character",
}: PixelCharacterProps) {
  const layers = resolveLayers(loadout);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      style={[styles.frame, style]}
    >
      {layers.map((layer) => (
        <Image
          key={layer.id}
          accessibilityIgnoresInvertColors
          source={layer.source}
          style={[styles.layer, { zIndex: layer.zIndex }]}
          contentFit="cover"
          pointerEvents="none"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  /** Size comes from the parent (or pass `aspectRatio: PIXEL_CANVAS_ASPECT_RATIO`). */
  frame: {
    position: "relative",
    overflow: "hidden",
  },
  /**
   * Every layer fills the same frame with the same contentFit so pixels stay aligned
   * across combinations (web: absolute + inset 0 + matching object-fit).
   */
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
});
