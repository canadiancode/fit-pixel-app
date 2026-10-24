import { BODY_SIZE_LEVELS, fitsGender, parseBodyId } from "./character-catalog";
import { PIXEL_LAYER_CATEGORIES } from "./data";
import { getItemOrigin, type ItemRarity } from "./item-origin";
import { PIXEL_LAYER_ASSETS } from "./layer-assets";
import type {
  PixelGender,
  PixelItem,
  PixelItemId,
  PixelLayerId,
  PixelLoadout,
} from "./types";

/**
 * What the collection screen shows: how much of the catalog this player has
 * collected, per layer and per rarity, and the next thing they can earn.
 * Only items this Pixel can wear count (gender-fitted clothing and bodies of
 * its own skin tone).
 */
export type LayerCollection = {
  layerId: PixelLayerId;
  label: string;
  owned: number;
  total: number;
};

export type NextUnlock = {
  item: PixelItem;
  level: number;
};

export type CollectionStats = {
  owned: number;
  total: number;
  byRarity: Record<ItemRarity, { owned: number; total: number }>;
  layers: LayerCollection[];
  nextUnlock: NextUnlock | null;
  /** Earned-only weight-journey rewards still to win. */
  lockedRewards: PixelItem[];
};

export const RARITY_ORDER: readonly ItemRarity[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
];

export function getCollectionStats(input: {
  inventory: readonly PixelItemId[];
  loadout: PixelLoadout;
  gender: PixelGender | null;
  level: number;
}): CollectionStats {
  const { inventory, loadout, gender, level } = input;
  const inventorySet = new Set(inventory);
  const tone = parseBodyId(loadout.skin)?.tone;

  const byRarity = Object.fromEntries(
    RARITY_ORDER.map((rarity) => [rarity, { owned: 0, total: 0 }]),
  ) as CollectionStats["byRarity"];
  const layers: LayerCollection[] = [];
  let owned = 0;
  let total = 0;
  let nextUnlock: NextUnlock | null = null;
  const lockedRewards: PixelItem[] = [];

  for (const category of PIXEL_LAYER_CATEGORIES) {
    let layerOwned = 0;
    let layerTotal = 0;
    for (const item of PIXEL_LAYER_ASSETS[category.id]) {
      if (!fitsGender(item, gender)) continue;
      const body = parseBodyId(item.id);
      // Bodies: one tone (yours); they unlock by level, not inventory.
      if (body != null && tone != null && body.tone !== tone) continue;
      const has =
        body != null
          ? BODY_SIZE_LEVELS[body.size] <= level
          : inventorySet.has(item.id);
      const origin = getItemOrigin(item.id);

      layerTotal += 1;
      byRarity[origin.rarity].total += 1;
      if (has) {
        layerOwned += 1;
        byRarity[origin.rarity].owned += 1;
        continue;
      }
      if (origin.unlockLevel != null && origin.unlockLevel > level) {
        if (nextUnlock == null || origin.unlockLevel < nextUnlock.level) {
          nextUnlock = { item, level: origin.unlockLevel };
        }
      } else if (origin.unlockLevel == null && origin.priceTier == null) {
        lockedRewards.push(item);
      }
    }
    layers.push({
      layerId: category.id,
      label: category.label,
      owned: layerOwned,
      total: layerTotal,
    });
    owned += layerOwned;
    total += layerTotal;
  }

  return { owned, total, byRarity, layers, nextUnlock, lockedRewards };
}
