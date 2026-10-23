import { CASUAL_TIER_ITEMS, CASUAL_TIER_LEVEL } from "./character-catalog";
import type { PixelItemId } from "./types";

/**
 * Level-gated shop offers. Local gates are honor-system until the server
 * re-validates entitlement from facts (inventory_unlock is untrusted_client).
 */
export type PixelShopOffer = {
  readonly itemId: PixelItemId;
  readonly label: string;
  readonly requiredLevel: number;
};

/**
 * Items not in the day-1 starter inventory.
 * Level 1: most bottles / bags. Level 2: Italy gym.
 * Level 3: the casual clothing tier (hoodies, sport tanks, gym shorts,
 * tights and casual sneakers) for both genders.
 *
 * Green Potion, Purple Bottle and the Gold Black King Bag are not sold here:
 * they're weight-journey milestone rewards (see features/actions/weight).
 */
export const PIXEL_SHOP_OFFERS: readonly PixelShopOffer[] = [
  // Item left (all except default blue potion)
  {
    itemId: "def-item-left-blue-w-straw-bottle",
    label: "Blue Straw Bottle",
    requiredLevel: 1,
  },
  {
    itemId: "def-item-left-green-thin-bottle",
    label: "Green Thin Bottle",
    requiredLevel: 1,
  },
  {
    itemId: "def-item-left-red-w-straw-bottle",
    label: "Red Straw Bottle",
    requiredLevel: 1,
  },
  {
    itemId: "def-item-left-water-bottle",
    label: "Water Bottle",
    requiredLevel: 1,
  },
  {
    itemId: "def-item-left-wide-orange-bottle",
    label: "Wide Orange Bottle",
    requiredLevel: 1,
  },

  // Item right (all except default black bag)
  { itemId: "def-item-right-blue-bag", label: "Blue Bag", requiredLevel: 1 },
  {
    itemId: "def-item-right-blue-w-white-bag",
    label: "Blue White Bag",
    requiredLevel: 1,
  },
  {
    itemId: "def-item-right-green-militay-bag",
    label: "Green Military Bag",
    requiredLevel: 1,
  },
  {
    itemId: "def-item-right-green-bag",
    label: "Green Bag",
    requiredLevel: 1,
  },
  { itemId: "def-item-right-pink-bag", label: "Pink Bag", requiredLevel: 1 },

  // Background — Italy semi-outdoor only
  {
    itemId: "def-background-italy-semioutdoor-gym",
    label: "Italy Semi-Outdoor Gym",
    requiredLevel: 2,
  },

  ...CASUAL_TIER_ITEMS.map((item) => ({
    itemId: item.id,
    label: item.label,
    requiredLevel: CASUAL_TIER_LEVEL,
  })),
];

/**
 * Earned-only collectibles: never sold, never in the starter set. Granted by
 * the weight journey (milestones, then the goal).
 */
export const PIXEL_WEIGHT_MILESTONE_REWARDS = [
  { itemId: "def-item-left-green-potion", label: "Green Potion" },
  { itemId: "def-item-left-think-purple-bottle", label: "Purple Bottle" },
] as const;
export const PIXEL_WEIGHT_GOAL_REWARD = {
  itemId: "def-item-right-gold-black-king-bag",
  label: "Gold Black King Bag",
} as const;
export const REWARD_ITEM_IDS: ReadonlySet<PixelItemId> = new Set([
  ...PIXEL_WEIGHT_MILESTONE_REWARDS.map((reward) => reward.itemId),
  PIXEL_WEIGHT_GOAL_REWARD.itemId,
]);

export const SHOP_ITEM_IDS: ReadonlySet<PixelItemId> = new Set(
  PIXEL_SHOP_OFFERS.map((offer) => offer.itemId),
);

const OFFER_BY_ID: ReadonlyMap<PixelItemId, PixelShopOffer> = new Map(
  PIXEL_SHOP_OFFERS.map((offer) => [offer.itemId, offer]),
);

export function isShopItem(itemId: PixelItemId): boolean {
  return SHOP_ITEM_IDS.has(itemId);
}

export function getShopOffer(
  itemId: PixelItemId,
): PixelShopOffer | undefined {
  return OFFER_BY_ID.get(itemId);
}
