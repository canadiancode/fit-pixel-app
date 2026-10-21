import { DEFAULT_PIXEL_INVENTORY } from "./layer-assets";
import {
  getShopOffer,
  PIXEL_WEIGHT_GOAL_REWARD,
  PIXEL_WEIGHT_MILESTONE_REWARDS,
} from "./shop-catalog";
import type { PixelItemId } from "./types";

export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type ItemOrigin = {
  rarity: ItemRarity;
  /** Short badge, e.g. "LV 2". */
  badge: string;
  /** How the item is earned, e.g. "Unlocked at Level 2". */
  description: string;
};

export const RARITY_LABELS: Record<ItemRarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

export const RARITY_COLORS: Record<ItemRarity, string> = {
  common: "#A8B2BD",
  uncommon: "#5BD16B",
  rare: "#4DA3FF",
  epic: "#B57CFF",
  legendary: "#FFD23F",
};

const MILESTONE_IDS = new Set<string>(
  PIXEL_WEIGHT_MILESTONE_REWARDS.map((reward) => reward.itemId),
);
const STARTER_IDS = new Set<string>(DEFAULT_PIXEL_INVENTORY);

/**
 * How an item is collected, derived from the catalog (the same for every
 * player): starter items, level-shop unlocks, or weight-journey rewards.
 */
export function getItemOrigin(itemId: PixelItemId): ItemOrigin {
  if (itemId === PIXEL_WEIGHT_GOAL_REWARD.itemId) {
    return {
      rarity: "legendary",
      badge: "GOAL",
      description: "Weight goal reward",
    };
  }
  if (MILESTONE_IDS.has(itemId)) {
    return {
      rarity: "epic",
      badge: "MILESTONE",
      description: "Weight milestone reward",
    };
  }
  const offer = getShopOffer(itemId);
  if (offer != null) {
    return {
      rarity: offer.requiredLevel >= 2 ? "rare" : "uncommon",
      badge: `LV ${offer.requiredLevel}`,
      description: `Unlocked at Level ${offer.requiredLevel}`,
    };
  }
  if (STARTER_IDS.has(itemId)) {
    return { rarity: "common", badge: "STARTER", description: "Starter item" };
  }
  return { rarity: "common", badge: "ITEM", description: "Collected item" };
}
