import { PIXEL_FIGURE_LAYERS, type PixelLayerId } from "./types";

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

/** Character size on the scene, relative to the original Pixel's height. */
const FIGURE_SCALE = 1.075;
/** Original placement (scene pixels): 287x609 at (589, 301). */
const FIGURE_CENTER_X = 589 + 287 / 2;
const FIGURE_FEET_Y = 301 + 609;
const FIGURE_SCENE_WIDTH = 287 * FIGURE_SCALE;
const FIGURE_SCENE_HEIGHT = 609 * FIGURE_SCALE;

/**
 * Where the character canvas sits on the scene canvas: standing between the
 * left item (bottle) and the right item (bag), feet on the floor where the
 * original Pixel stood (scaled up around the feet). Fractions of the scene.
 */
export const PIXEL_FIGURE_IN_SCENE = {
  left: (FIGURE_CENTER_X - FIGURE_SCENE_WIDTH / 2) / PIXEL_SCENE_WIDTH,
  top: (FIGURE_FEET_Y - FIGURE_SCENE_HEIGHT) / PIXEL_SCENE_HEIGHT,
  width: FIGURE_SCENE_WIDTH / PIXEL_SCENE_WIDTH,
  height: FIGURE_SCENE_HEIGHT / PIXEL_SCENE_HEIGHT,
} as const;

/** A square on the character canvas, in figure pixels. */
export type FigureCrop = { x: number; y: number; size: number };

/**
 * Hair, face and a little shoulder (chat heads, small avatars): the whole head
 * fits, eyes just above centre, so it reads centred in a circle.
 */
export const PIXEL_HEAD_CROP: FigureCrop = { x: 66, y: 10, size: 200 };

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

export type FrameRect = { left: number; top: number; width: number; height: number };

/**
 * What the hero camera frames while a layer is being picked: character parts
 * in figure pixels, held items in scene pixels (each the union of that
 * layer's art, padded). Layers without an entry keep the whole scene.
 */
const PIXEL_FOCUS_RECT: Partial<Record<PixelLayerId, FrameRect>> = {
  hair: { left: 85, top: 0, width: 160, height: 235 },
  eyes: { left: 128, top: 72, width: 116, height: 76 },
  nose: { left: 138, top: 92, width: 100, height: 64 },
  mouth: { left: 136, top: 112, width: 100, height: 64 },
  top: { left: 9, top: 125, width: 312, height: 295 },
  bottom: { left: 55, top: 315, width: 218, height: 320 },
  shoes: { left: 45, top: 590, width: 280, height: 108 },
  item_left: { left: 392, top: 684, width: 126, height: 228 },
  item_right: { left: 898, top: 688, width: 352, height: 226 },
};

const FIGURE_LAYER_IDS: readonly PixelLayerId[] = PIXEL_FIGURE_LAYERS;

/** Where `layerId`'s focus rect sits in a `width` x `height` hero frame. */
export function pixelFocusInFrame(
  layerId: PixelLayerId,
  width: number,
  height: number,
): FrameRect | null {
  const rect = PIXEL_FOCUS_RECT[layerId];
  if (rect == null || width <= 0 || height <= 0) return null;
  const scene = coverSceneRect(width, height);
  // Fractions of the scene canvas.
  const inScene = FIGURE_LAYER_IDS.includes(layerId)
    ? {
        left:
          PIXEL_FIGURE_IN_SCENE.left +
          (rect.left / PIXEL_FIGURE_WIDTH) * PIXEL_FIGURE_IN_SCENE.width,
        top:
          PIXEL_FIGURE_IN_SCENE.top +
          (rect.top / PIXEL_FIGURE_HEIGHT) * PIXEL_FIGURE_IN_SCENE.height,
        width: (rect.width / PIXEL_FIGURE_WIDTH) * PIXEL_FIGURE_IN_SCENE.width,
        height:
          (rect.height / PIXEL_FIGURE_HEIGHT) * PIXEL_FIGURE_IN_SCENE.height,
      }
    : {
        left: rect.left / PIXEL_SCENE_WIDTH,
        top: rect.top / PIXEL_SCENE_HEIGHT,
        width: rect.width / PIXEL_SCENE_WIDTH,
        height: rect.height / PIXEL_SCENE_HEIGHT,
      };
  return {
    left: scene.left + inScene.left * scene.width,
    top: scene.top + inScene.top * scene.height,
    width: inScene.width * scene.width,
    height: inScene.height * scene.height,
  };
}

/**
 * A zoom and pan of the hero frame, applied as
 * `[{ translateX: x }, { translateY: y }, { scale }]` about the frame's centre.
 */
export type PixelCamera = { scale: number; x: number; y: number };

export const PIXEL_CAMERA_REST: PixelCamera = { scale: 1, x: 0, y: 0 };

/** Share of the frame the focus rect fills along its tighter side. */
const FOCUS_FILL = 0.8;
/** Face parts are tiny; past this the pixel art turns to mush. */
const MAX_FOCUS_ZOOM = 5;

/**
 * The camera that centres `focus` in a `width` x `height` frame, below the
 * top `insetTop` points (e.g. behind the status bar), panning only as far as
 * the scene still covers the frame.
 */
export function cameraForFocus(
  focus: FrameRect,
  width: number,
  height: number,
  insetTop = 0,
): PixelCamera {
  const scene = coverSceneRect(width, height);
  const visibleHeight = height - insetTop;
  const scale = clamp(
    Math.min(
      (width * FOCUS_FILL) / focus.width,
      (visibleHeight * FOCUS_FILL) / focus.height,
    ),
    1,
    MAX_FOCUS_ZOOM,
  );
  const cx = width / 2;
  const cy = height / 2;
  const targetY = insetTop + visibleHeight / 2;
  return {
    scale,
    x: clamp(
      (cx - (focus.left + focus.width / 2)) * scale,
      width - cx - (scene.left + scene.width - cx) * scale,
      (cx - scene.left) * scale - cx,
    ),
    y: clamp(
      targetY - cy - (focus.top + focus.height / 2 - cy) * scale,
      height - cy - (scene.top + scene.height - cy) * scale,
      (cy - scene.top) * scale - cy,
    ),
  };
}

/** Where `rect` lands on screen once `camera` is applied. */
export function rectThroughCamera(
  rect: FrameRect,
  camera: PixelCamera,
  width: number,
  height: number,
): FrameRect {
  const cx = width / 2;
  const cy = height / 2;
  return {
    left: cx + camera.x + (rect.left - cx) * camera.scale,
    top: cy + camera.y + (rect.top - cy) * camera.scale,
    width: rect.width * camera.scale,
    height: rect.height * camera.scale,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
