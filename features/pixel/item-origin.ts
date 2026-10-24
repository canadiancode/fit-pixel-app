import { BODY_SIZE_LEVELS, parseBodyId } from "./character-catalog";
import { DEFAULT_PIXEL_INVENTORY } from "./layer-assets";
import {
  getShopOffer,
  PIXEL_PAID_ITEM_TIERS,
  PIXEL_WEIGHT_GOAL_REWARD,
  PIXEL_WEIGHT_MILESTONE_REWARDS,
  type PixelPriceTier,
} from "./shop-catalog";
import type { PixelItemId } from "./types";

export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type ItemOrigin = {
  rarity: ItemRarity;
  /** Short badge, e.g. "LV 2". */
  badge: string;
  /** How the item is earned, e.g. "Unlocked at Level 2". */
  description: string;
  /** Level the item unlocks at (`null` for weight-journey rewards and paid items). */
  unlockLevel: number | null;
  /** Price tier for paid items, `null` for everything earned in play. */
  priceTier: PixelPriceTier | null;
};

/** "$", "$$" or "$$$". */
export function priceTierLabel(tier: PixelPriceTier): string {
  return "$".repeat(tier);
}

/**
 * The one badge other players see on an item: its price tier when paid,
 * otherwise the level it unlocks at (weight rewards keep their reward badge).
 */
export function getPublicItemBadge(origin: ItemOrigin): string {
  if (origin.priceTier != null) return priceTierLabel(origin.priceTier);
  if (origin.unlockLevel != null) return `LV ${origin.unlockLevel}`;
  return origin.badge;
}

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
 * player): starter items, level unlocks (shop offers and bigger bodies), or
 * weight-journey rewards.
 */
export function getItemOrigin(itemId: PixelItemId): ItemOrigin {
  const priceTier = PIXEL_PAID_ITEM_TIERS.get(itemId);
  if (priceTier != null) {
    return {
      rarity: priceTier >= 3 ? "legendary" : priceTier === 2 ? "epic" : "rare",
      badge: priceTierLabel(priceTier),
      description: "Shop purchase",
      unlockLevel: null,
      priceTier,
    };
  }
  if (itemId === PIXEL_WEIGHT_GOAL_REWARD.itemId) {
    return {
      rarity: "legendary",
      badge: "GOAL",
      description: "Weight goal reward",
      unlockLevel: null,
      priceTier: null,
    };
  }
  if (MILESTONE_IDS.has(itemId)) {
    return {
      rarity: "epic",
      badge: "MILESTONE",
      description: "Weight milestone reward",
      unlockLevel: null,
      priceTier: null,
    };
  }
  const offer = getShopOffer(itemId);
  if (offer != null) {
    return {
      rarity: offer.requiredLevel >= 2 ? "rare" : "uncommon",
      badge: `LV ${offer.requiredLevel}`,
      description: `Unlocked at Level ${offer.requiredLevel}`,
      unlockLevel: offer.requiredLevel,
      priceTier: null,
    };
  }
  const body = parseBodyId(itemId);
  if (body != null && BODY_SIZE_LEVELS[body.size] > 0) {
    const level = BODY_SIZE_LEVELS[body.size];
    return {
      rarity: "common",
      badge: `LV ${level}`,
      description: `Unlocked at Level ${level}`,
      unlockLevel: level,
      priceTier: null,
    };
  }
  if (STARTER_IDS.has(itemId)) {
    return {
      rarity: "common",
      badge: "STARTER",
      description: "Starter item",
      unlockLevel: 0,
      priceTier: null,
    };
  }
  return {
    rarity: "common",
    badge: "ITEM",
    description: "Collected item",
    unlockLevel: null,
    priceTier: null,
  };
}
