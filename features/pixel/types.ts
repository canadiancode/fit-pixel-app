import type { ImageSource } from "expo-image";

/** Draw order for pixel character layers (higher = in front). */
export const PIXEL_LAYER_Z_INDEX = {
  background: 1,
  /** The body (gender + size + skin tone). Synced as `skin` for older builds. */
  skin: 2,
  eyes: 3,
  nose: 4,
  mouth: 5,
  bottom: 6,
  top: 7,
  shoes: 8,
  hair: 9,
  item_left: 10,
  item_right: 11,
} as const;

export type PixelLayerId = keyof typeof PIXEL_LAYER_Z_INDEX;

/** Layers drawn on the character canvas (the rest sit on the background scene). */
export const PIXEL_FIGURE_LAYERS = [
  "skin",
  "eyes",
  "nose",
  "mouth",
  "bottom",
  "top",
  "shoes",
  "hair",
] as const satisfies readonly PixelLayerId[];

export type PixelFigureLayerId = (typeof PIXEL_FIGURE_LAYERS)[number];

export type PixelGender = "male" | "female";

/** Skin tones, lightest (a) to darkest (d). Face parts are drawn per tone. */
export type PixelSkinTone = "a" | "b" | "c" | "d";

export type PixelBodySize = "small" | "medium" | "big";

/** Clothing tier: beginner is the day-1 set, casual unlocks with level. */
export type PixelClothingTier = "beginner" | "casual";

/** Stable item identity — persistable / syncable (not an ImageSource). */
export type PixelItemId = string;

/** Catalog entry: metadata + bundled image for a single layer asset. */
export type PixelItem = {
  id: PixelItemId;
  layer: PixelLayerId;
  label: string;
  /** Art for thumbnails; tone-matched parts use `sourceByTone` when drawn. */
  source: ImageSource;
  /** Eyes, nose and mouth: one drawing per skin tone. */
  sourceByTone?: Readonly<Record<PixelSkinTone, ImageSource>>;
  /** Only wearable by this gender (tops, bottoms, bodies). */
  gender?: PixelGender;
  tier?: PixelClothingTier;
};

/** Which catalog item is equipped per layer. Omit a layer to hide it. */
export type PixelLoadout = Partial<Record<PixelLayerId, PixelItemId>>;

/** Resolved layer ready to draw (after ID → ImageSource lookup). */
export type PixelLayerSpec = {
  id: PixelLayerId;
  zIndex: (typeof PIXEL_LAYER_Z_INDEX)[PixelLayerId];
  source: ImageSource;
};
