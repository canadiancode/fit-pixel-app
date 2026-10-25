import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { PixelPanel, PixelPressablePanel } from "@/components/pixel-panel";
import { ThemedText } from "@/components/themed-text";
import { XpLevelBar } from "@/components/xp-level-bar";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_SECONDARY_BACKGROUND,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import {
  listCatalogByLayer,
  type CatalogEntry,
} from "@/features/pixel/collection-stats";
import { PixelItemThumb } from "@/features/pixel/components/pixel-item-thumb";
import { PixelSubScreenToolbar } from "@/features/pixel/components/pixel-sub-screen-toolbar";
import { usePixelLoadout } from "@/features/pixel/pixel-loadout-context";
import type { PixelLayerId, PixelLoadout } from "@/features/pixel/types";
import { useXpState } from "@/features/xp/xp-state-context";
import {
  getXpBarFillPercent,
  getXpProgressInCurrentLevelPercent,
  getXpRemainingToNextLevel,
} from "@/lib/xp-progress";

const STAR_ICON = require("@/assets/icons/star.png");

const CARD_RIM_ACTIVE = "#2f86e8";
const OUTLINE = "#000a1c";
/** Card padding plus the thumbnail well's own padding, per side. */
const CARD_PADDING = 8;
const WELL_PADDING = 4;

const GRID_GAP = 10;
const GRID_COLUMNS = 3;
const SCREEN_PADDING = 16;

type CategoryFilter = PixelLayerId | "all";

/** Locked first (level unlocks by level, then rewards), owned last. */
function entryOrder(a: CatalogEntry, b: CatalogEntry): number {
  if (a.owned !== b.owned) return a.owned ? 1 : -1;
  const al = a.origin.unlockLevel ?? Number.MAX_SAFE_INTEGER;
  const bl = b.origin.unlockLevel ?? Number.MAX_SAFE_INTEGER;
  return al - bl || a.item.label.localeCompare(b.item.label);
}

/**
 * Every item this Pixel can wear, by the same categories as Customize, with
 * the ones still locked first and how each is earned. Level items land in
 * your inventory on their own (see PixelLoadoutProvider); weight rewards come
 * from the weight journey. There's nothing to tap to unlock.
 */
export default function PixelShopScreen() {
  const router = useRouter();
  const { xp } = useXpState();
  const { inventory, gender, loadout } = usePixelLoadout();
  const { width: windowWidth } = useWindowDimensions();
  const [panelWidth, setPanelWidth] = useState(windowWidth);
  const [filter, setFilter] = useState<CategoryFilter>("all");

  const byCategory = useMemo(
    () =>
      listCatalogByLayer({ inventory, loadout, gender, level: xp.level })
        .filter(({ entries }) => entries.length > 0)
        .map((group) => ({
          ...group,
          entries: [...group.entries].sort(entryOrder),
          locked: group.entries.filter((e) => !e.owned).length,
        })),
    [inventory, loadout, gender, xp.level],
  );

  const visible =
    filter === "all"
      ? byCategory
      : byCategory.filter(({ layerId }) => layerId === filter);
  const locked = byCategory.flatMap((g) => g.entries.filter((e) => !e.owned));
  const levelLocked = locked.filter((e) => e.origin.unlockLevel != null);
  const rewardsLocked = locked.length - levelLocked.length;
  const nextLevel = Math.min(...levelLocked.map((e) => e.origin.unlockLevel!));
  const nextCount = levelLocked.filter((e) => e.origin.unlockLevel === nextLevel).length;
  const levelHint =
    levelLocked.length > 0
      ? `Items unlock on their own when you reach their level. Next up: ${nextCount} item${nextCount === 1 ? "" : "s"} at Level ${nextLevel}.`
      : rewardsLocked > 0
        ? `Every level item is yours. ${rewardsLocked} reward${rewardsLocked === 1 ? "" : "s"} left: hit your weight milestones and goal weight.`
        : "You've unlocked every item. New gear is on the way!";

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
        <PixelPanel style={styles.levelCard}>
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
            {levelHint}
          </ThemedText>
        </PixelPanel>

        {byCategory.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            style={styles.chipsScroll}
          >
            <FilterChip
              label="All"
              count={locked.length}
              active={filter === "all"}
              onPress={() => setFilter("all")}
            />
            {byCategory.map(({ layerId, label, locked: count }) => (
              <FilterChip
                key={layerId}
                label={label}
                count={count}
                active={filter === layerId}
                onPress={() => setFilter(layerId)}
              />
            ))}
          </ScrollView>
        ) : null}

        {visible.map(({ layerId, label, entries, locked: count }) => (
          <View key={layerId} style={styles.section}>
            <View style={styles.sectionHeader} accessibilityRole="header">
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={styles.sectionTitle}
              >
                {label}
              </ThemedText>
              <ThemedText
                lightColor={APP_SHELL_LABEL_COLOR}
                darkColor={APP_SHELL_LABEL_COLOR}
                style={styles.sectionCount}
              >
                {count > 0
                  ? `${count} to unlock · ${entries.length - count}/${entries.length}`
                  : `All ${entries.length} unlocked`}
              </ThemedText>
            </View>
            <View style={styles.grid}>
              {entries.map((entry) => (
                <ItemCard
                  key={entry.item.id}
                  entry={entry}
                  width={cardWidth}
                  wearer={loadout}
                  level={xp.level}
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
    <PixelPressablePanel
      frame={active ? "button" : "blue"}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}, ${count} items`}
      onPress={onPress}
      style={styles.chip}
    >
      <ThemedText
        lightColor={active ? APP_SHELL_MAIN_TEXT_COLOR : APP_SHELL_LABEL_COLOR}
        darkColor={active ? APP_SHELL_MAIN_TEXT_COLOR : APP_SHELL_LABEL_COLOR}
        style={styles.chipLabel}
      >
        {label} {count}
      </ThemedText>
    </PixelPressablePanel>
  );
}

function ItemCard({
  entry,
  width,
  wearer,
  level,
}: {
  entry: CatalogEntry;
  width: number;
  wearer: PixelLoadout;
  level: number;
}) {
  const { item, owned, origin } = entry;
  const thumb = width - (CARD_PADDING + WELL_PADDING) * 2;
  const levelsAway =
    origin.unlockLevel != null ? origin.unlockLevel - level : 0;
  const a11yState = owned
    ? "Unlocked"
    : `${origin.description}${
        levelsAway > 0 ? `, ${levelsAway} level${levelsAway === 1 ? "" : "s"} to go` : ""
      }`;
  return (
    <PixelPanel
      style={[styles.card, owned && styles.cardOwned, { width }]}
      accessible
      accessibilityLabel={`${item.label}. ${a11yState}`}
    >
      <PixelPanel frame="well" style={styles.thumbWell}>
        <PixelItemThumb item={item} size={thumb} wearer={wearer} dimmed={!owned} />
        <View style={[styles.levelBadge, owned && styles.ownedBadge]}>
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.levelBadgeText}
          >
            {owned ? "✓" : origin.badge}
          </ThemedText>
        </View>
      </PixelPanel>
      <ThemedText
        lightColor={APP_SHELL_MAIN_TEXT_COLOR}
        darkColor={APP_SHELL_MAIN_TEXT_COLOR}
        style={styles.cardLabel}
        numberOfLines={2}
      >
        {item.label}
      </ThemedText>
      {!owned && origin.unlockLevel == null ? (
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.cardHint}
          numberOfLines={2}
        >
          {origin.description}
        </ThemedText>
      ) : null}
    </PixelPanel>
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
    padding: 16,
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
    height: 38,
    paddingVertical: 0,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
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
    padding: CARD_PADDING,
    gap: 6,
  },
  cardOwned: {
    opacity: 0.75,
  },
  thumbWell: {
    padding: WELL_PADDING,
  },
  /** Square pixel tag in the thumbnail's corner. */
  levelBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: CARD_RIM_ACTIVE,
    borderWidth: 2,
    borderColor: OUTLINE,
  },
  ownedBadge: {
    backgroundColor: "#2f9e44",
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
  cardHint: {
    fontFamily: FONT_FAMILY,
    fontSize: 7,
    lineHeight: 10,
    paddingHorizontal: 2,
  },
});
