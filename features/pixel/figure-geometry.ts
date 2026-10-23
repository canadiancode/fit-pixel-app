import type { PixelLayerId } from "./types";

/** Background + held-item canvas (every scene asset shares it). */
export const PIXEL_SCENE_WIDTH = 1484;
export const PIXEL_SCENE_HEIGHT = 1060;
export const PIXEL_SCENE_ASPECT_RATIO = PIXEL_SCENE_WIDTH / PIXEL_SCENE_HEIGHT;

/**
 * Character canvas (every body / face / hair / clothing asset shares it):
 * the art's 1060x1484 source cropped to (200, 0, 860, 1400) and halved by
 * scripts/import-pixel-art.py.
 */
export const PIXEL_FIGURE_WIDTH = 330;
export const PIXEL_FIGURE_HEIGHT = 700;
export const PIXEL_FIGURE_ASPECT_RATIO = PIXEL_FIGURE_WIDTH / PIXEL_FIGURE_HEIGHT;

/**
 * Where the character canvas sits on the scene canvas: standing between the
 * left item (bottle) and the right item (bag), feet on the floor where the
 * original Pixel stood. Fractions of the scene.
 */
export const PIXEL_FIGURE_IN_SCENE = {
  left: 589 / PIXEL_SCENE_WIDTH,
  top: 301 / PIXEL_SCENE_HEIGHT,
  width: 287 / PIXEL_SCENE_WIDTH,
  height: 609 / PIXEL_SCENE_HEIGHT,
} as const;

/** A square on the character canvas, in figure pixels. */
export type FigureCrop = { x: number; y: number; size: number };

/** Hair, face and shoulders (chat heads, small avatars). */
export const PIXEL_HEAD_CROP: FigureCrop = { x: 81, y: 10, size: 173 };

/** Head to toe, centred (the whole figure in a square). */
export const PIXEL_FULL_FIGURE_CROP: FigureCrop = {
  x: (PIXEL_FIGURE_WIDTH - PIXEL_FIGURE_HEIGHT) / 2,
  y: 0,
  size: PIXEL_FIGURE_HEIGHT,
};

/** What each item thumbnail zooms to on the character canvas. */
export const PIXEL_THUMB_CROP: Partial<Record<PixelLayerId, FigureCrop>> = {
  skin: { x: -50, y: 10, size: 430 },
  hair: { x: 80, y: 0, size: 175 },
  eyes: { x: 118, y: 62, size: 100 },
  nose: { x: 118, y: 62, size: 100 },
  mouth: { x: 118, y: 62, size: 100 },
  top: { x: 15, y: 110, size: 300 },
  bottom: { x: 30, y: 330, size: 270 },
  shoes: { x: 40, y: 540, size: 250 },
};

/** Size and offset that draw the full figure canvas so `crop` fills a `size` square. */
export function figureFrameForCrop(crop: FigureCrop, size: number) {
  const scale = size / crop.size;
  return {
    width: PIXEL_FIGURE_WIDTH * scale,
    height: PIXEL_FIGURE_HEIGHT * scale,
    left: -crop.x * scale,
    top: -crop.y * scale,
  };
}

/**
 * The scene canvas scaled to cover a `width` x `height` frame, centred
 * (same result as `contentFit="cover"` on every scene layer).
 */
export function coverSceneRect(width: number, height: number) {
  const sceneWidth = Math.max(width, height * PIXEL_SCENE_ASPECT_RATIO);
  const sceneHeight = sceneWidth / PIXEL_SCENE_ASPECT_RATIO;
  return {
    width: sceneWidth,
    height: sceneHeight,
    left: (width - sceneWidth) / 2,
    top: (height - sceneHeight) / 2,
  };
}
