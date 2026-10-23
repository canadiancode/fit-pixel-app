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
  RARITY_COLORS,
  RARITY_LABELS,
} from "@/features/pixel/item-origin";
import { getPixelItem } from "@/features/pixel/layer-assets";
import type { PixelLayerId, PixelLoadout } from "@/features/pixel/types";
import type { EquippedLook } from "@/lib/api/chat";

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

/**
 * What the Pixel has on display, one card per collectible: the item, its
 * rarity, and how it's earned (starter, level unlock, weight reward).
 */
export function PixelCollection({
  equipped,
  subtitle,
}: {
  equipped: EquippedLook | null | undefined;
  subtitle: string;
}) {
  if (equipped === undefined) return null;
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
          {earned} earned · {items.length} on display
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
          const color = RARITY_COLORS[origin.rarity];
          return (
            <View
              key={slot.layer}
              accessible
              accessibilityLabel={`${slot.label}: ${item.label}. ${RARITY_LABELS[origin.rarity]}. ${origin.description}.`}
              style={[styles.card, { borderColor: color }]}
            >
              <View style={styles.cardTop}>
                <View style={styles.thumbShell}>
                  <PixelItemThumb item={item} size={THUMB_SIZE} wearer={loadout} />
                </View>
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
            </View>
          );
        })}
      </View>
    </View>
  );
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
