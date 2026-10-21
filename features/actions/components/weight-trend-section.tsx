import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { useDailyGoals } from "@/features/actions/daily-goals-context";
import { useWeightFormat } from "@/features/actions/weight/use-weight-format";
import { trendSummary } from "@/features/actions/weight/weight-copy";
import { useWeightJourney } from "@/features/actions/weight/weight-journey-context";
import {
  shiftDays,
  type TrendPoint,
} from "@/features/actions/weight/weight-journey-math";

import { getActionRowAccentColor } from "../data";

const SECTION_TITLE = "Trend";
const PLOT_HEIGHT = 140;
const RAW_SIZE = 4;
const TREND_SIZE = 6;
const LINE = 2;

const RANGES = [
  { id: "month", label: "1M", days: 30 },
  { id: "quarter", label: "3M", days: 90 },
  { id: "year", label: "1Y", days: 365 },
  { id: "all", label: "All", days: null },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

function dayIndex(dayKey: string): number {
  return Math.round(Date.parse(`${dayKey}T00:00:00Z`) / 86_400_000);
}

/**
 * Pixel-style trend: faint squares for each day's reading and a bright,
 * stepped line for the 7-day rolling average, so day-to-day water swings
 * don't read as failure.
 */
export function WeightTrendSection() {
  const { trend, todayKey, journey } = useWeightJourney();
  const { goals } = useDailyGoals();
  const { format, hidden } = useWeightFormat();
  const accentColor = getActionRowAccentColor("weight");
  const [rangeId, setRangeId] = useState<RangeId>("quarter");
  const [width, setWidth] = useState(0);

  const range = RANGES.find((r) => r.id === rangeId) ?? RANGES[1];
  const today = todayKey === "" ? null : todayKey;

  const points = useMemo<TrendPoint[]>(() => {
    if (range.days == null || today == null) return [...trend];
    const from = shiftDays(today, -range.days);
    return trend.filter((p) => p.dayKey >= from);
  }, [trend, range.days, today]);

  const plot = useMemo(() => {
    if (points.length < 2 || width === 0) return null;
    const first = dayIndex(points[0].dayKey);
    const last = dayIndex(points[points.length - 1].dayKey);
    const span = Math.max(1, last - first);
    const values = points.flatMap((p) => [p.value, p.average]);
    values.push(goals.weightGoal);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max(1, (max - min) * 0.12);
    const lo = min - pad;
    const hi = max + pad;
    const x = (dayKey: string) =>
      ((dayIndex(dayKey) - first) / span) * (width - TREND_SIZE);
    const y = (value: number) =>
      ((hi - value) / (hi - lo)) * (PLOT_HEIGHT - TREND_SIZE);
    return {
      raw: points.map((p) => ({ x: x(p.dayKey), y: y(p.value), key: p.dayKey })),
      avg: points.map((p) => ({ x: x(p.dayKey), y: y(p.average), key: p.dayKey })),
      goalY: y(goals.weightGoal),
      lo,
      hi,
    };
  }, [points, width, goals.weightGoal]);

  const change =
    points.length >= 2
      ? points[points.length - 1].average - points[0].average
      : null;
  const steady = goals.weightUnit === "kg" ? 0.15 : 0.3;
  const summary = trendSummary({
    change,
    direction: journey?.direction ?? null,
    steady,
    hidden,
    format,
    rangeLabel: range.days == null ? "all time" : `last ${range.label}`,
  });

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View accessible accessibilityLabel={`${SECTION_TITLE}. ${summary}`} style={styles.section}>
      <View style={styles.headerRow}>
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.title}
          accessibilityRole="header"
        >
          {SECTION_TITLE}
        </ThemedText>
        <View style={styles.chips}>
          {RANGES.map((r) => (
            <Pressable
              key={r.id}
              accessibilityRole="button"
              accessibilityState={{ selected: r.id === rangeId }}
              onPress={() => setRangeId(r.id)}
              style={[styles.chip, r.id === rangeId && styles.chipSelected]}
            >
              <Text style={styles.chipLabel}>{r.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Text style={[styles.summary, { color: accentColor }]}>{summary}</Text>
      <View style={styles.plotRow}>
        {!hidden && plot != null ? (
          <View style={styles.axis}>
            <Text style={styles.axisLabel}>{format(plot.hi, { withUnit: false })}</Text>
            <Text style={styles.axisLabel}>{format(plot.lo, { withUnit: false })}</Text>
          </View>
        ) : null}
        <View onLayout={onLayout} style={styles.plot}>
          {plot != null ? (
            <>
              <View style={[styles.goalLine, { top: plot.goalY + TREND_SIZE / 2 }]} />
              <Text style={[styles.goalLabel, { top: plot.goalY - 10 }]}>GOAL</Text>
              {plot.raw.map((p) => (
                <View
                  key={`r-${p.key}`}
                  style={[
                    styles.raw,
                    {
                      left: p.x + (TREND_SIZE - RAW_SIZE) / 2,
                      top: p.y + (TREND_SIZE - RAW_SIZE) / 2,
                    },
                  ]}
                />
              ))}
              {plot.avg.map((p, i) => {
                const prev = i > 0 ? plot.avg[i - 1] : null;
                return (
                  <View key={`a-${p.key}`} pointerEvents="none" style={StyleSheet.absoluteFill}>
                    {prev != null ? (
                      <>
                        {/* Stepped connector: across at the old level, then up/down. */}
                        <View
                          style={[
                            styles.segment,
                            {
                              backgroundColor: accentColor,
                              left: prev.x + TREND_SIZE / 2,
                              top: prev.y + (TREND_SIZE - LINE) / 2,
                              width: Math.max(LINE, p.x - prev.x),
                              height: LINE,
                            },
                          ]}
                        />
                        <View
                          style={[
                            styles.segment,
                            {
                              backgroundColor: accentColor,
                              left: p.x + (TREND_SIZE - LINE) / 2,
                              top: Math.min(prev.y, p.y) + TREND_SIZE / 2,
                              width: LINE,
                              height: Math.abs(p.y - prev.y),
                            },
                          ]}
                        />
                      </>
                    ) : null}
                    <View
                      style={[
                        styles.trendPoint,
                        { backgroundColor: accentColor, left: p.x, top: p.y },
                      ]}
                    />
                  </View>
                );
              })}
            </>
          ) : (
            <Text style={styles.empty}>No trend yet</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    alignSelf: "stretch",
    paddingVertical: 8,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
  },
  chips: {
    flexDirection: "row",
    gap: 4,
  },
  chip: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: 4,
  },
  chipSelected: {
    borderColor: APP_SHELL_MAIN_TEXT_COLOR,
  },
  chipLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 12,
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
  summary: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 15,
  },
  plotRow: {
    flexDirection: "row",
    gap: 6,
  },
  axis: {
    height: PLOT_HEIGHT,
    justifyContent: "space-between",
  },
  axisLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 10,
    color: APP_SHELL_LABEL_COLOR,
  },
  plot: {
    flex: 1,
    height: PLOT_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  goalLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  goalLabel: {
    position: "absolute",
    right: 0,
    fontFamily: FONT_FAMILY,
    fontSize: 7,
    lineHeight: 9,
    color: APP_SHELL_LABEL_COLOR,
  },
  raw: {
    position: "absolute",
    width: RAW_SIZE,
    height: RAW_SIZE,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  segment: {
    position: "absolute",
  },
  trendPoint: {
    position: "absolute",
    width: TREND_SIZE,
    height: TREND_SIZE,
  },
  empty: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 12,
    color: APP_SHELL_LABEL_COLOR,
  },
});
