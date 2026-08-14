import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  getBarChartTheme,
  type BarChartThemeTokens,
} from "@/components/charts/bar-chart-themes";
import type {
  BarChartThemeId,
  BarChartUserData,
} from "@/components/charts/bar-chart-types";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import {
  formatBarChartYAxisLabel,
  generateMarkers,
  percentHeightFromBottom,
} from "@/lib/bar-chart-scale";

/** Pixel `bottom` for horizontal rules (same math as `bottom: %` in `bar-chart.html`). */
function bottomPxForValue(
  value: number,
  innerHeightPx: number,
  lowestMarker: number,
  highestMarker: number,
): number {
  const pct = percentHeightFromBottom(value, lowestMarker, highestMarker);
  return (pct / 100) * innerHeightPx;
}

/** Matches `#test-container` / `#data` vertical space in `bar-chart.html`. */
export const BAR_CHART_PLOT_HEIGHT = 300;

const CHART_OUTER_PADDING = 7;
const CHART_MIN_WIDTH = 300;
const Y_AXIS_WIDTH = 50;
const X_AXIS_HEIGHT = 15;
const DATA_PADDING_TOP = 0;
/** Symmetric with top inset on `#data` (see DevTools: `padding-bottom: 7px`). */
const DATA_PADDING_BOTTOM = 7;
const BAR_BORDER_RADIUS = 7;
const GRID_STROKE_WIDTH = 2;
const BAR_BORDER_WIDTH = 1;
const X_LABEL_MIN_WIDTH = 40;
const BAR_WIDTH_PERCENT = 0.05;
const BAR_MIN_WIDTH = 25;
/** Minimum column slot so x labels stay one line when the series is long. */
const MIN_CATEGORY_SLOT_WIDTH = X_LABEL_MIN_WIDTH;
/** Vertical gap between the goal line and the target value label (text sits above the line). */
const TARGET_VALUE_GAP_ABOVE_LINE_PX = 2;

export type BarChartProps = {
  userData: BarChartUserData;
  /** Goal line value. Omit to hide the target line and label. */
  targetVal?: number;
  increment: number;
  theme: BarChartThemeId;
  /** Appended to the on-chart target label (e.g. `" oz"` → `90 oz`). Ignored when `targetLabel` is set. */
  targetLabelSuffix?: string;
  /** Full on-chart goal label; when set, overrides `String(targetVal) + (targetLabelSuffix ?? "")`. */
  targetLabel?: string;
  /**
   * When `true`, Y-axis starts at 0. When `false`, the floor is the data minimum snapped to
   * `increment` (original HTML chart behavior).
   */
  yDomainFromZero?: boolean;
  /** Defaults to a short summary when omitted. */
  accessibilityLabel?: string;
};

/**
 * Pure series + Y scale for the bar chart (caller-driven `increment`, like the HTML prototype).
 */
export function buildBarChartLayout(
  userData: BarChartUserData,
  targetVal: number | undefined,
  increment: number,
  yDomainFromZero = false,
) {
  const count = Math.min(userData.x.length, userData.y.length);
  const xLabels = userData.x.slice(0, count);
  const yValues = userData.y.slice(0, count);
  const scale = generateMarkers(yValues, increment, yDomainFromZero, targetVal);
  return { xLabels, yValues, scale, targetVal, count };
}

type PlotGuidesProps = {
  markerValues: number[];
  innerHeight: number;
  lowestMarker: number;
  highestMarker: number;
  targetBottomPx?: number;
  targetLabelText?: string;
  tokens: BarChartThemeTokens;
};

function PlotGuides({
  markerValues,
  innerHeight,
  lowestMarker,
  highestMarker,
  targetBottomPx,
  targetLabelText,
  tokens,
}: PlotGuidesProps) {
  const showTarget =
    targetBottomPx !== undefined && targetLabelText !== undefined;
  return (
    <>
      <View
        pointerEvents="none"
        style={[styles.plotGuideLayer, { height: innerHeight, zIndex: 1 }]}
      >
        {markerValues.map((markerValue) => (
          <View
            key={`grid-${String(markerValue)}`}
            collapsable={false}
            style={[
              styles.chartMarkerBar,
              {
                bottom: bottomPxForValue(
                  markerValue,
                  innerHeight,
                  lowestMarker,
                  highestMarker,
                ),
                borderTopColor: tokens.gridLine,
              },
            ]}
          />
        ))}
      </View>
      {showTarget ? (
        <View
          pointerEvents="none"
          style={[styles.plotGuideLayer, { height: innerHeight, zIndex: 3 }]}
        >
          <View
            collapsable={false}
            style={[
              styles.chartTargetBar,
              {
                bottom: targetBottomPx,
                borderTopColor: tokens.targetLine,
              },
            ]}
          />
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.plotTargetLabel,
              {
                bottom: targetBottomPx + TARGET_VALUE_GAP_ABOVE_LINE_PX,
                color: APP_SHELL_MAIN_TEXT_COLOR,
              },
            ]}
          >
            {targetLabelText}
          </Text>
        </View>
      ) : null}
    </>
  );
}

function barColumnStyle(
  heightPx: number,
  barWidth: number,
  tokens: BarChartThemeTokens,
) {
  return {
    width: barWidth,
    height: Math.max(0, heightPx),
    backgroundColor: tokens.barFill,
    borderColor: tokens.barBorder,
    borderWidth: BAR_BORDER_WIDTH,
    borderTopLeftRadius: BAR_BORDER_RADIUS,
    borderTopRightRadius: BAR_BORDER_RADIUS,
  };
}

export function BarChart({
  userData,
  targetVal,
  increment,
  theme,
  targetLabelSuffix,
  targetLabel: targetLabelOverride,
  yDomainFromZero = false,
  accessibilityLabel: accessibilityLabelProp,
}: BarChartProps) {
  const [plotWidth, setPlotWidth] = useState(0);
  const tokens = getBarChartTheme(theme);

  const layout = useMemo(
    () => buildBarChartLayout(userData, targetVal, increment, yDomainFromZero),
    [userData, targetVal, increment, yDomainFromZero],
  );

  const { xLabels, yValues, scale, count } = layout;
  const { markerValues, lowestMarker, highestMarker } = scale;

  const innerHeight =
    BAR_CHART_PLOT_HEIGHT - DATA_PADDING_TOP - DATA_PADDING_BOTTOM;
  const targetValue =
    targetVal !== undefined && Number.isFinite(targetVal) ? targetVal : undefined;
  const hasTarget = targetValue !== undefined;
  const targetBottomPx = hasTarget
    ? bottomPxForValue(targetValue, innerHeight, lowestMarker, highestMarker)
    : undefined;
  const estimatedPlotMin =
    CHART_MIN_WIDTH - Y_AXIS_WIDTH - CHART_OUTER_PADDING * 2;
  const measuredPlot = plotWidth > 0 ? plotWidth : estimatedPlotMin;
  const needsScroll = count * MIN_CATEGORY_SLOT_WIDTH > measuredPlot + 0.5;
  const contentWidth = needsScroll
    ? count * MIN_CATEGORY_SLOT_WIDTH
    : plotWidth;
  const barWidth = needsScroll
    ? BAR_MIN_WIDTH
    : Math.max(
        BAR_MIN_WIDTH,
        plotWidth > 0 ? plotWidth * BAR_WIDTH_PERCENT : BAR_MIN_WIDTH,
      );

  const targetLabelText = hasTarget
    ? (targetLabelOverride ??
      `${String(targetValue)}${targetLabelSuffix ?? ""}`)
    : undefined;

  const accessibilityLabel =
    accessibilityLabelProp ??
    (count > 0
      ? hasTarget
        ? `Bar chart, ${String(count)} columns, target ${targetLabelText}`
        : `Bar chart, ${String(count)} columns`
      : "Bar chart, no data");

  if (__DEV__ && userData.x.length !== userData.y.length) {
    console.warn(
      "[BarChart] userData.x and userData.y length mismatch; using the first min(x,y) pairs.",
    );
  }

  const guides = (
    <PlotGuides
      markerValues={markerValues}
      innerHeight={innerHeight}
      lowestMarker={lowestMarker}
      highestMarker={highestMarker}
      targetBottomPx={targetBottomPx}
      targetLabelText={targetLabelText}
      tokens={tokens}
    />
  );

  const bars = count === 0
    ? null
    : yValues.map((yValue, index) => {
        const hPct = percentHeightFromBottom(
          yValue,
          lowestMarker,
          highestMarker,
        );
        const heightPx = (hPct / 100) * innerHeight;
        if (!needsScroll) {
          return (
            <View
              key={`bar-${xLabels[index] ?? String(index)}-${String(index)}`}
              style={barColumnStyle(heightPx, barWidth, tokens)}
            />
          );
        }
        return (
          <View
            key={`bar-${xLabels[index] ?? String(index)}-${String(index)}`}
            style={styles.scrollSlot}
          >
            <View style={barColumnStyle(heightPx, barWidth, tokens)} />
          </View>
        );
      });

  const onPlotLayout = (width: number) => {
    if (width !== plotWidth) {
      setPlotWidth(width);
    }
  };

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      importantForAccessibility="yes"
      pointerEvents={needsScroll ? "auto" : "none"}
      style={styles.outer}
    >
      <View style={styles.chartRow}>
        <View
          style={[
            styles.yAxis,
            { width: Y_AXIS_WIDTH, height: BAR_CHART_PLOT_HEIGHT },
          ]}
        >
          {markerValues.map((markerValue) => (
            <Text
              key={`y-${String(markerValue)}`}
              style={[styles.yAxisLabel, { color: tokens.axisText }]}
            >
              {formatBarChartYAxisLabel(markerValue)}
            </Text>
          ))}
        </View>

        <View
          onLayout={(e) => {
            onPlotLayout(e.nativeEvent.layout.width);
          }}
          style={styles.plotColumn}
        >
          {needsScroll ? (
            <>
              <ScrollView
                horizontal
                nestedScrollEnabled
                directionalLockEnabled
                showsHorizontalScrollIndicator
                style={styles.plotScroll}
              >
                <View style={{ width: contentWidth }}>
                  <View
                    style={[
                      styles.dataArea,
                      {
                        width: contentWidth,
                        height: BAR_CHART_PLOT_HEIGHT,
                        paddingTop: DATA_PADDING_TOP,
                        paddingBottom: DATA_PADDING_BOTTOM,
                      },
                    ]}
                  >
                    <View style={[styles.barsRow, styles.scrollBarsRow, { width: contentWidth }]}>
                      {bars}
                    </View>
                  </View>
                  <View style={[styles.scrollXValues, { width: contentWidth }]}>
                    {xLabels.map((label, index) => (
                      <Text
                        key={`x-${String(index)}-${label}`}
                        numberOfLines={1}
                        style={[
                          styles.xAxisLabel,
                          styles.scrollXLabel,
                          { color: tokens.axisText },
                        ]}
                      >
                        {label}
                      </Text>
                    ))}
                  </View>
                </View>
              </ScrollView>
              <View
                pointerEvents="none"
                style={[
                  styles.stickyGuides,
                  {
                    height: BAR_CHART_PLOT_HEIGHT,
                    paddingTop: DATA_PADDING_TOP,
                    paddingBottom: DATA_PADDING_BOTTOM,
                  },
                ]}
              >
                {guides}
              </View>
            </>
          ) : (
            <View
              style={[
                styles.dataArea,
                {
                  height: BAR_CHART_PLOT_HEIGHT,
                  paddingTop: DATA_PADDING_TOP,
                  paddingBottom: DATA_PADDING_BOTTOM,
                },
              ]}
            >
              {guides}
              <View style={styles.barsRow}>{bars}</View>
            </View>
          )}
        </View>
      </View>

      {needsScroll ? null : (
        <View style={styles.xAxisRow}>
          <View style={{ width: Y_AXIS_WIDTH }} />
          <View style={styles.xValues}>
            {xLabels.map((label, index) => (
              <Text
                key={`x-${String(index)}-${label}`}
                numberOfLines={1}
                style={[
                  styles.xAxisLabel,
                  {
                    color: tokens.axisText,
                    minWidth: X_LABEL_MIN_WIDTH,
                  },
                ]}
              >
                {label}
              </Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignSelf: "stretch",
    minWidth: CHART_MIN_WIDTH,
    width: "100%",
    padding: CHART_OUTER_PADDING,
  },
  chartRow: {
    flexDirection: "row",
    width: "100%",
    minHeight: BAR_CHART_PLOT_HEIGHT,
    alignItems: "flex-start",
  },
  yAxis: {
    flexDirection: "column-reverse",
    justifyContent: "space-between",
  },
  yAxisLabel: {
    margin: 0,
    textAlign: "center",
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 14,
  },
  /** Target value: top-left of plot, bottom edge on the goal line (outside Y-axis gutter). */
  plotTargetLabel: {
    position: "absolute",
    left: 4,
    textAlign: "left",
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "700",
    zIndex: 4,
  },
  plotColumn: {
    flex: 1,
    minWidth: 0,
    minHeight: BAR_CHART_PLOT_HEIGHT,
    position: "relative",
    overflow: "hidden",
  },
  plotScroll: {
    height: BAR_CHART_PLOT_HEIGHT + X_AXIS_HEIGHT,
  },
  stickyGuides: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 4,
  },
  dataArea: {
    position: "relative",
    width: "100%",
    minWidth: 0,
    justifyContent: "flex-end",
  },
  /** Plot overlay in the padded content region (height = plot − top − bottom padding). */
  plotGuideLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    overflow: "visible",
  },
  /**
   * Horizontal grid line (solid `border-top`; dashed was flaky on some RN builds).
   * Same placement as `.chart-marker-bar` in `bar-chart.html`.
   */
  chartMarkerBar: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopWidth: GRID_STROKE_WIDTH,
    borderStyle: "solid",
    backgroundColor: "transparent",
  },
  /** Goal line across the plot (solid `border-top`). */
  chartTargetBar: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopWidth: GRID_STROKE_WIDTH,
    borderStyle: "solid",
    backgroundColor: "transparent",
  },
  barsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    width: "100%",
    minHeight: 0,
    flex: 1,
    zIndex: 2,
  },
  scrollBarsRow: {
    justifyContent: "flex-start",
  },
  scrollSlot: {
    width: MIN_CATEGORY_SLOT_WIDTH,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  xAxisRow: {
    flexDirection: "row",
    width: "100%",
    minHeight: X_AXIS_HEIGHT,
    height: X_AXIS_HEIGHT,
    justifyContent: "flex-end",
    alignItems: "flex-start",
  },
  xValues: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
    minWidth: 0,
  },
  scrollXValues: {
    flexDirection: "row",
    alignItems: "flex-start",
    height: X_AXIS_HEIGHT,
  },
  xAxisLabel: {
    textAlign: "center",
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 12,
  },
  scrollXLabel: {
    width: MIN_CATEGORY_SLOT_WIDTH,
  },
});
