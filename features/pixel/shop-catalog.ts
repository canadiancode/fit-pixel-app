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
 * Level 1: hair + most shoes / bottles / bags.
 * Level 2: Italy gym + premium shoe/bag.
 */
export const PIXEL_SHOP_OFFERS: readonly PixelShopOffer[] = [
  // Hair (half of catalog; default bun stays free)
  {
    itemId: "def-hair-long-bun-blonde",
    label: "Long Bun Blonde",
    requiredLevel: 1,
  },
  {
    itemId: "def-hair-long-bun-brown",
    label: "Long Bun Brown",
    requiredLevel: 1,
  },
  {
    itemId: "def-hair-long-dreads-black",
    label: "Long Dreads Black",
    requiredLevel: 1,
  },
  { itemId: "def-hair-long-pink", label: "Long Pink", requiredLevel: 1 },
  {
    itemId: "def-hair-long-red-straight",
    label: "Long Red Straight",
    requiredLevel: 1,
  },
  {
    itemId: "def-hair-mid-blonde-spikey",
    label: "Mid Blonde Spikey",
    requiredLevel: 1,
  },
  {
    itemId: "def-hair-short-shaggy-brown",
    label: "Short Shaggy Brown",
    requiredLevel: 1,
  },

  // Shoes (all except default black/white)
  { itemId: "def-shoe-casual-brown", label: "Casual Brown", requiredLevel: 1 },
  {
    itemId: "def-shoe-casual-checkered-white-black",
    label: "Casual Checkered",
    requiredLevel: 1,
  },
  {
    itemId: "def-shoe-casual-green-white",
    label: "Casual Green White",
    requiredLevel: 1,
  },
  {
    itemId: "def-shoe-casual-grey-white",
    label: "Casual Grey White",
    requiredLevel: 1,
  },
  {
    itemId: "def-shoe-casual-orange-white",
    label: "Casual Orange White",
    requiredLevel: 1,
  },
  {
    itemId: "def-shoe-casual-purple-white",
    label: "Casual Purple White",
    requiredLevel: 1,
  },
  {
    itemId: "def-shoe-casual-red-white",
    label: "Casual Red White",
    requiredLevel: 1,
  },
  {
    itemId: "def-shoe-casual-yellow-white",
    label: "Casual Yellow White",
    requiredLevel: 1,
  },
  {
    itemId: "def-shoe-casual-long-white",
    label: "Casual Long White",
    requiredLevel: 2,
  },

  // Item left (all except default blue potion)
  {
    itemId: "def-item-left-blue-w-straw-bottle",
    label: "Blue Straw Bottle",
    requiredLevel: 1,
  },
  {
    itemId: "def-item-left-green-potion",
    label: "Green Potion",
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
    itemId: "def-item-left-think-purple-bottle",
    label: "Purple Bottle",
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
  {
    itemId: "def-item-right-gold-black-king-bag",
    label: "Gold Black King Bag",
    requiredLevel: 2,
  },

  // Background — Italy semi-outdoor only
  {
    itemId: "def-background-italy-semioutdoor-gym",
    label: "Italy Semi-Outdoor Gym",
    requiredLevel: 2,
  },
];

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
