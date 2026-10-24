import { BODY_SIZE_LEVELS, fitsGender, parseBodyId } from "./character-catalog";
import { PIXEL_LAYER_CATEGORIES } from "./data";
import { getItemOrigin, type ItemOrigin, type ItemRarity } from "./item-origin";
import { PIXEL_LAYER_ASSETS } from "./layer-assets";
import type {
  PixelBodySize,
  PixelGender,
  PixelItem,
  PixelItemId,
  PixelLayerId,
  PixelLoadout,
} from "./types";

/**
 * Body items are labelled by tone for the Customize tone picker. Here every
 * body is the player's own tone, so they differ (and unlock) by size.
 */
const BODY_SIZE_LABELS: Record<PixelBodySize, string> = {
  small: "Small body",
  medium: "Medium body",
  big: "Big body",
};

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

/** One catalog item this Pixel can wear, whether it's collected, and how it's earned. */
export type CatalogEntry = {
  item: PixelItem;
  owned: boolean;
  origin: ItemOrigin;
};

/**
 * Every item this Pixel can wear, by layer in Customize order: gender-fitted
 * clothing and bodies of its own skin tone. Bodies are owned by level, the
 * rest by inventory.
 */
export function listCatalogByLayer(input: {
  inventory: readonly PixelItemId[];
  loadout: PixelLoadout;
  gender: PixelGender | null;
  level: number;
}): { layerId: PixelLayerId; label: string; entries: CatalogEntry[] }[] {
  const { inventory, loadout, gender, level } = input;
  const inventorySet = new Set(inventory);
  const tone = parseBodyId(loadout.skin)?.tone;

  return PIXEL_LAYER_CATEGORIES.map((category) => {
    const entries: CatalogEntry[] = [];
    for (const item of PIXEL_LAYER_ASSETS[category.id]) {
      if (!fitsGender(item, gender)) continue;
      const body = parseBodyId(item.id);
      // Bodies: one tone (yours); they unlock by level, not inventory.
      if (body != null && tone != null && body.tone !== tone) continue;
      const owned =
        body != null
          ? BODY_SIZE_LEVELS[body.size] <= level
          : inventorySet.has(item.id);
      entries.push({
        item: body != null ? { ...item, label: BODY_SIZE_LABELS[body.size] } : item,
        owned,
        origin: getItemOrigin(item.id),
      });
    }
    return { layerId: category.id, label: category.label, entries };
  });
}

export function getCollectionStats(input: {
  inventory: readonly PixelItemId[];
  loadout: PixelLoadout;
  gender: PixelGender | null;
  level: number;
}): CollectionStats {
  const { level } = input;
  const byRarity = Object.fromEntries(
    RARITY_ORDER.map((rarity) => [rarity, { owned: 0, total: 0 }]),
  ) as CollectionStats["byRarity"];
  const layers: LayerCollection[] = [];
  let owned = 0;
  let total = 0;
  let nextUnlock: NextUnlock | null = null;
  const lockedRewards: PixelItem[] = [];

  for (const { layerId, label, entries } of listCatalogByLayer(input)) {
    let layerOwned = 0;
    for (const { item, owned: has, origin } of entries) {
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
    layers.push({ layerId, label, owned: layerOwned, total: entries.length });
    owned += layerOwned;
    total += entries.length;
  }

  return { owned, total, byRarity, layers, nextUnlock, lockedRewards };
}
