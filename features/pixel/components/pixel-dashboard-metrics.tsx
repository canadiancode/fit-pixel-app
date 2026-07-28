import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { StyleSheet, View } from "react-native";

import { FloatingShellSurface } from "@/components/floating-shell-surface";
import { ThemedText } from "@/components/themed-text";
import { XpLevelBar } from "@/components/xp-level-bar";
import {
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_SECONDARY_BACKGROUND,
} from "@/constants/app-colors";
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

function formatIntMetric(value: number, connected: boolean): string {
  return connected ? String(value) : EM_DASH;
}

function formatGroupedInt(value: number, connected: boolean): string {
  return connected ? value.toLocaleString("en-US") : EM_DASH;
}

/** Health + XP metric cards for the My Pixel dashboard. */
export function PixelDashboardMetrics() {
  const { metrics, connectivity } = useDashboardHealthMetrics();
  const { xp, refreshXp } = useXpState();

  useFocusEffect(
    useCallback(() => {
      void refreshXp();
    }, [refreshXp]),
  );

  const lifetimeXp = xp.lifetimeXp;
  const pixelLevel = getPixelLevel(lifetimeXp);
  const nextPixelLevel = getNextPixelLevel(lifetimeXp);
  const xpBarFillPercent = getXpBarFillPercent(lifetimeXp);
  const xpRemainingToNextLevel = getXpRemainingToNextLevel(lifetimeXp);

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
      <View style={styles.metricTileWrapper}>
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
                {formatIntMetric(metrics.weightLbs, connectivity.weightLbs)}
              </ThemedText>
              {connectivity.weightLbs ? (
                <ThemedText
                  lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                  darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                  style={styles.metricTileUnit}
                >
                  LBS
                </ThemedText>
              ) : null}
            </View>
          </View>
          <Image
            source={require("@/assets/icons/scale.png")}
            style={[
              styles.metricIconCorner,
              !connectivity.weightLbs && styles.metricIconCornerInactive,
            ]}
            contentFit="contain"
          />
        </View>
      </View>
    </View>
    <View style={styles.row}>
      <View style={styles.metricTileWrapper}>
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
                {formatGroupedInt(metrics.steps, connectivity.steps)}
              </ThemedText>
              {connectivity.steps ? (
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
              !connectivity.steps && styles.metricIconCornerInactive,
            ]}
            contentFit="contain"
          />
        </View>
      </View>
      <View style={styles.metricTileWrapper}>
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
                {formatGroupedInt(
                  metrics.activeEnergyKcal,
                  connectivity.activeEnergyKcal,
                )}
              </ThemedText>
              {connectivity.activeEnergyKcal ? (
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
              !connectivity.activeEnergyKcal &&
                styles.metricIconCornerInactive,
            ]}
            contentFit="contain"
          />
        </View>
      </View>
    </View>
    <View style={styles.row}>
      <View style={styles.metricTileWrapper}>
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
              {connectivity.sleep ? (
                <>
                  <ThemedText
                    lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                    darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                    style={styles.metricTileValue}
                  >
                    {metrics.sleepHours}
                  </ThemedText>
                  <ThemedText
                    lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                    darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                    style={styles.metricTileUnit}
                  >
                    H
                  </ThemedText>
                  <ThemedText
                    lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                    darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                    style={styles.metricTileValue}
                  >
                    {metrics.sleepMinutes}
                  </ThemedText>
                  <ThemedText
                    lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                    darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                    style={styles.metricTileUnit}
                  >
                    M
                  </ThemedText>
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
              !connectivity.sleep && styles.metricIconCornerInactive,
            ]}
            contentFit="contain"
          />
        </View>
      </View>
      <View style={styles.metricTileWrapper}>
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
                {formatIntMetric(metrics.waterOz, connectivity.waterOz)}
              </ThemedText>
              {connectivity.waterOz ? (
                <ThemedText
                  lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                  darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                  style={styles.metricTileUnit}
                >
                  OZ
                </ThemedText>
              ) : null}
            </View>
          </View>
          <Image
            source={require("@/assets/icons/water-drop.png")}
            style={[
              styles.metricIconCorner,
              !connectivity.waterOz && styles.metricIconCornerInactive,
            ]}
            contentFit="contain"
          />
        </View>
      </View>
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
   * "Inactive" treatment when the corresponding HealthKit metric hasn't connected.
   * Reads as low-contrast / desaturated, equivalent intent to `filter: contrast(0.5)`,
   * but uses opacity for portable behavior across RN versions and platforms.
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
