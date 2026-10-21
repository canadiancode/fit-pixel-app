import { Image } from "expo-image";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ActionProgressBar } from "@/components/action-progress-bar";
import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { useWeightFormat } from "@/features/actions/weight/use-weight-format";
import { useWeightJourney } from "@/features/actions/weight/weight-journey-context";
import {
  journeyHeadline,
  journeyTitle,
  nextMilestoneLine,
} from "@/features/actions/weight/weight-copy";
import { clampActionBarPercent } from "@/lib/action-bar-progress";

import { WEIGHT_ACTION_CARD_ICON } from "../constants";
import {
  getActionRow,
  getActionRowAccentColor,
  getActionRowBarSources,
} from "../data";

const GOLD = "#FFD23F";

/**
 * Long-term weight progress: a start → target bar with milestone ticks that
 * fills over weeks, plus the next milestone and its reward. Flashes gold when
 * a weigh-in reaches a milestone.
 */
export function WeightSummaryCard() {
  const weightRow = getActionRow("weight");
  const accentColor = getActionRowAccentColor("weight");
  const { journey, celebration } = useWeightJourney();
  const { format, hidden } = useWeightFormat();

  const pulse = useMemo(
    () =>
      celebration == null
        ? null
        : { id: celebration.id, gold: celebration.kind !== "weigh_in" },
    [celebration],
  );

  const title = journeyTitle(journey?.direction ?? null);
  const headline = journeyHeadline(journey, format, hidden);
  const nextLine = nextMilestoneLine(journey, format, hidden);

  return (
    <View
      accessible
      accessibilityLabel={`${title}. ${headline}. ${nextLine}`}
      style={styles.section}
    >
      <ThemedText
        lightColor={APP_SHELL_MAIN_TEXT_COLOR}
        darkColor={APP_SHELL_MAIN_TEXT_COLOR}
        style={styles.title}
      >
        {title}
      </ThemedText>
      <View style={styles.bodyRow}>
        <Image
          accessibilityIgnoresInvertColors
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          source={WEIGHT_ACTION_CARD_ICON}
          style={styles.icon}
          contentFit="contain"
        />
        <View style={styles.valueColumn}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            style={[styles.headline, { color: accentColor }]}
          >
            {headline}
          </Text>
          <View>
            <ActionProgressBar
              sources={getActionRowBarSources(weightRow)}
              fillPercent={clampActionBarPercent((journey?.progress ?? 0) * 100)}
              pulse={pulse}
            />
            {journey?.milestones
              .filter((m) => !m.isGoal)
              .map((milestone) => (
                <View
                  key={milestone.awardKey}
                  pointerEvents="none"
                  style={[
                    styles.tick,
                    // Same mapping as the fill so a tick meets the end-cap
                    // exactly when its milestone is reached.
                    { left: `${clampActionBarPercent(milestone.position * 100)}%` },
                    milestone.reached && styles.tickReached,
                  ]}
                />
              ))}
          </View>
          {journey != null ? (
            <View style={styles.endpoints}>
              <Endpoint label="Start" value={format(journey.start, { withUnit: false })} />
              <Endpoint label="Now" value={format(journey.current, { withUnit: false })} />
              <Endpoint label="Goal" value={format(journey.target, { withUnit: false })} />
            </View>
          ) : null}
        </View>
      </View>
      <ThemedText
        lightColor={APP_SHELL_LABEL_COLOR}
        darkColor={APP_SHELL_LABEL_COLOR}
        style={styles.nextLine}
      >
        {nextLine}
      </ThemedText>
    </View>
  );
}

function Endpoint({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.endpoint}>
      <Text style={styles.endpointLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.endpointValue}>
        {value}
      </Text>
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
  valueColumn: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: 8,
  },
  headline: {
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    lineHeight: 24,
  },
  tick: {
    position: "absolute",
    top: 3,
    bottom: 3,
    width: 3,
    marginLeft: -1.5,
    backgroundColor: "rgba(255,255,255,0.55)",
    zIndex: 5,
  },
  tickReached: {
    backgroundColor: GOLD,
  },
  endpoints: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  endpoint: {
    alignItems: "center",
    minWidth: 0,
  },
  endpointLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 11,
    color: APP_SHELL_LABEL_COLOR,
  },
  endpointValue: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 14,
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
  nextLine: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
  },
});
