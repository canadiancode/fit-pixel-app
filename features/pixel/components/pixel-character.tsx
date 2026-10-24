import { Image } from "expo-image";
import { useState } from "react";
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { completeLoadout, DEFAULT_PIXEL_LOADOUT } from "../default-loadout";
import {
  coverSceneRect,
  PIXEL_FIGURE_IN_SCENE,
  PIXEL_SCENE_ASPECT_RATIO,
} from "../figure-geometry";
import { getPixelItemSource } from "../layer-assets";
import {
  PIXEL_FIGURE_LAYERS,
  PIXEL_LAYER_Z_INDEX,
  type PixelLayerId,
  type PixelLayerSpec,
  type PixelLoadout,
} from "../types";

export { PIXEL_SCENE_ASPECT_RATIO };

const LAYER_ORDER = (
  Object.keys(PIXEL_LAYER_Z_INDEX) as PixelLayerId[]
).sort((a, b) => PIXEL_LAYER_Z_INDEX[a] - PIXEL_LAYER_Z_INDEX[b]);

const FIGURE_LAYER_SET = new Set<PixelLayerId>(PIXEL_FIGURE_LAYERS);

export function isFigureLayer(layerId: PixelLayerId): boolean {
  return FIGURE_LAYER_SET.has(layerId);
}

/**
 * Drawable layers in z order. The character is completed first, so an old or
 * partial look still draws a dressed Pixel; face parts take the body's tone.
 */
export function resolveLayers(loadout: PixelLoadout): PixelLayerSpec[] {
  const look = completeLoadout(loadout);
  const layers: PixelLayerSpec[] = [];
  for (const id of LAYER_ORDER) {
    const itemId = look[id];
    if (itemId == null) continue;
    const source = getPixelItemSource(itemId, look);
    if (source == null) continue;
    layers.push({ id, zIndex: PIXEL_LAYER_Z_INDEX[id], source });
  }
  return layers;
}

/**
 * The character's layers, stacked on its own canvas (fills `style`'s box).
 * Pass `allowDownscaling={false}` when the canvas is zoomed with a transform,
 * so the art keeps its full resolution.
 */
export function FigureLayers({
  layers,
  allowDownscaling = true,
}: {
  layers: PixelLayerSpec[];
  allowDownscaling?: boolean;
}) {
  return layers
    .filter((layer) => isFigureLayer(layer.id))
    .map((layer) => (
      <Image
        key={layer.id}
        accessibilityIgnoresInvertColors
        source={layer.source}
        style={[styles.layer, { zIndex: layer.zIndex }]}
        contentFit="contain"
        allowDownscaling={allowDownscaling}
        pointerEvents="none"
      />
    ));
}

type PixelFigureProps = {
  loadout?: PixelLoadout;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * The character alone (body, face, hair, outfit) on its 330x700 canvas.
 * Size comes from `style`; pass `aspectRatio: PIXEL_FIGURE_ASPECT_RATIO`
 * for an exact fit.
 */
export function PixelFigure({
  loadout = DEFAULT_PIXEL_LOADOUT,
  style,
  accessibilityLabel = "Pixel character",
}: PixelFigureProps) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      style={[styles.frame, style]}
    >
      <FigureLayers layers={resolveLayers(loadout)} />
    </View>
  );
}

type PixelCharacterProps = {
  loadout?: PixelLoadout;
  style?: StyleProp<ViewStyle>;
  /** Accessibility label for the composed character. */
  accessibilityLabel?: string;
};

/**
 * The full scene: background and held items on the 1484x1060 scene canvas,
 * with the character standing between the items. The scene covers the frame
 * (centred crop), like `contentFit="cover"`.
 */
export function PixelCharacter({
  loadout = DEFAULT_PIXEL_LOADOUT,
  style,
  accessibilityLabel = "Pixel character",
}: PixelCharacterProps) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const layers = resolveLayers(loadout);
  const sceneLayers = layers.filter((layer) => !isFigureLayer(layer.id));

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      onLayout={onLayout}
      style={[styles.frame, style]}
    >
      {size != null ? (
        <View
          pointerEvents="none"
          style={[styles.scene, coverSceneRect(size.width, size.height)]}
        >
          {sceneLayers.map((layer) => (
            <Image
              key={layer.id}
              accessibilityIgnoresInvertColors
              source={layer.source}
              style={[styles.layer, { zIndex: layer.zIndex }]}
              contentFit="cover"
            />
          ))}
          <View style={[styles.figure, FIGURE_RECT]}>
            <FigureLayers layers={layers} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Character canvas placement on the scene, as percentages. */
export const FIGURE_RECT = {
  left: `${PIXEL_FIGURE_IN_SCENE.left * 100}%`,
  top: `${PIXEL_FIGURE_IN_SCENE.top * 100}%`,
  width: `${PIXEL_FIGURE_IN_SCENE.width * 100}%`,
  height: `${PIXEL_FIGURE_IN_SCENE.height * 100}%`,
} as const;

const styles = StyleSheet.create({
  frame: {
    position: "relative",
    overflow: "hidden",
  },
  scene: {
    position: "absolute",
  },
  /** Between the background and the held items (z 1 and 10–11). */
  figure: {
    position: "absolute",
    zIndex: 5,
  },
  /**
   * Every layer fills the same frame with the same contentFit so pixels stay
   * aligned across combinations.
   */
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
});
