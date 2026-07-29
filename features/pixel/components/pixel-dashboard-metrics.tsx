import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { FloatingShellSurface } from "@/components/floating-shell-surface";
import { ThemedText } from "@/components/themed-text";
import { XpLevelBar } from "@/components/xp-level-bar";
import {
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_SECONDARY_BACKGROUND,
} from "@/constants/app-colors";
import { useDailyGoals } from "@/features/actions/daily-goals-context";
import { useHabitProgress } from "@/features/actions/habit-progress-context";
import { useXpState } from "@/features/xp/xp-state-context";
import { useDashboardHealthMetrics } from "@/hooks/use-dashboard-health-metrics";
import {
  getNextPixelLevel,
  getPixelLevel,
  getXpBarFillPercent,
  getXpRemainingToNextLevel,
} from "@/lib/xp-progress";

const CELL_HEADING_FONT_FAMILY = "PixeloidSans";

/** Inset from tile edge; includes shell gutter + padding inside the rect card. */
const METRIC_ICON_CORNER_INSET = 20;
const METRIC_ICON_CORNER_SIZE = 25;

const EM_DASH = "\u2014";

function formatIntMetric(value: number, active: boolean): string {
  return active ? String(Math.round(value)) : EM_DASH;
}

function formatGroupedInt(value: number, active: boolean): string {
  return active ? Math.round(value).toLocaleString("en-US") : EM_DASH;
}

function sleepPartsFromHours(hours: number): { h: number; m: number } {
  if (!Number.isFinite(hours) || hours <= 0) {
    return { h: 0, m: 0 };
  }
  const totalMinutes = Math.round(hours * 60);
  return {
    h: Math.floor(Math.abs(totalMinutes) / 60),
    m: Math.abs(totalMinutes) % 60,
  };
}

type ActionMetricRoute = "weight" | "steps" | "calories" | "sleep" | "water";

function pushActionRoute(id: ActionMetricRoute) {
  router.push(`/(tabs)/actions/${id}`);
}

/** Health + XP metric cards for the My Pixel dashboard. */
export function PixelDashboardMetrics() {
  const { metrics, connectivity } = useDashboardHealthMetrics();
  const { goals } = useDailyGoals();
  const { totals, isHydrated, refreshTotals } = useHabitProgress();
  const { xp, refreshXp } = useXpState();

  useFocusEffect(
    useCallback(() => {
      void refreshXp();
      void refreshTotals();
    }, [refreshXp, refreshTotals]),
  );

  const lifetimeXp = xp.lifetimeXp;
  const pixelLevel = getPixelLevel(lifetimeXp);
  const nextPixelLevel = getNextPixelLevel(lifetimeXp);
  const xpBarFillPercent = getXpBarFillPercent(lifetimeXp);
  const xpRemainingToNextLevel = getXpRemainingToNextLevel(lifetimeXp);

  const weightActive = isHydrated && totals.weight !== undefined;
  const waterUnitLabel = goals.waterUnit === "ml" ? "ML" : "OZ";
  const weightUnitLabel = goals.weightUnit === "kg" ? "KG" : "LBS";
  const sleep = sleepPartsFromHours(totals.sleepHours ?? 0);

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <View style={styles.metricTileWrapper}>
          <FloatingShellSurface
            gutterColor={APP_SHELL_SECONDARY_BACKGROUND}
            tileSource={require("@/assets/backgrounds/red-rect-card.png")}
          />
          <View style={styles.metricTileOverlay} pointerEvents="none">
            <View style={styles.metricTileBody}>
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={styles.metricTileTitle}
                numberOfLines={1}
              >
                Resting HR
              </ThemedText>
              <View style={styles.metricValueRow}>
                <ThemedText
                  lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                  darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                  style={styles.metricTileValue}
                >
                  {formatIntMetric(
                    metrics.restingHeartRateBpm,
                    connectivity.restingHeartRateBpm,
                  )}
                </ThemedText>
                {connectivity.restingHeartRateBpm ? (
                  <ThemedText
                    lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                    darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                    style={styles.metricTileUnit}
                  >
                    BPM
                  </ThemedText>
                ) : null}
              </View>
            </View>
            <Image
              source={require("@/assets/icons/heart.png")}
              style={[
                styles.metricIconCorner,
                !connectivity.restingHeartRateBpm &&
                  styles.metricIconCornerInactive,
              ]}
              contentFit="contain"
            />
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Weight"
          style={styles.metricTileWrapper}
          onPress={() => pushActionRoute("weight")}
        >
          <FloatingShellSurface
            gutterColor={APP_SHELL_SECONDARY_BACKGROUND}
            tileSource={require("@/assets/backgrounds/grey-rect-card.png")}
          />
          <View style={styles.metricTileOverlay} pointerEvents="none">
            <View style={styles.metricTileBody}>
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={styles.metricTileTitle}
                numberOfLines={1}
              >
                Weight
              </ThemedText>
              <View style={styles.metricValueRow}>
                <ThemedText
                  lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                  darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                  style={styles.metricTileValue}
                >
                  {formatIntMetric(totals.weight ?? 0, weightActive)}
                </ThemedText>
                {weightActive ? (
                  <ThemedText
                    lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                    darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                    style={styles.metricTileUnit}
                  >
                    {weightUnitLabel}
                  </ThemedText>
                ) : null}
              </View>
            </View>
            <Image
              source={require("@/assets/icons/scale.png")}
              style={[
                styles.metricIconCorner,
                !weightActive && styles.metricIconCornerInactive,
              ]}
              contentFit="contain"
            />
          </View>
        </Pressable>
      </View>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Steps"
          style={styles.metricTileWrapper}
          onPress={() => pushActionRoute("steps")}
        >
          <FloatingShellSurface
            gutterColor={APP_SHELL_SECONDARY_BACKGROUND}
            tileSource={require("@/assets/backgrounds/yellow-rect-card.png")}
          />
          <View style={styles.metricTileOverlay} pointerEvents="none">
            <View style={styles.metricTileBody}>
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={styles.metricTileTitle}
                numberOfLines={1}
              >
                Steps
              </ThemedText>
              <View style={styles.metricValueRow}>
                <ThemedText
                  lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                  darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                  style={styles.metricTileValue}
                >
                  {formatGroupedInt(totals.steps ?? 0, isHydrated)}
                </ThemedText>
                {isHydrated ? (
                  <ThemedText
                    lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                    darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                    style={styles.metricTileUnit}
                  >
                    STEPS
                  </ThemedText>
                ) : null}
              </View>
            </View>
            <Image
              source={require("@/assets/icons/lightning.png")}
              style={[
                styles.metricIconCorner,
                !isHydrated && styles.metricIconCornerInactive,
              ]}
              contentFit="contain"
            />
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Calories"
          style={styles.metricTileWrapper}
          onPress={() => pushActionRoute("calories")}
        >
          <FloatingShellSurface
            gutterColor={APP_SHELL_SECONDARY_BACKGROUND}
            tileSource={require("@/assets/backgrounds/orange-rect-card.png")}
          />
          <View style={styles.metricTileOverlay} pointerEvents="none">
            <View style={styles.metricTileBody}>
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={styles.metricTileTitle}
                numberOfLines={1}
              >
                Calories
              </ThemedText>
              <View style={styles.metricValueRow}>
                <ThemedText
                  lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                  darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                  style={styles.metricTileValue}
                >
                  {formatGroupedInt(totals.activeKcal ?? 0, isHydrated)}
                </ThemedText>
                {isHydrated ? (
                  <ThemedText
                    lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                    darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                    style={styles.metricTileUnit}
                  >
                    KCAL
                  </ThemedText>
                ) : null}
              </View>
            </View>
            <Image
              source={require("@/assets/icons/fire.png")}
              style={[
                styles.metricIconCorner,
                !isHydrated && styles.metricIconCornerInactive,
              ]}
              contentFit="contain"
            />
          </View>
        </Pressable>
      </View>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sleep"
          style={styles.metricTileWrapper}
          onPress={() => pushActionRoute("sleep")}
        >
          <FloatingShellSurface
            gutterColor={APP_SHELL_SECONDARY_BACKGROUND}
            tileSource={require("@/assets/backgrounds/purple-rect-card.png")}
          />
          <View style={styles.metricTileOverlay} pointerEvents="none">
            <View style={styles.metricTileBody}>
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={styles.metricTileTitle}
                numberOfLines={1}
              >
                Sleep
              </ThemedText>
              <View style={styles.metricValueRow}>
                {isHydrated ? (
                  <>
                    <ThemedText
                      lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                      darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                      style={styles.metricTileValue}
                    >
                      {sleep.h}
                    </ThemedText>
                    <ThemedText
                      lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                      darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                      style={styles.metricTileUnit}
                    >
                      H
                    </ThemedText>
                    {sleep.m > 0 ? (
                      <>
                        <ThemedText
                          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                          style={styles.metricTileValue}
                        >
                          {sleep.m}
                        </ThemedText>
                        <ThemedText
                          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                          style={styles.metricTileUnit}
                        >
                          M
                        </ThemedText>
                      </>
                    ) : null}
                  </>
                ) : (
                  <ThemedText
                    lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                    darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                    style={styles.metricTileValue}
                  >
                    {EM_DASH}
                  </ThemedText>
                )}
              </View>
            </View>
            <Image
              source={require("@/assets/icons/purple-moon.png")}
              style={[
                styles.metricIconCorner,
                !isHydrated && styles.metricIconCornerInactive,
              ]}
              contentFit="contain"
            />
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Water"
          style={styles.metricTileWrapper}
          onPress={() => pushActionRoute("water")}
        >
          <FloatingShellSurface
            gutterColor={APP_SHELL_SECONDARY_BACKGROUND}
            tileSource={require("@/assets/backgrounds/light-blue-rect-card.png")}
          />
          <View style={styles.metricTileOverlay} pointerEvents="none">
            <View style={styles.metricTileBody}>
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={styles.metricTileTitle}
                numberOfLines={1}
              >
                Water
              </ThemedText>
              <View style={styles.metricValueRow}>
                <ThemedText
                  lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                  darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                  style={styles.metricTileValue}
                >
                  {formatIntMetric(totals.waterAmount ?? 0, isHydrated)}
                </ThemedText>
                {isHydrated ? (
                  <ThemedText
                    lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                    darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                    style={styles.metricTileUnit}
                  >
                    {waterUnitLabel}
                  </ThemedText>
                ) : null}
              </View>
            </View>
            <Image
              source={require("@/assets/icons/water-drop.png")}
              style={[
                styles.metricIconCorner,
                !isHydrated && styles.metricIconCornerInactive,
              ]}
              contentFit="contain"
            />
          </View>
        </Pressable>
      </View>
      <View style={[styles.row, styles.rowFull]}>
        <View style={styles.xpTileWrapper}>
          <FloatingShellSurface
            gutterColor={APP_SHELL_SECONDARY_BACKGROUND}
            tileSource={require("@/assets/backgrounds/blue-rect-card.png")}
          />
          <View style={styles.xpTileOverlay} pointerEvents="none">
            <View style={styles.xpHeaderRow}>
              <View style={styles.xpHeaderLeft}>
                <Image
                  accessibilityIgnoresInvertColors
                  source={require("@/assets/icons/star.png")}
                  style={styles.xpHeaderStar}
                  contentFit="contain"
                />
                <ThemedText
                  lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                  darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                  style={styles.xpHeaderText}
                >
                  Level {pixelLevel}
                </ThemedText>
              </View>
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={styles.xpHeaderText}
              >
                {lifetimeXp.toLocaleString("en-US")}XP
              </ThemedText>
            </View>
            <XpLevelBar
              fillPercent={xpBarFillPercent}
              style={styles.xpBarRow}
            />
            <View style={styles.xpFooterRow}>
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={styles.xpFooterText}
              >
                {xpRemainingToNextLevel}XP to level {nextPixelLevel}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },

  row: {
    flex: 1,
    flexDirection: "row",
    minHeight: 0,
  },
  rowFull: {
    alignSelf: "stretch",
  },
  metricTileWrapper: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    position: "relative",
  },
  metricTileOverlay: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: 16,
    paddingHorizontal: 8,
  },
  /** Title + value row; inset so text does not sit under the corner icon. */
  metricTileBody: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    position: "relative",
    zIndex: 3,
  },
  metricTileTitle: {
    fontFamily: CELL_HEADING_FONT_FAMILY,
    fontSize: 16,
    lineHeight: 16,
    fontWeight: "600",
    paddingTop: 14,
    textAlign: "center",
  },
  metricTileValue: {
    fontFamily: CELL_HEADING_FONT_FAMILY,
    marginTop: 12,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
    textAlign: "center",
  },
  metricTileUnit: {
    fontFamily: CELL_HEADING_FONT_FAMILY,
    marginLeft: 0,
    marginTop: 12,
    fontSize: 16,
    lineHeight: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  metricValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  metricIconCorner: {
    position: "absolute",
    left: METRIC_ICON_CORNER_INSET,
    top: METRIC_ICON_CORNER_INSET,
    width: METRIC_ICON_CORNER_SIZE,
    height: METRIC_ICON_CORNER_SIZE,
    zIndex: 2,
  },
  /**
   * Inactive treatment when the metric isn't ready yet (or weight has no log).
   * Reads as low-contrast / desaturated via opacity for portable RN behavior.
   */
  metricIconCornerInactive: {
    opacity: 0.4,
  },
  xpTileWrapper: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    position: "relative",
  },
  xpTileOverlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 30,
    paddingVertical: 24,
    justifyContent: "space-between",
  },
  xpHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  xpHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  xpHeaderStar: {
    width: 25,
    height: 25,
    marginRight: 8,
  },
  xpHeaderText: {
    fontFamily: CELL_HEADING_FONT_FAMILY,
    fontSize: 18,
    lineHeight: 18,
    fontWeight: "600",
  },
  xpBarRow: {
    height: 28,
  },
  xpFooterRow: {
    alignItems: "flex-end",
  },
  xpFooterText: {
    fontFamily: CELL_HEADING_FONT_FAMILY,
    fontSize: 14,
    lineHeight: 14,
    fontWeight: "600",
  },
});
