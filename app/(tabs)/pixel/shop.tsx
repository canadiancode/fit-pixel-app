import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { XpLevelBar } from "@/components/xp-level-bar";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_SECONDARY_BACKGROUND,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { PixelItemThumb } from "@/features/pixel/components/pixel-item-thumb";
import { PixelSubScreenToolbar } from "@/features/pixel/components/pixel-sub-screen-toolbar";
import { PIXEL_LAYER_CATEGORIES } from "@/features/pixel/data";
import { getPixelItem } from "@/features/pixel/layer-assets";
import { usePixelLoadout } from "@/features/pixel/pixel-loadout-context";
import {
  PIXEL_SHOP_OFFERS,
  type PixelShopOffer,
} from "@/features/pixel/shop-catalog";
import type { PixelItem, PixelLayerId } from "@/features/pixel/types";
import { useXpState } from "@/features/xp/xp-state-context";
import {
  getXpBarFillPercent,
  getXpProgressInCurrentLevelPercent,
  getXpRemainingToNextLevel,
} from "@/lib/xp-progress";

const STAR_ICON = require("@/assets/icons/star.png");

/** Same pixel-card palette as the Chat tab rows. */
const CARD_FILL = "#01224e";
const CARD_RIM = "#0b4f96";
const CARD_RIM_ACTIVE = "#2f86e8";
const TRACK_FILL = "#011a3a";

const GRID_GAP = 10;
const GRID_COLUMNS = 3;
const SCREEN_PADDING = 16;

type LockedOffer = { offer: PixelShopOffer; item: PixelItem };
type CategoryFilter = PixelLayerId | "all";

/**
 * What you're working toward: only items you don't own yet, by Pixel category.
 * Items are free and land in your inventory on their own when you reach their
 * level (see PixelLoadoutProvider), so there's nothing to tap to unlock.
 */
export default function PixelShopScreen() {
  const router = useRouter();
  const { xp } = useXpState();
  const { ownsItem } = usePixelLoadout();
  const { width: windowWidth } = useWindowDimensions();
  const [panelWidth, setPanelWidth] = useState(windowWidth);
  const [filter, setFilter] = useState<CategoryFilter>("all");

  const byCategory = useMemo(() => {
    const groups = new Map<PixelLayerId, LockedOffer[]>();
    for (const offer of PIXEL_SHOP_OFFERS) {
      if (ownsItem(offer.itemId)) continue;
      const item = getPixelItem(offer.itemId);
      if (!item) continue;
      const list = groups.get(item.layer) ?? [];
      list.push({ offer, item });
      groups.set(item.layer, list);
    }
    for (const list of groups.values()) {
      list.sort(
        (a, b) =>
          a.offer.requiredLevel - b.offer.requiredLevel ||
          a.offer.label.localeCompare(b.offer.label),
      );
    }
    // Same order as the Customize screen's categories.
    return PIXEL_LAYER_CATEGORIES.filter((category) =>
      groups.has(category.id),
    ).map((category) => ({ category, offers: groups.get(category.id)! }));
  }, [ownsItem]);

  const visible =
    filter === "all"
      ? byCategory
      : byCategory.filter(({ category }) => category.id === filter);
  const totalLocked = byCategory.reduce((n, g) => n + g.offers.length, 0);
  const nextLevel = Math.min(
    ...byCategory.flatMap((g) => g.offers.map((o) => o.offer.requiredLevel)),
  );
  const nextCount = byCategory.reduce(
    (n, g) => n + g.offers.filter((o) => o.offer.requiredLevel === nextLevel).length,
    0,
  );

  // Three cards per row across the measured panel.
  const cardWidth = Math.floor(
    (panelWidth - SCREEN_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) /
      GRID_COLUMNS,
  );

  return (
    <View style={styles.root}>
      <PixelSubScreenToolbar
        accessibilityLabel="Back to customize"
        onBack={() => router.back()}
      />
      <ScrollView
        style={styles.scroll}
        onLayout={(event) => setPanelWidth(event.nativeEvent.layout.width)}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.levelCard}>
          <View style={styles.levelRow}>
            <Image
              source={STAR_ICON}
              style={styles.levelStar}
              contentFit="contain"
              accessibilityIgnoresInvertColors
            />
            <ThemedText
              lightColor={APP_SHELL_MAIN_TEXT_COLOR}
              darkColor={APP_SHELL_MAIN_TEXT_COLOR}
              style={styles.levelTitle}
              accessibilityRole="header"
            >
              Level {xp.level}
            </ThemedText>
            <ThemedText
              lightColor={APP_SHELL_LABEL_COLOR}
              darkColor={APP_SHELL_LABEL_COLOR}
              style={styles.levelXp}
            >
              {getXpRemainingToNextLevel(xp.lifetimeXp)} XP to Lv {xp.level + 1}
            </ThemedText>
          </View>
          <XpLevelBar
            fillPercent={getXpBarFillPercent(xp.lifetimeXp)}
            progressPercent={getXpProgressInCurrentLevelPercent(xp.lifetimeXp)}
            height={22}
          />
          <ThemedText
            lightColor={APP_SHELL_LABEL_COLOR}
            darkColor={APP_SHELL_LABEL_COLOR}
            style={styles.levelHint}
          >
            {totalLocked === 0
              ? "You've unlocked every item. New gear is on the way!"
              : `Items unlock on their own when you reach their level. Next up: ${nextCount} item${nextCount === 1 ? "" : "s"} at Level ${nextLevel}.`}
          </ThemedText>
        </View>

        {byCategory.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            style={styles.chipsScroll}
          >
            <FilterChip
              label="All"
              count={totalLocked}
              active={filter === "all"}
              onPress={() => setFilter("all")}
            />
            {byCategory.map(({ category, offers }) => (
              <FilterChip
                key={category.id}
                label={category.label}
                count={offers.length}
                active={filter === category.id}
                onPress={() => setFilter(category.id)}
              />
            ))}
          </ScrollView>
        ) : null}

        {visible.map(({ category, offers }) => (
          <View key={category.id} style={styles.section}>
            <View style={styles.sectionHeader} accessibilityRole="header">
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={styles.sectionTitle}
              >
                {category.label}
              </ThemedText>
              <ThemedText
                lightColor={APP_SHELL_LABEL_COLOR}
                darkColor={APP_SHELL_LABEL_COLOR}
                style={styles.sectionCount}
              >
                {offers.length} to unlock
              </ThemedText>
            </View>
            <View style={styles.grid}>
              {offers.map(({ offer, item }) => (
                <OfferCard
                  key={offer.itemId}
                  offer={offer}
                  item={item}
                  width={cardWidth}
                  levelsAway={offer.requiredLevel - xp.level}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function FilterChip({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}, ${count} items`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        lightColor={active ? APP_SHELL_MAIN_TEXT_COLOR : APP_SHELL_LABEL_COLOR}
        darkColor={active ? APP_SHELL_MAIN_TEXT_COLOR : APP_SHELL_LABEL_COLOR}
        style={styles.chipLabel}
      >
        {label} {count}
      </ThemedText>
    </Pressable>
  );
}

function OfferCard({
  offer,
  item,
  width,
  levelsAway,
}: {
  offer: PixelShopOffer;
  item: PixelItem;
  width: number;
  levelsAway: number;
}) {
  const thumb = width - 16;
  return (
    <View
      style={[styles.card, { width }]}
      accessible
      accessibilityLabel={`${offer.label}. Unlocks at level ${offer.requiredLevel}${
        levelsAway > 0 ? `, ${levelsAway} level${levelsAway === 1 ? "" : "s"} to go` : ""
      }`}
    >
      <View style={styles.thumbWell}>
        <PixelItemThumb item={item} size={thumb} dimmed />
        <View style={styles.levelBadge}>
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.levelBadgeText}
          >
            LV {offer.requiredLevel}
          </ThemedText>
        </View>
      </View>
      <ThemedText
        lightColor={APP_SHELL_MAIN_TEXT_COLOR}
        darkColor={APP_SHELL_MAIN_TEXT_COLOR}
        style={styles.cardLabel}
        numberOfLines={2}
      >
        {offer.label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 16,
  },
  levelCard: {
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: CARD_RIM,
    backgroundColor: CARD_FILL,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  levelStar: {
    width: 22,
    height: 22,
  },
  levelTitle: {
    flex: 1,
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    lineHeight: 20,
  },
  levelXp: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 13,
  },
  levelHint: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 15,
  },
  chipsScroll: {
    marginHorizontal: -SCREEN_PADDING,
    flexGrow: 0,
  },
  chips: {
    gap: 8,
    paddingHorizontal: SCREEN_PADDING,
  },
  chip: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: CARD_RIM,
    backgroundColor: TRACK_FILL,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    borderColor: CARD_RIM_ACTIVE,
    backgroundColor: CARD_RIM,
  },
  chipLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 13,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionCount: {
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  card: {
    padding: 6,
    gap: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: CARD_RIM,
    backgroundColor: CARD_FILL,
  },
  thumbWell: {
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: TRACK_FILL,
  },
  levelBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(1,26,58,0.85)",
    borderWidth: 1,
    borderColor: CARD_RIM_ACTIVE,
  },
  levelBadgeText: {
    fontFamily: FONT_FAMILY,
    fontSize: 7,
    lineHeight: 10,
  },
  cardLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 12,
    minHeight: 24,
    paddingHorizontal: 2,
  },
  pressed: {
    opacity: 0.8,
  },
});
