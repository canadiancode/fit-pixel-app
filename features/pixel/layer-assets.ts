import type { ImageSource } from "expo-image";

import { SHOP_ITEM_IDS } from "./shop-catalog";
import type {
  PixelItem,
  PixelItemId,
  PixelLayerId,
  PixelLoadout,
} from "./types";

/**
 * Full local catalog per layer. Metro requires static `require()` paths.
 * IDs use a `def-` prefix + filename stem so starter assets are obvious vs shop unlocks.
 * Add new files here when you drop them into `assets/pixel/<layer>/`.
 */
export const PIXEL_LAYER_ASSETS: Record<PixelLayerId, PixelItem[]> = {
  background: [
    {
      id: "def-background-basic-gym",
      layer: "background",
      label: "Basic Gym",
      source: require("@/assets/pixel/background/background-basic-gym.png"),
    },
    {
      id: "def-background-blue-basic-gym",
      layer: "background",
      label: "Blue Basic Gym",
      source: require("@/assets/pixel/background/background-blue-basic-gym.png"),
    },
    {
      id: "def-background-gold-gym",
      layer: "background",
      label: "Gold Gym",
      source: require("@/assets/pixel/background/background-gold-gym.png"),
    },
    {
      id: "def-background-italy-semioutdoor-gym",
      layer: "background",
      label: "Italy Semi-Outdoor Gym",
      source: require("@/assets/pixel/background/background-italy-semioutdoor-gym.png"),
    },
    {
      id: "def-background-moderate-gym",
      layer: "background",
      label: "Moderate Gym",
      source: require("@/assets/pixel/background/background-moderate-gym.png"),
    },
    {
      id: "def-background-purple-gym",
      layer: "background",
      label: "Purple Gym",
      source: require("@/assets/pixel/background/background-purple-gym.png"),
    },
    {
      id: "def-background-red-basic-gym",
      layer: "background",
      label: "Red Basic Gym",
      source: require("@/assets/pixel/background/background-red-basic-gym.png"),
    },
    {
      id: "def-background-walk",
      layer: "background",
      label: "Walk",
      source: require("@/assets/pixel/background/background-walk.png"),
    },
  ],
  skin: [
    {
      id: "def-skin-black",
      layer: "skin",
      label: "Black",
      source: require("@/assets/pixel/skin/skin-black.png"),
    },
    {
      id: "def-skin-dark",
      layer: "skin",
      label: "Dark",
      source: require("@/assets/pixel/skin/skin-dark.png"),
    },
    {
      id: "def-skin-light",
      layer: "skin",
      label: "Light",
      source: require("@/assets/pixel/skin/skin-light.png"),
    },
    {
      id: "def-skin-med",
      layer: "skin",
      label: "Medium",
      source: require("@/assets/pixel/skin/skin-med.png"),
    },
  ],
  eyes: [
    {
      id: "def-eyes-complex-neutral",
      layer: "eyes",
      label: "Complex Neutral",
      source: require("@/assets/pixel/eyes/eyes-complex-neutral.png"),
    },
    {
      id: "def-eyes-complex-wink",
      layer: "eyes",
      label: "Complex Wink",
      source: require("@/assets/pixel/eyes/eyes-complex-wink.png"),
    },
    {
      id: "def-eyes-simple-angry",
      layer: "eyes",
      label: "Simple Angry",
      source: require("@/assets/pixel/eyes/eyes-simple-angry.png"),
    },
    {
      id: "def-eyes-simple-neutral",
      layer: "eyes",
      label: "Simple Neutral",
      source: require("@/assets/pixel/eyes/eyes-simple-neutral.png"),
    },
  ],
  mouth: [
    {
      id: "def-mouth-angrey-all-teeth",
      layer: "mouth",
      label: "Angry All Teeth",
      source: require("@/assets/pixel/mouth/mouth-angrey-all-teeth.png"),
    },
    {
      id: "def-mouth-simple-neutral",
      layer: "mouth",
      label: "Simple Neutral",
      source: require("@/assets/pixel/mouth/mouth-simple-neutral.png"),
    },
    {
      id: "def-mouth-simple-smile",
      layer: "mouth",
      label: "Simple Smile",
      source: require("@/assets/pixel/mouth/mouth-simple-smile.png"),
    },
    {
      id: "def-mouth-smile-all-teeth",
      layer: "mouth",
      label: "Smile All Teeth",
      source: require("@/assets/pixel/mouth/mouth-smile-all-teeth.png"),
    },
    {
      id: "def-mouth-smile-open-mouth",
      layer: "mouth",
      label: "Smile Open Mouth",
      source: require("@/assets/pixel/mouth/mouth-smile-open-mouth.png"),
    },
  ],
  top: [
    {
      id: "def-top-m-black-cutoff",
      layer: "top",
      label: "Men Black Cutoff",
      source: require("@/assets/pixel/top/top-m-black-cutoff.png"),
    },
    {
      id: "def-top-m-green-cutoff",
      layer: "top",
      label: "Men Green Cutoff",
      source: require("@/assets/pixel/top/top-m-green-cutoff.png"),
    },
    {
      id: "def-top-m-orange-cutoff",
      layer: "top",
      label: "Men Orange Cutoff",
      source: require("@/assets/pixel/top/top-m-orange-cutoff.png"),
    },
    {
      id: "def-top-m-purple-cutoff",
      layer: "top",
      label: "Men Purple Cutoff",
      source: require("@/assets/pixel/top/top-m-purple-cutoff.png"),
    },
    {
      id: "def-top-m-red-cutoff",
      layer: "top",
      label: "Men Red Cutoff",
      source: require("@/assets/pixel/top/top-m-red-cutoff.png"),
    },
    {
      id: "def-top-w-black-cutoff",
      layer: "top",
      label: "Women Black Cutoff",
      source: require("@/assets/pixel/top/top-w-black-cutoff.png"),
    },
    {
      id: "def-top-w-green-cutoff",
      layer: "top",
      label: "Women Green Cutoff",
      source: require("@/assets/pixel/top/top-w-green-cutoff.png"),
    },
    {
      id: "def-top-w-orange-cutoff",
      layer: "top",
      label: "Women Orange Cutoff",
      source: require("@/assets/pixel/top/top-w-orange-cutoff.png"),
    },
    {
      id: "def-top-w-purple-cutoff",
      layer: "top",
      label: "Women Purple Cutoff",
      source: require("@/assets/pixel/top/top-w-purple-cutoff.png"),
    },
    {
      id: "def-top-w-red-cutoff",
      layer: "top",
      label: "Women Red Cutoff",
      source: require("@/assets/pixel/top/top-w-red-cutoff.png"),
    },
  ],
  bottom: [
    {
      id: "def-shorts-short-black",
      layer: "bottom",
      label: "Short Black",
      source: require("@/assets/pixel/bottom/shorts-short-black.png"),
    },
    {
      id: "def-shorts-short-green",
      layer: "bottom",
      label: "Short Green",
      source: require("@/assets/pixel/bottom/shorts-short-green.png"),
    },
    {
      id: "def-shorts-short-orange",
      layer: "bottom",
      label: "Short Orange",
      source: require("@/assets/pixel/bottom/shorts-short-orange.png"),
    },
    {
      id: "def-shorts-short-purple",
      layer: "bottom",
      label: "Short Purple",
      source: require("@/assets/pixel/bottom/shorts-short-purple.png"),
    },
    {
      id: "def-shorts-short-red",
      layer: "bottom",
      label: "Short Red",
      source: require("@/assets/pixel/bottom/shorts-short-red.png"),
    },
    {
      id: "def-shorts-short-white",
      layer: "bottom",
      label: "Short White",
      source: require("@/assets/pixel/bottom/shorts-short-white.png"),
    },
  ],
  shoes: [
    {
      id: "def-shoe-casual-black-white",
      layer: "shoes",
      label: "Casual Black White",
      source: require("@/assets/pixel/shoes/shoe-casual-black-white.png"),
    },
    {
      id: "def-shoe-casual-brown",
      layer: "shoes",
      label: "Casual Brown",
      source: require("@/assets/pixel/shoes/shoe-casual-brown.png"),
    },
    {
      id: "def-shoe-casual-checkered-white-black",
      layer: "shoes",
      label: "Casual Checkered White Black",
      source: require("@/assets/pixel/shoes/shoe-casual-checkered-white-black.png"),
    },
    {
      id: "def-shoe-casual-green-white",
      layer: "shoes",
      label: "Casual Green White",
      source: require("@/assets/pixel/shoes/shoe-casual-green-white.png"),
    },
    {
      id: "def-shoe-casual-grey-white",
      layer: "shoes",
      label: "Casual Grey White",
      source: require("@/assets/pixel/shoes/shoe-casual-grey-white.png"),
    },
    {
      id: "def-shoe-casual-long-white",
      layer: "shoes",
      label: "Casual Long White",
      source: require("@/assets/pixel/shoes/shoe-casual-long-white.png"),
    },
    {
      id: "def-shoe-casual-orange-white",
      layer: "shoes",
      label: "Casual Orange White",
      source: require("@/assets/pixel/shoes/shoe-casual-orange-white.png"),
    },
    {
      id: "def-shoe-casual-purple-white",
      layer: "shoes",
      label: "Casual Purple White",
      source: require("@/assets/pixel/shoes/shoe-casual-purple-white.png"),
    },
    {
      id: "def-shoe-casual-red-white",
      layer: "shoes",
      label: "Casual Red White",
      source: require("@/assets/pixel/shoes/shoe-casual-red-white.png"),
    },
    {
      id: "def-shoe-casual-yellow-white",
      layer: "shoes",
      label: "Casual Yellow White",
      source: require("@/assets/pixel/shoes/shoe-casual-yellow-white.png"),
    },
  ],
  hair: [
    {
      id: "def-hair-bun-black",
      layer: "hair",
      label: "Bun Black",
      source: require("@/assets/pixel/hair/hair-bun-black.png"),
    },
    {
      id: "def-hair-long-black",
      layer: "hair",
      label: "Long Black",
      source: require("@/assets/pixel/hair/hair-long-black.png"),
    },
    {
      id: "def-hair-long-blonde-flowy",
      layer: "hair",
      label: "Long Blonde Flowy",
      source: require("@/assets/pixel/hair/hair-long-blonde-flowy.png"),
    },
    {
      id: "def-hair-long-brown-flowy",
      layer: "hair",
      label: "Long Brown Flowy",
      source: require("@/assets/pixel/hair/hair-long-brown-flowy.png"),
    },
    {
      id: "def-hair-long-bun-blonde",
      layer: "hair",
      label: "Long Bun Blonde",
      source: require("@/assets/pixel/hair/hair-long-bun-blonde.png"),
    },
    {
      id: "def-hair-long-bun-brown",
      layer: "hair",
      label: "Long Bun Brown",
      source: require("@/assets/pixel/hair/hair-long-bun-brown.png"),
    },
    {
      id: "def-hair-long-dreads-black",
      layer: "hair",
      label: "Long Dreads Black",
      source: require("@/assets/pixel/hair/hair-long-dreads-black.png"),
    },
    {
      id: "def-hair-long-pink",
      layer: "hair",
      label: "Long Pink",
      source: require("@/assets/pixel/hair/hair-long-pink.png"),
    },
    {
      id: "def-hair-long-red-straight",
      layer: "hair",
      label: "Long Red Straight",
      source: require("@/assets/pixel/hair/hair-long-red-straight.png"),
    },
    {
      id: "def-hair-mid-blonde-spikey",
      layer: "hair",
      label: "Mid Blonde Spikey Alt",
      source: require("@/assets/pixel/hair/hair-mid-blonde-spikey.png"),
    },
    {
      id: "def-hair-mid-blonde",
      layer: "hair",
      label: "Mid Blonde",
      source: require("@/assets/pixel/hair/hair-mid-blonde.png"),
    },
    {
      id: "def-hair-mid-brown-shaggy",
      layer: "hair",
      label: "Mid Brown Shaggy",
      source: require("@/assets/pixel/hair/hair-mid-brown-shaggy.png"),
    },
    {
      id: "def-hair-short-black-buzz-side",
      layer: "hair",
      label: "Short Black Buzz Side",
      source: require("@/assets/pixel/hair/hair-short-black-buzz-side.png"),
    },
    {
      id: "def-hair-short-black-shaggy",
      layer: "hair",
      label: "Short Black Shaggy",
      source: require("@/assets/pixel/hair/hair-short-black-shaggy.png"),
    },
    {
      id: "def-hair-short-shaggy-brown",
      layer: "hair",
      label: "Short Shaggy Brown",
      source: require("@/assets/pixel/hair/hair-short-shaggy-brown.png"),
    },
  ],
  item_left: [
    {
      id: "def-item-left-blue-potion",
      layer: "item_left",
      label: "Blue Potion",
      source: require("@/assets/pixel/item_left/item-left-blue-potion.png"),
    },
    {
      id: "def-item-left-blue-w-straw-bottle",
      layer: "item_left",
      label: "Blue Straw Bottle",
      source: require("@/assets/pixel/item_left/item-left-blue-w-straw-bottle.png"),
    },
    {
      id: "def-item-left-green-potion",
      layer: "item_left",
      label: "Green Potion",
      source: require("@/assets/pixel/item_left/item-left-green-potion.png"),
    },
    {
      id: "def-item-left-green-thin-bottle",
      layer: "item_left",
      label: "Green Thin Bottle",
      source: require("@/assets/pixel/item_left/item-left-green-thin-bottle.png"),
    },
    {
      id: "def-item-left-red-w-straw-bottle",
      layer: "item_left",
      label: "Red Straw Bottle",
      source: require("@/assets/pixel/item_left/item-left-red-w-straw-bottle.png"),
    },
    {
      id: "def-item-left-think-purple-bottle",
      layer: "item_left",
      label: "Purple Bottle",
      source: require("@/assets/pixel/item_left/item-left-think-purple-bottle.png"),
    },
    {
      id: "def-item-left-water-bottle",
      layer: "item_left",
      label: "Water Bottle",
      source: require("@/assets/pixel/item_left/item-left-water-bottle.png"),
    },
    {
      id: "def-item-left-wide-orange-bottle",
      layer: "item_left",
      label: "Wide Orange Bottle",
      source: require("@/assets/pixel/item_left/item-left-wide-orange-bottle.png"),
    },
  ],
  item_right: [
    {
      id: "def-item-right-black-bag",
      layer: "item_right",
      label: "Black Bag",
      source: require("@/assets/pixel/item_right/item-right-black-bag.png"),
    },
    {
      id: "def-item-right-blue-bag",
      layer: "item_right",
      label: "Blue Bag",
      source: require("@/assets/pixel/item_right/item-right-blue-bag.png"),
    },
    {
      id: "def-item-right-blue-w-white-bag",
      layer: "item_right",
      label: "Blue White Bag",
      source: require("@/assets/pixel/item_right/item-right-blue-w-white-bag.png"),
    },
    {
      id: "def-item-right-gold-black-king-bag",
      layer: "item_right",
      label: "Gold Black King Bag",
      source: require("@/assets/pixel/item_right/item-right-gold-black-king-bag.png"),
    },
    {
      id: "def-item-right-green-militay-bag",
      layer: "item_right",
      label: "Green Bag Alt",
      source: require("@/assets/pixel/item_right/item-right-green-militay-bag.png"),
    },
    {
      id: "def-item-right-green-bag",
      layer: "item_right",
      label: "Green Bag",
      source: require("@/assets/pixel/item_right/item-right-green-bag.png"),
    },
    {
      id: "def-item-right-pink-bag",
      layer: "item_right",
      label: "Pink Bag",
      source: require("@/assets/pixel/item_right/item-right-pink-bag.png"),
    },
  ],
};

/** Flat lookup: item id → catalog entry (includes bundled ImageSource). */
export const PIXEL_ITEM_BY_ID: Readonly<Record<PixelItemId, PixelItem>> =
  Object.fromEntries(
    (Object.keys(PIXEL_LAYER_ASSETS) as PixelLayerId[]).flatMap((layerId) =>
      PIXEL_LAYER_ASSETS[layerId].map((item) => [item.id, item]),
    ),
  );

/**
 * Day-1 starter inventory: full catalog minus level-gated shop offers.
 * Unlocks append via `unlockItem` and persist in FileSystem JSON.
 */
export const DEFAULT_PIXEL_INVENTORY: readonly PixelItemId[] = (
  Object.keys(PIXEL_ITEM_BY_ID) as PixelItemId[]
).filter((id) => !SHOP_ITEM_IDS.has(id));

export function getPixelItem(itemId: PixelItemId): PixelItem | undefined {
  return PIXEL_ITEM_BY_ID[itemId];
}

export function getPixelItemSource(
  itemId: PixelItemId,
): ImageSource | undefined {
  return PIXEL_ITEM_BY_ID[itemId]?.source;
}

export function getPixelItemsForLayer(layerId: PixelLayerId): PixelItem[] {
  return PIXEL_LAYER_ASSETS[layerId];
}

/** Catalog items the user owns for a given layer (customize picker). */
export function getOwnedItemsForLayer(
  layerId: PixelLayerId,
  inventory: readonly PixelItemId[],
): PixelItem[] {
  const owned = new Set(inventory);
  return PIXEL_LAYER_ASSETS[layerId].filter((item) => owned.has(item.id));
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

/**
 * Random item id per layer. Pass inventory to sample owned items only
 * (day-1 starter loadout); omit it to sample the full catalog (visual tests).
 */
export function createRandomPixelLoadout(
  inventory?: readonly PixelItemId[],
): PixelLoadout {
  const loadout: PixelLoadout = {};
  for (const layerId of Object.keys(PIXEL_LAYER_ASSETS) as PixelLayerId[]) {
    const pool =
      inventory != null
        ? getOwnedItemsForLayer(layerId, inventory)
        : PIXEL_LAYER_ASSETS[layerId];
    if (pool.length === 0) continue;
    loadout[layerId] = pickRandom(pool).id;
  }
  return loadout;
}
