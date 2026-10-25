import * as Haptics from "expo-haptics";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { PixelPanel, PixelPressablePanel } from "@/components/pixel-panel";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { useXpState } from "@/features/xp/xp-state-context";
import { XP_PER_LEVEL } from "@/lib/xp-progress";

import { getCollectionStats, RARITY_ORDER } from "../collection-stats";
import type { PixelLayerCategory } from "../data";
import { RARITY_COLORS, RARITY_LABELS } from "../item-origin";
import { getPixelItem } from "../layer-assets";
import { usePixelLoadout } from "../pixel-loadout-context";
import { PixelItemThumb } from "./pixel-item-thumb";

const CELL_HEADING_FONT_FAMILY = "PixeloidSans";
const TRACK = "#011a3a";
const OUTLINE = "#000a1c";
const GOLD = "#FFD23F";
const GREEN = "#7CFFB2";

type Props = {
  onSelectCategory: (category: PixelLayerCategory) => void;
};

/**
 * The collection: everything earned by showing up. A completion summary with
 * a rarity breakdown, the next item within reach, then one tile per layer
 * (tap to wear something from it).
 */
export function PixelCollection({ onSelectCategory }: Props) {
  const { inventory, loadout, gender } = usePixelLoadout();
  const { xp } = useXpState();
  const stats = useMemo(
    () =>
      getCollectionStats({ inventory, loadout, gender, level: xp.level }),
    [inventory, loadout, gender, xp.level],
  );
  const percent = stats.total > 0 ? (stats.owned / stats.total) * 100 : 0;

  const next = stats.nextUnlock;
  const xpToNext =
    next != null ? Math.max(0, next.level * XP_PER_LEVEL - xp.lifetimeXp) : 0;
  const nextLevelStart = next != null ? (next.level - 1) * XP_PER_LEVEL : 0;
  const nextProgress =
    next != null
      ? Math.min(
          100,
          Math.max(
            0,
            ((xp.lifetimeXp - nextLevelStart) / XP_PER_LEVEL) * 100,
          ),
        )
      : 0;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Summary */}
      <PixelPanel
        frame="gold"
        style={styles.summary}
        accessible
        accessibilityLabel={`Collection ${Math.round(percent)} percent complete. ${stats.owned} of ${stats.total} items.`}
      >
        <View style={styles.summaryTop}>
          <View style={styles.summaryTitleBlock}>
            <Text style={styles.kicker}>YOUR COLLECTION</Text>
            <Text style={styles.summaryCount}>
              {stats.owned}
              <Text style={styles.summaryTotal}> / {stats.total}</Text>
            </Text>
          </View>
          <View style={styles.percentBadge}>
            <Text style={styles.percentText}>{Math.round(percent)}%</Text>
          </View>
        </View>
        <Bar percent={percent} color={GOLD} height={12} />
        <View style={styles.rarityRow}>
          {RARITY_ORDER.filter((rarity) => stats.byRarity[rarity].total > 0).map(
            (rarity) => {
              const { owned, total } = stats.byRarity[rarity];
              return (
                <PixelPanel key={rarity} frame="well" style={styles.rarityChip}>
                  <View
                    style={[styles.rarityDot, { backgroundColor: RARITY_COLORS[rarity] }]}
                  />
                  <Text style={styles.rarityLabel}>{RARITY_LABELS[rarity]}</Text>
                  <Text style={[styles.rarityCount, { color: RARITY_COLORS[rarity] }]}>
                    {owned}/{total}
                  </Text>
                </PixelPanel>
              );
            },
          )}
        </View>
      </PixelPanel>

      {/* Next unlock */}
      {next != null ? (
        <PixelPanel
          frame="green"
          style={styles.nextCard}
          accessible
          accessibilityLabel={`Next unlock: ${next.item.label} at level ${next.level}. ${xpToNext} XP to go.`}
        >
          <PixelPanel frame="well" style={styles.thumbWell}>
            <View style={styles.nextThumbClip}>
              <PixelItemThumb item={next.item} size={60} wearer={loadout} dimmed />
              <View style={styles.lock}>
                <Text style={styles.lockText}>LV {next.level}</Text>
              </View>
            </View>
          </PixelPanel>
          <View style={styles.nextText}>
            <Text style={styles.kicker}>NEXT UNLOCK</Text>
            <Text numberOfLines={1} style={styles.nextName}>
              {next.item.label}
            </Text>
            <Bar percent={nextProgress} color={GREEN} height={8} />
            <Text style={styles.nextHint}>
              {xpToNext.toLocaleString("en-US")} XP to go · log anything to earn XP
            </Text>
          </View>
        </PixelPanel>
      ) : null}

      {stats.lockedRewards.length > 0 ? (
        <PixelPanel frame="purple" style={styles.rewardsCard}>
          <Text style={styles.kicker}>EARNED ONLY</Text>
          <Text style={styles.rewardsBody}>
            {stats.lockedRewards.length === 1
              ? "1 special item can't"
              : `${stats.lockedRewards.length} special items can't`}{" "}
            be bought. Hit weight-journey milestones to win{" "}
            {listLabels(stats.lockedRewards.map((item) => item.label))}.
          </Text>
        </PixelPanel>
      ) : null}

      {/* Layers */}
      <Text style={styles.sectionLabel}>CATEGORIES</Text>
      <View style={styles.grid}>
        {stats.layers.map((layer) => {
          const equippedId = loadout[layer.layerId];
          const equipped = equippedId != null ? getPixelItem(equippedId) : undefined;
          const complete = layer.total > 0 && layer.owned >= layer.total;
          const layerPercent = layer.total > 0 ? (layer.owned / layer.total) * 100 : 0;
          return (
            <PixelPressablePanel
              key={layer.layerId}
              frame={complete ? "gold" : "blue"}
              accessibilityRole="button"
              accessibilityLabel={`${layer.label}, ${layer.owned} of ${layer.total} collected`}
              accessibilityHint="Choose what to wear"
              onPress={() => {
                void Haptics.selectionAsync();
                onSelectCategory({ id: layer.layerId, label: layer.label });
              }}
              style={styles.tile}
            >
              <PixelPanel frame="well" style={styles.thumbWell}>
                <View style={styles.tileThumb}>
                  {equipped != null ? (
                    <PixelItemThumb item={equipped} size={44} wearer={loadout} />
                  ) : null}
                </View>
              </PixelPanel>
              <View style={styles.tileText}>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  style={styles.tileLabel}
                >
                  {layer.label}
                </Text>
                <Text style={[styles.tileCount, complete && { color: GOLD }]}>
                  {complete ? "COMPLETE" : `${layer.owned}/${layer.total}`}
                </Text>
                <Bar
                  percent={layerPercent}
                  color={complete ? GOLD : "#4DA3FF"}
                  height={5}
                />
              </View>
            </PixelPressablePanel>
          );
        })}
      </View>
    </ScrollView>
  );
}

/** "A", "A and B", "A, B and C". */
function listLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

function Bar({
  percent,
  color,
  height,
}: {
  percent: number;
  color: string;
  height: number;
}) {
  return (
    <View style={[styles.barTrack, { height: height + 4 }]}>
      <View
        style={{
          width: `${Math.max(percent > 0 ? 4 : 0, Math.min(100, percent))}%`,
          height: "100%",
          backgroundColor: color,
        }}
      >
        {/* Top-row shine, like an old HP bar. */}
        <View style={styles.barShine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 18,
    paddingBottom: 32,
    gap: 12,
  },
  kicker: {
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 11,
    letterSpacing: 0.5,
    color: APP_SHELL_LABEL_COLOR,
  },
  summary: {
    padding: 16,
    gap: 10,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryTitleBlock: {
    flex: 1,
    gap: 6,
  },
  summaryCount: {
    fontFamily: FONT_FAMILY,
    fontSize: 22,
    lineHeight: 28,
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
  summaryTotal: {
    fontSize: 13,
    color: APP_SHELL_LABEL_COLOR,
  },
  percentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: GOLD,
    borderWidth: 2,
    borderColor: OUTLINE,
  },
  percentText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 15,
    color: "#02284f",
  },
  rarityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  rarityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  rarityDot: {
    width: 6,
    height: 6,
  },
  rarityLabel: {
    fontFamily: CELL_HEADING_FONT_FAMILY,
    fontSize: 11,
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
  rarityCount: {
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 10,
  },
  nextCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  /** Recessed slot a thumbnail sits in. */
  thumbWell: {
    padding: 4,
  },
  nextThumbClip: {
    overflow: "hidden",
  },
  lock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 2,
    alignItems: "center",
    backgroundColor: "rgba(1, 26, 58, 0.85)",
  },
  lockText: {
    fontFamily: FONT_FAMILY,
    fontSize: 7,
    lineHeight: 9,
    color: GREEN,
  },
  nextText: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  nextName: {
    fontFamily: CELL_HEADING_FONT_FAMILY,
    fontSize: 17,
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
  nextHint: {
    fontFamily: CELL_HEADING_FONT_FAMILY,
    fontSize: 12,
    color: APP_SHELL_LABEL_COLOR,
  },
  rewardsCard: {
    padding: 16,
    gap: 6,
  },
  rewardsBody: {
    fontFamily: CELL_HEADING_FONT_FAMILY,
    fontSize: 13,
    lineHeight: 18,
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
  sectionLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 12,
    color: APP_SHELL_LABEL_COLOR,
    marginTop: 6,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tile: {
    width: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
  },
  tileThumb: {
    width: 44,
    height: 44,
    overflow: "hidden",
  },
  tileText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  tileLabel: {
    fontFamily: CELL_HEADING_FONT_FAMILY,
    fontSize: 14,
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
  tileCount: {
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 10,
    color: APP_SHELL_LABEL_COLOR,
  },
  /** Square pixel bar: black outline, flat fill, a lighter top row. */
  barTrack: {
    alignSelf: "stretch",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: OUTLINE,
    backgroundColor: TRACK,
  },
  barShine: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
});
