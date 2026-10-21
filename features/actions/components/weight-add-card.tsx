import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { PopFlashView, usePopFlash } from "@/components/pop-flash";
import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { useDailyGoals } from "@/features/actions/daily-goals-context";
import { useWeightFormat } from "@/features/actions/weight/use-weight-format";
import {
  useWeightJourney,
  weighInXpForStreak,
  type WeightCelebration,
} from "@/features/actions/weight/weight-journey-context";
import {
  formatWeight,
  roundWeight,
  weekdayLabelForDayKey,
  WEEKDAY_LABELS,
} from "@/features/actions/weight/weight-journey-math";
import { useHoldToRepeat } from "@/hooks/use-hold-to-repeat";

import {
  WATER_ADD_ICON,
  WATER_SUBTRACT_ICON,
  WEIGHT_ADD_CARD_BACKGROUND,
  WEIGHT_ADD_WEIGHT_BUTTON_BACKGROUND,
  WEIGHT_BULK_ADD_BACKGROUND,
} from "../constants";

const CARD_TITLE = "Weekly weigh-in";
const BUTTON_LABEL = "Log weigh-in";
const CELEBRATION_MS = 5_000;
/** After two missed weeks, greet instead of counting what was missed. */
const WELCOME_BACK_AFTER_DAYS = 14;

function celebrationText(celebration: WeightCelebration): string {
  const xp = `+${celebration.xp} XP`;
  const unlocked =
    celebration.unlocked.length > 0
      ? ` · Unlocked ${celebration.unlocked.join(", ")}`
      : "";
  if (celebration.kind === "goal") return `Goal reached! ${xp}${unlocked}`;
  if (celebration.kind === "milestone") return `Milestone! ${xp}${unlocked}`;
  return celebration.streak > 1
    ? `${xp} · ${celebration.streak}-week streak`
    : `${xp} · Streak started`;
}

export function WeightAddCard() {
  const { goals } = useDailyGoals();
  const {
    isHydrated,
    entries,
    settings,
    weighIn,
    celebration,
    dismissCelebration,
    logWeighIn,
  } = useWeightJourney();
  const { format, unitLabel } = useWeightFormat();
  const popFlash = usePopFlash();
  const isKg = goals.weightUnit === "kg";
  const fineStep = isKg ? 0.1 : 0.2;
  const coarseSteps = isKg ? [-2, -0.5, 0.5, 2] : [-5, -1, 1, 5];

  const latest = entries.at(-1)?.value;
  const [value, setValue] = useState(goals.weightGoal);
  const [isSaving, setIsSaving] = useState(false);
  const [seeded, setSeeded] = useState(false);

  // Start from the last reading: weigh-ins usually move a little.
  useEffect(() => {
    if (!isHydrated || seeded) return;
    setValue(roundWeight(latest ?? goals.weightGoal));
    setSeeded(true);
  }, [goals.weightGoal, isHydrated, latest, seeded]);

  useEffect(() => {
    if (celebration == null) return;
    const timer = setTimeout(dismissCelebration, CELEBRATION_MS);
    return () => clearTimeout(timer);
  }, [celebration, dismissCelebration]);

  const adjustValue = useCallback((delta: number) => {
    setValue((current) => roundWeight(current + delta));
  }, []);
  const decreaseHold = useHoldToRepeat(() => adjustValue(-fineStep), {
    disabled: isSaving,
  });
  const increaseHold = useHoldToRepeat(() => adjustValue(fineStep), {
    disabled: isSaving,
  });

  const commitWeight = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      popFlash.play();
      await logWeighIn(value);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, logWeighIn, popFlash, value]);

  const weighInDay = WEEKDAY_LABELS[settings.weighInWeekday];
  const statusLine = weighIn.doneThisWeek
    ? `Done this week · Next: ${weekdayLabelForDayKey(weighIn.nextWeighInDayKey)}`
    : weighIn.daysSinceLast != null &&
        weighIn.daysSinceLast >= WELCOME_BACK_AFTER_DAYS
      ? "Welcome back! Log a weigh-in to start a new streak."
      : weighIn.isWeighInDay
        ? "Today is weigh-in day!"
        : `Weigh-in day: ${weighInDay}`;
  const streakLine =
    weighIn.streak > 0
      ? `Streak: ${weighIn.streak} week${weighIn.streak === 1 ? "" : "s"}`
      : "No streak yet";
  const rewardLine = weighIn.doneThisWeek
    ? "This week's XP earned"
    : `+${weighInXpForStreak(weighIn.streak + 1)} XP this week`;
  const lastLine =
    weighIn.daysSinceLast == null
      ? null
      : weighIn.daysSinceLast === 0
        ? `Last: ${format(latest)} today`
        : `Last: ${format(latest)} · ${weighIn.daysSinceLast}d ago`;

  const displayValue = `${formatWeight(value)} ${unitLabel}`;

  return (
    <View
      accessible
      accessibilityLabel={`${CARD_TITLE}. ${statusLine}. ${streakLine}. ${displayValue}`}
      style={styles.card}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.cardImageShell}
      >
        <Image
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          source={WEIGHT_ADD_CARD_BACKGROUND}
          style={StyleSheet.absoluteFillObject}
          contentFit="fill"
        />
        <View style={styles.cardInner}>
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.title}
          >
            {CARD_TITLE}
          </ThemedText>
          <View style={styles.statusBlock}>
            <ThemedText
              lightColor={APP_SHELL_MAIN_TEXT_COLOR}
              darkColor={APP_SHELL_MAIN_TEXT_COLOR}
              style={styles.statusLine}
            >
              {statusLine}
            </ThemedText>
            <ThemedText
              lightColor={APP_SHELL_LABEL_COLOR}
              darkColor={APP_SHELL_LABEL_COLOR}
              style={styles.subLine}
            >
              {`${streakLine} · ${rewardLine}`}
            </ThemedText>
            {lastLine != null ? (
              <ThemedText
                lightColor={APP_SHELL_LABEL_COLOR}
                darkColor={APP_SHELL_LABEL_COLOR}
                style={styles.subLine}
              >
                {lastLine}
              </ThemedText>
            ) : null}
          </View>
          <View style={styles.stepperRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Decrease by ${fineStep}`}
              hitSlop={8}
              disabled={isSaving}
              onPressIn={decreaseHold.onPressIn}
              onPressOut={decreaseHold.onPressOut}
              style={({ pressed }) => [
                styles.stepperColumn,
                pressed && styles.stepperPressed,
              ]}
            >
              <Image
                accessibilityIgnoresInvertColors
                source={WATER_SUBTRACT_ICON}
                style={styles.stepperIcon}
                contentFit="contain"
              />
            </Pressable>
            <View style={[styles.stepperColumn, styles.servingColumn]}>
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={styles.servingLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {displayValue}
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Increase by ${fineStep}`}
              hitSlop={8}
              disabled={isSaving}
              onPressIn={increaseHold.onPressIn}
              onPressOut={increaseHold.onPressOut}
              style={({ pressed }) => [
                styles.stepperColumn,
                pressed && styles.stepperPressed,
              ]}
            >
              <Image
                accessibilityIgnoresInvertColors
                source={WATER_ADD_ICON}
                style={styles.stepperIcon}
                contentFit="contain"
              />
            </Pressable>
          </View>
          <View style={styles.bulkRow}>
            {coarseSteps.map((delta) => (
              <Pressable
                key={delta}
                accessibilityRole="button"
                accessibilityLabel={`${delta > 0 ? "Add" : "Subtract"} ${Math.abs(delta)}`}
                disabled={isSaving}
                onPress={() => adjustValue(delta)}
                style={({ pressed }) => [
                  styles.bulkColumn,
                  pressed && styles.stepperPressed,
                ]}
              >
                <View style={styles.bulkCellShell}>
                  <Image
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    source={WEIGHT_BULK_ADD_BACKGROUND}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="fill"
                  />
                  <ThemedText
                    lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                    darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                    style={styles.bulkLabel}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                  >
                    {`${delta > 0 ? "+" : "-"}${Math.abs(delta)}`}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Log weigh-in of ${displayValue}`}
            disabled={isSaving}
            onPress={() => {
              void commitWeight();
            }}
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.stepperPressed,
            ]}
          >
            <PopFlashView popFlash={popFlash} style={styles.addButtonShell}>
              <Image
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                source={WEIGHT_ADD_WEIGHT_BUTTON_BACKGROUND}
                style={StyleSheet.absoluteFillObject}
                contentFit="fill"
              />
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={styles.addButtonLabel}
              >
                {BUTTON_LABEL}
              </ThemedText>
            </PopFlashView>
          </Pressable>
          {celebration != null ? (
            <View
              accessibilityLiveRegion="polite"
              style={[
                styles.banner,
                celebration.kind !== "weigh_in" && styles.bannerGold,
              ]}
            >
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={styles.bannerText}
              >
                {celebrationText(celebration)}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "stretch",
    borderRadius: 12,
    overflow: "hidden",
  },
  cardImageShell: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  cardInner: {
    paddingVertical: 28,
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    alignSelf: "flex-start",
  },
  statusBlock: {
    gap: 6,
  },
  statusLine: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 15,
  },
  subLine: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 13,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
  },
  stepperColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  servingColumn: {
    flex: 2,
    paddingHorizontal: 4,
  },
  stepperIcon: {
    width: 40,
    height: 40,
  },
  stepperPressed: {
    opacity: 0.85,
  },
  servingLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    lineHeight: 22,
    textAlign: "center",
  },
  bulkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bulkColumn: {
    flex: 1,
    minWidth: 0,
  },
  bulkCellShell: {
    width: "100%",
    minHeight: 44,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  bulkLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 13,
    textAlign: "center",
  },
  addButton: {
    alignSelf: "stretch",
  },
  addButtonShell: {
    width: "100%",
    minHeight: 48,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  addButtonLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
  banner: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  bannerGold: {
    borderColor: "#FFD23F",
  },
  bannerText: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
  },
});
