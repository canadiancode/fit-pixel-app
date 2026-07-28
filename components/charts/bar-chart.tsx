import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { getBarChartTheme } from "@/components/charts/bar-chart-themes";
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
/** Vertical gap between the goal line and the target value label (text sits above the line). */
const TARGET_VALUE_GAP_ABOVE_LINE_PX = 2;

export type BarChartProps = {
  userData: BarChartUserData;
  targetVal: number;
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
  targetVal: number,
  increment: number,
  yDomainFromZero = false,
) {
  const count = Math.min(userData.x.length, userData.y.length);
  const xLabels = userData.x.slice(0, count);
  const yValues = userData.y.slice(0, count);
  const scale = generateMarkers(yValues, increment, yDomainFromZero, targetVal);
  return { xLabels, yValues, scale, targetVal, count };
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
  const targetBottomPx = bottomPxForValue(
    targetVal,
    innerHeight,
    lowestMarker,
    highestMarker,
  );
  const barWidth = Math.max(
    BAR_MIN_WIDTH,
    plotWidth > 0 ? plotWidth * BAR_WIDTH_PERCENT : BAR_MIN_WIDTH,
  );

  const targetLabelText =
    targetLabelOverride ??
    `${String(targetVal)}${targetLabelSuffix ?? ""}`;

  const accessibilityLabel =
    accessibilityLabelProp ??
    (count > 0
      ? `Bar chart, ${String(count)} columns, target ${targetLabelText}`
      : "Bar chart, no data");

  if (__DEV__ && userData.x.length !== userData.y.length) {
    console.warn(
      "[BarChart] userData.x and userData.y length mismatch; using the first min(x,y) pairs.",
    );
  }

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      importantForAccessibility="yes"
      pointerEvents="none"
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
            const w = e.nativeEvent.layout.width;
            if (w !== plotWidth) {
              setPlotWidth(w);
            }
          }}
          style={styles.plotColumn}
        >
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
            {/* Grid markers: same placement as `.chart-marker-bar` in `bar-chart.html`. */}
            <View
              pointerEvents="none"
              style={[
                styles.plotGuideLayer,
                { height: innerHeight, zIndex: 1 },
              ]}
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

            <View style={styles.barsRow}>
              {count === 0
                ? null
                : yValues.map((yValue, index) => {
                    const hPct = percentHeightFromBottom(
                      yValue,
                      lowestMarker,
                      highestMarker,
                    );
                    const heightPx = (hPct / 100) * innerHeight;
                    return (
                      <View
                        key={`bar-${xLabels[index] ?? String(index)}-${String(index)}`}
                        style={[
                          {
                            width: barWidth,
                            height: Math.max(0, heightPx),
                            backgroundColor: tokens.barFill,
                            borderColor: tokens.barBorder,
                            borderWidth: BAR_BORDER_WIDTH,
                            borderTopLeftRadius: BAR_BORDER_RADIUS,
                            borderTopRightRadius: BAR_BORDER_RADIUS,
                          },
                        ]}
                      />
                    );
                  })}
            </View>

            {/* Target: same as `.chart-target-bar`; own layer above bars so it stays visible. */}
            <View
              pointerEvents="none"
              style={[
                styles.plotGuideLayer,
                { height: innerHeight, zIndex: 3 },
              ]}
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
          </View>
        </View>
      </View>

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
  xAxisLabel: {
    textAlign: "center",
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 12,
  },
});
