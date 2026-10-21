import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import {
  restingHeartRateWeekAverage,
  type RestingHeartRateDay,
} from "@/hooks/resting-heart-rate-week";

import { HEART_ACCENT_COLOR, HEART_ACTION_CARD_ICON } from "../constants";

const HEART_CARD_TITLE = "Resting heart rate";
const EM_DASH = "\u2014";

type Props = {
  /** Latest synced resting HR; null when no health source has one. */
  bpm: number | null;
  days: readonly RestingHeartRateDay[];
};

/** Compares the latest reading with the week's average; lower resting HR is better. */
function trendLabel(bpm: number | null, days: readonly RestingHeartRateDay[]): string {
  if (bpm == null) return "No reading yet";
  const readings = days.filter((d) => d.bpm != null).length;
  const avg = restingHeartRateWeekAverage(days);
  if (avg == null || readings < 2) return "Synced from your health app";
  const delta = bpm - avg;
  if (delta === 0) return "Right at your 7-day average";
  return `${Math.abs(delta)} BPM ${delta < 0 ? "below" : "above"} your 7-day average`;
}

export function HeartSummaryCard({ bpm, days }: Props) {
  const valueLabel = bpm == null ? EM_DASH : String(bpm);
  const trend = trendLabel(bpm, days);

  return (
    <View
      accessible
      accessibilityLabel={`${HEART_CARD_TITLE}. ${bpm == null ? "No data" : `${bpm} BPM`}. ${trend}`}
      style={styles.section}
    >
      <ThemedText
        lightColor={APP_SHELL_MAIN_TEXT_COLOR}
        darkColor={APP_SHELL_MAIN_TEXT_COLOR}
        style={styles.title}
      >
        {HEART_CARD_TITLE}
      </ThemedText>
      <View style={styles.bodyRow}>
        <Image
          accessibilityIgnoresInvertColors
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          source={HEART_ACTION_CARD_ICON}
          style={[styles.icon, bpm == null && styles.iconInactive]}
          contentFit="contain"
        />
        <View style={styles.valueColumn}>
          <Text numberOfLines={1} style={styles.valueText}>
            <Text style={[styles.valueCurrent, { color: HEART_ACCENT_COLOR }]}>
              {valueLabel}
            </Text>
            {bpm == null ? null : <Text style={styles.valueRest}> BPM</Text>}
          </Text>
          <Text numberOfLines={2} style={styles.trendText}>
            {trend}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    alignSelf: "stretch",
    paddingVertical: 8,
    gap: 14,
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    alignSelf: "stretch",
    textAlign: "center",
  },
  bodyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  icon: {
    width: 56,
    height: 56,
    flexShrink: 0,
  },
  iconInactive: {
    opacity: 0.35,
  },
  valueColumn: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: 8,
  },
  valueText: {
    fontFamily: FONT_FAMILY,
  },
  valueCurrent: {
    fontFamily: FONT_FAMILY,
    fontSize: 22,
    lineHeight: 28,
  },
  valueRest: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    lineHeight: 20,
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
  trendText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
    color: APP_SHELL_LABEL_COLOR,
  },
});
