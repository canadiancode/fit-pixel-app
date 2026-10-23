import type { ImageSource } from "expo-image";

import {
  CHARACTER_ITEMS,
  fitsGender,
  parseBodyId,
} from "./character-catalog";
import { REWARD_ITEM_IDS, SHOP_ITEM_IDS } from "./shop-catalog";
import type {
  PixelItem,
  PixelItemId,
  PixelLayerId,
  PixelGender,
  PixelLoadout,
} from "./types";

/**
 * Full local catalog per layer. Metro requires static `require()` paths.
 * Backgrounds and held items share the 1484x1060 scene canvas; their ids use
 * a `def-` prefix + filename stem. Character parts (body, face, hair,
 * clothing) come from `character-catalog.ts`.
 */
export const PIXEL_LAYER_ASSETS: Record<PixelLayerId, PixelItem[]> = {
  ...CHARACTER_ITEMS,
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
 * Day-1 starter inventory: full catalog minus level-gated shop offers and
 * earned-only rewards. Unlocks append via `unlockItem` / `grantItem` and
 * persist in FileSystem JSON.
 */
export const DEFAULT_PIXEL_INVENTORY: readonly PixelItemId[] = (
  Object.keys(PIXEL_ITEM_BY_ID) as PixelItemId[]
).filter((id) => !SHOP_ITEM_IDS.has(id) && !REWARD_ITEM_IDS.has(id));

export function getPixelItem(itemId: PixelItemId): PixelItem | undefined {
  return PIXEL_ITEM_BY_ID[itemId];
}

/** Art for `itemId` as worn: face parts follow the loadout's skin tone. */
export function getPixelItemSource(
  itemId: PixelItemId,
  loadout?: PixelLoadout,
): ImageSource | undefined {
  const item = PIXEL_ITEM_BY_ID[itemId];
  if (item?.sourceByTone == null) return item?.source;
  const tone = parseBodyId(loadout?.skin)?.tone;
  return tone != null ? item.sourceByTone[tone] : item.source;
}

export function getPixelItemsForLayer(layerId: PixelLayerId): PixelItem[] {
  return PIXEL_LAYER_ASSETS[layerId];
}

/** Catalog items the user owns for a given layer and can wear (customize picker). */
export function getOwnedItemsForLayer(
  layerId: PixelLayerId,
  inventory: readonly PixelItemId[],
  gender: PixelGender | null = null,
): PixelItem[] {
  const owned = new Set(inventory);
  return PIXEL_LAYER_ASSETS[layerId].filter(
    (item) => owned.has(item.id) && fitsGender(item, gender),
  );
}
