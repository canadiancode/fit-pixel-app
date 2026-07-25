import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { ActionProgressBar } from "@/components/action-progress-bar";
import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";

import { WEIGHT_ACTION_CARD_ICON } from "../constants";
import { getActionRow, getActionRowBarSources } from "../data";
import { useActionProgress } from "../use-action-progress";

const WEIGHT_CARD_TITLE = "Today's progress";

export function WeightSummaryCard() {
  const weightRow = getActionRow("weight");
  const {
    current,
    rest,
    accentColor,
    percent,
    progressLabel,
    barFillPercent,
  } = useActionProgress("weight");
  const progressPercentLabel = `${Math.round(percent)}%`;

  return (
    <View
      accessible
      accessibilityLabel={`${WEIGHT_CARD_TITLE}. ${progressLabel}. ${progressPercentLabel}`}
      style={styles.section}
    >
      <ThemedText
        lightColor={APP_SHELL_MAIN_TEXT_COLOR}
        darkColor={APP_SHELL_MAIN_TEXT_COLOR}
        style={styles.title}
      >
        {WEIGHT_CARD_TITLE}
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
            minimumFontScale={0.75}
            ellipsizeMode="tail"
            style={styles.valueText}
          >
            <Text style={[styles.valueCurrent, { color: accentColor }]}>
              {current}
            </Text>
            <Text style={styles.valueRest}>{rest}</Text>
          </Text>
          <View style={styles.barRow}>
            <ActionProgressBar
              sources={getActionRowBarSources(weightRow)}
              fillPercent={barFillPercent}
              style={styles.progressBar}
            />
            <ThemedText
              lightColor={APP_SHELL_MAIN_TEXT_COLOR}
              darkColor={APP_SHELL_MAIN_TEXT_COLOR}
              style={styles.barPercentLabel}
            >
              {progressPercentLabel}
            </ThemedText>
          </View>
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
  valueColumn: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: 8,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    alignSelf: "stretch",
  },
  progressBar: {
    flex: 1,
    minWidth: 0,
  },
  barPercentLabel: {
    flexShrink: 0,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
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
});
