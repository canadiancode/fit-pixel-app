import {
  CHARACTER_ITEMS,
  SKIN_TONES,
  bodyId,
  garmentForGender,
  parseBodyId,
} from "./character-catalog";
import { getPixelItem } from "./layer-assets";
import {
  PIXEL_FIGURE_LAYERS,
  type PixelBodySize,
  type PixelGender,
  type PixelItem,
  type PixelItemId,
  type PixelLayerId,
  type PixelLoadout,
} from "./types";

/** Scene the starter look stands in, and the items beside it. */
const DEFAULT_SCENE: PixelLoadout = {
  background: "def-background-basic-gym",
  item_left: "def-item-left-blue-potion",
  item_right: "def-item-right-black-bag",
};

/**
 * Fallback look (before a gender is picked, and for Pixels whose saved look
 * predates the current art).
 */
export const DEFAULT_PIXEL_LOADOUT: PixelLoadout = {
  ...DEFAULT_SCENE,
  skin: "body-m-small-b",
  eyes: "eyes-1-brown",
  nose: "nose-1",
  mouth: "mouth-1",
  hair: "hair-short-2-brown",
  top: "top-m-beg-tee-blue",
  bottom: "bottom-m-beg-shorts-grey",
  shoes: "shoes-beg-a-blue",
};

/** Bodies have nothing on: a look always wears a top and a bottom. */
const DEFAULT_GARMENTS: Record<PixelGender, { top: string; bottom: string }> = {
  male: { top: "top-m-beg-tee-blue", bottom: "bottom-m-beg-shorts-grey" },
  female: { top: "top-f-beg-tee-blue", bottom: "bottom-f-beg-shorts-grey" },
};

/** Layers left out of portraits (Settings avatar, chat head bubbles). */
const PORTRAIT_HIDDEN_LAYERS = ["background", "item_left", "item_right"] as const;

/** The character alone: no background scene and no held items. */
export function portraitLoadout(loadout: PixelLoadout): PixelLoadout {
  const next: PixelLoadout = { ...loadout };
  for (const layer of PORTRAIT_HIDDEN_LAYERS) delete next[layer];
  return next;
}

export function genderOfLoadout(loadout: PixelLoadout): PixelGender | null {
  return parseBodyId(loadout.skin)?.gender ?? null;
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function isEquippable(
  layer: PixelLayerId,
  itemId: PixelItemId | undefined,
  gender: PixelGender,
): itemId is PixelItemId {
  const item = itemId != null ? getPixelItem(itemId) : undefined;
  return (
    item != null &&
    item.layer === layer &&
    (item.gender == null || item.gender === gender)
  );
}

/**
 * A look that draws correctly with the current art: an unknown or old-art
 * body falls back to the starter character, and any missing or unknown part
 * is filled from it (bodies always get a top and bottom). Scene layers are
 * kept as they are.
 */
export function completeLoadout(loadout: PixelLoadout): PixelLoadout {
  const gender = genderOfLoadout(loadout);
  if (gender == null) {
    const next: PixelLoadout = { ...loadout };
    for (const layer of PIXEL_FIGURE_LAYERS) next[layer] = DEFAULT_PIXEL_LOADOUT[layer];
    return next;
  }
  const next: PixelLoadout = { ...loadout };
  for (const layer of PIXEL_FIGURE_LAYERS) {
    if (isEquippable(layer, next[layer], gender)) continue;
    next[layer] =
      layer === "top" || layer === "bottom"
        ? DEFAULT_GARMENTS[gender][layer]
        : DEFAULT_PIXEL_LOADOUT[layer];
  }
  return next;
}

/** Hair a starter look picks from: mostly short / medium or medium / long. */
function starterHair(gender: PixelGender): PixelItem[] {
  const lengths = gender === "male" ? ["short", "med"] : ["med", "long"];
  return CHARACTER_ITEMS.hair.filter((item) =>
    lengths.some((length) => item.id.startsWith(`hair-${length}-`)),
  );
}

function beginner(layer: "top" | "bottom" | "shoes", gender: PixelGender) {
  return CHARACTER_ITEMS[layer].filter(
    (item) =>
      item.tier === "beginner" && (item.gender == null || item.gender === gender),
  );
}

/**
 * A random look from the day-1 (beginner) set for `gender` at body `size`.
 * Background and held items are taken from `scene` when given.
 */
export function createStarterLook(
  gender: PixelGender,
  size: PixelBodySize,
  scene: PixelLoadout = DEFAULT_SCENE,
): PixelLoadout {
  return {
    background: scene.background ?? DEFAULT_SCENE.background,
    item_left: scene.item_left ?? DEFAULT_SCENE.item_left,
    item_right: scene.item_right ?? DEFAULT_SCENE.item_right,
    skin: bodyId(gender, size, pickRandom(SKIN_TONES)),
    eyes: pickRandom(CHARACTER_ITEMS.eyes).id,
    nose: pickRandom(CHARACTER_ITEMS.nose).id,
    mouth: pickRandom(CHARACTER_ITEMS.mouth).id,
    hair: pickRandom(starterHair(gender)).id,
    top: pickRandom(beginner("top", gender)).id,
    bottom: pickRandom(beginner("bottom", gender)).id,
    shoes: pickRandom(beginner("shoes", gender)).id,
  };
}

/**
 * The same look on the other body: same size and tone, and each top / bottom
 * swapped for the matching cut when owned (else a random beginner piece).
 */
export function retargetLoadout(
  loadout: PixelLoadout,
  gender: PixelGender,
  size: PixelBodySize,
  owns: (itemId: PixelItemId) => boolean,
): PixelLoadout {
  const tone = parseBodyId(loadout.skin)?.tone ?? "b";
  const next: PixelLoadout = { ...loadout, skin: bodyId(gender, size, tone) };
  for (const layer of ["top", "bottom"] as const) {
    const current = loadout[layer];
    const match = current != null ? garmentForGender(current, gender) : null;
    next[layer] =
      match != null && getPixelItem(match) != null && owns(match)
        ? match
        : pickRandom(beginner(layer, gender)).id;
  }
  return next;
}
