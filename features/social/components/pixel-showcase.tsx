import { StyleSheet, Text, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import {
  PIXEL_SCENE_ASPECT_RATIO,
  PixelCharacter,
} from "@/features/pixel/components/pixel-character";
import { PixelItemThumb } from "@/features/pixel/components/pixel-item-thumb";
import { DEFAULT_PIXEL_LOADOUT } from "@/features/pixel/default-loadout";
import {
  getItemOrigin,
  getPublicItemBadge,
  RARITY_COLORS,
  RARITY_LABELS,
} from "@/features/pixel/item-origin";
import { getPixelItem } from "@/features/pixel/layer-assets";
import type {
  PixelItemId,
  PixelLayerId,
  PixelLoadout,
} from "@/features/pixel/types";
import type { EquippedLook } from "@/lib/api/chat";
import type { InventoryUnlockRecord } from "@/lib/db";

const SHOWCASE_RIM = "rgba(255,255,255,0.18)";
const THUMB_SIZE = 56;

/** Collectible slots, most showcase-worthy first. Base features are left out. */
const COLLECTION_SLOTS: readonly { layer: PixelLayerId; label: string }[] = [
  { layer: "background", label: "Background" },
  { layer: "item_left", label: "Item 1" },
  { layer: "item_right", label: "Item 2" },
  { layer: "hair", label: "Hair" },
  { layer: "top", label: "Top" },
  { layer: "bottom", label: "Bottom" },
  { layer: "shoes", label: "Shoes" },
];

function toLoadout(equipped: EquippedLook | null | undefined): PixelLoadout {
  return equipped && Object.keys(equipped).length > 0
    ? (equipped as PixelLoadout)
    : DEFAULT_PIXEL_LOADOUT;
}

/** The full Pixel — background, outfit and both held items — edge to edge. */
export function PixelShowcase({
  equipped,
  accessibilityLabel,
}: {
  equipped: EquippedLook | null | undefined;
  accessibilityLabel: string;
}) {
  return (
    <View style={styles.showcase}>
      {equipped === undefined ? null : (
        <PixelCharacter
          loadout={toLoadout(equipped)}
          accessibilityLabel={accessibilityLabel}
          style={StyleSheet.absoluteFill}
        />
      )}
    </View>
  );
}

const UNLOCK_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
};

function formatUnlockDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, UNLOCK_DATE_FORMAT);
}

/**
 * What the Pixel has on display, one card per collectible.
 *
 * `owner`: the player's own view — rarity, how the item was earned, and when.
 * `public`: what everyone else sees — one badge, the level the item unlocks
 * at, or its price tier ($ / $$ / $$$) for paid items.
 */
export function PixelCollection({
  equipped,
  subtitle,
  variant,
  unlocks,
  joinedAt,
}: {
  equipped: EquippedLook | null | undefined;
  subtitle: string;
  variant: "owner" | "public";
  /** Owner only: when each item was unlocked, by item id. */
  unlocks?: ReadonlyMap<PixelItemId, InventoryUnlockRecord>;
  /** Owner only: account start, shown as the date for starter items. */
  joinedAt?: string | null;
}) {
  if (equipped === undefined) return null;
  const isOwner = variant === "owner";
  const loadout = toLoadout(equipped);
  const slots = COLLECTION_SLOTS.map((slot) => {
    const itemId = loadout[slot.layer];
    const item = itemId != null ? getPixelItem(itemId) : undefined;
    return { slot, item, origin: item != null ? getItemOrigin(item.id) : null };
  });
  const items = slots.filter((entry) => entry.item != null);
  const earned = items.filter(
    (entry) => entry.origin != null && entry.origin.rarity !== "common",
  ).length;

  return (
    <View style={styles.collection}>
      <View style={styles.collectionHeader}>
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.collectionTitle}
          accessibilityRole="header"
        >
          Collection
        </ThemedText>
        <Text style={styles.collectionCount}>
          {isOwner
            ? `${earned} earned · ${items.length} on display`
            : `${items.length} on display`}
        </Text>
      </View>
      <Text style={styles.collectionSubtitle}>
        {subtitle}
      </Text>
      <View style={styles.grid}>
        {slots.map(({ slot, item, origin }) => {
          if (item == null || origin == null) {
            return (
              <View
                key={slot.layer}
                accessible
                accessibilityLabel={`${slot.label}: empty slot`}
                style={[styles.card, styles.emptyCard]}
              >
                <View style={[styles.thumbShell, styles.emptyThumb]} />
                <Text style={styles.slotLabel}>{slot.label}</Text>
                <Text style={styles.origin}>Empty slot</Text>
              </View>
            );
          }
          const thumb = (
            <View style={styles.thumbShell}>
              <PixelItemThumb item={item} size={THUMB_SIZE} wearer={loadout} />
            </View>
          );

          if (!isOwner) {
            const badge = getPublicItemBadge(origin);
            return (
              <View
                key={slot.layer}
                accessible
                accessibilityLabel={`${slot.label}: ${item.label}. ${publicBadgeA11y(badge, origin.priceTier)}.`}
                style={[styles.card, styles.itemCard]}
              >
                <View style={styles.cardTop}>
                  {thumb}
                  <View style={styles.badge}>
                    <Text style={styles.badgeLabel}>{badge}</Text>
                  </View>
                </View>
                <Text style={styles.slotLabel}>{slot.label}</Text>
                <Text numberOfLines={2} style={styles.itemName}>
                  {item.label}
                </Text>
              </View>
            );
          }

          const color = RARITY_COLORS[origin.rarity];
          const unlock = unlocks?.get(item.id);
          const isStarter = origin.unlockLevel === 0 && unlock == null;
          const date = formatUnlockDate(
            unlock?.unlockedAt ?? (isStarter ? joinedAt : null),
          );
          const dateLine =
            date == null ? null : `${isStarter ? "Since" : "On"} ${date}`;
          // Level-gated items say their level already; rewards and paid items
          // show the level you were when you got them.
          const gotAt =
            origin.unlockLevel == null && unlock?.clientLevel != null
              ? `Earned at Level ${unlock.clientLevel}`
              : null;
          return (
            <View
              key={slot.layer}
              accessible
              accessibilityLabel={[
                `${slot.label}: ${item.label}`,
                RARITY_LABELS[origin.rarity],
                origin.description,
                gotAt,
                dateLine,
              ]
                .filter(Boolean)
                .join(". ")}
              style={[styles.card, { borderColor: color }]}
            >
              <View style={styles.cardTop}>
                {thumb}
                <View style={[styles.badge, { backgroundColor: color }]}>
                  <Text style={styles.badgeLabel}>{origin.badge}</Text>
                </View>
              </View>
              <Text style={styles.slotLabel}>{slot.label}</Text>
              <Text numberOfLines={2} style={styles.itemName}>
                {item.label}
              </Text>
              <Text style={[styles.rarity, { color }]}>
                {RARITY_LABELS[origin.rarity]}
              </Text>
              <Text numberOfLines={2} style={styles.origin}>
                {origin.description}
              </Text>
              {gotAt ? (
                <Text numberOfLines={1} style={styles.origin}>
                  {gotAt}
                </Text>
              ) : null}
              {dateLine ? (
                <Text numberOfLines={1} style={styles.origin}>
                  {dateLine}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function publicBadgeA11y(badge: string, priceTier: number | null): string {
  if (priceTier != null) {
    return priceTier >= 3
      ? "Premium item"
      : priceTier === 2
        ? "Mid-price item"
        : "Low-price item";
  }
  return badge.startsWith("LV ") ? `Level ${badge.slice(3)} item` : badge;
}

const styles = StyleSheet.create({
  showcase: {
    alignSelf: "stretch",
    aspectRatio: PIXEL_SCENE_ASPECT_RATIO,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: SHOWCASE_RIM,
    overflow: "hidden",
  },
  collection: {
    marginTop: 24,
    gap: 6,
  },
  collectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  collectionTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
  },
  collectionCount: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 12,
    color: APP_SHELL_LABEL_COLOR,
  },
  collectionSubtitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 13,
    color: APP_SHELL_LABEL_COLOR,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
    marginTop: 8,
  },
  card: {
    // Two fixed columns, so a lone last card doesn't stretch.
    width: "48.5%",
    borderWidth: 2,
    borderRadius: 10,
    padding: 10,
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  itemCard: {
    borderColor: "rgba(255,255,255,0.22)",
  },
  emptyCard: {
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "transparent",
  },
  emptyThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    marginBottom: 4,
  },
  thumbShell: {
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  badge: {
    backgroundColor: "#FFD23F",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  badgeLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 7,
    lineHeight: 9,
    color: "#0B1B3F",
  },
  slotLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 11,
    color: APP_SHELL_LABEL_COLOR,
  },
  itemName: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 14,
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
  rarity: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 12,
  },
  origin: {
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 11,
    color: APP_SHELL_LABEL_COLOR,
  },
});
