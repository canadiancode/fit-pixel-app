import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { useWeightJourney } from "@/features/actions/weight/weight-journey-context";
import { WEEKDAY_LABELS } from "@/features/actions/weight/weight-journey-math";

const SECTION_TITLE = "Weigh-in settings";

/** Weigh-in day, weekly reminder, and the hide-numbers option. */
export function WeightSettingsSection() {
  const {
    settings,
    setWeighInWeekday,
    setReminderEnabled,
    setHideNumbers,
  } = useWeightJourney();
  const [reminderBlocked, setReminderBlocked] = useState(false);
  const reminderOn =
    settings.reminderEnabled && settings.reminderNotificationId != null;

  const tick = () => void Haptics.selectionAsync();

  return (
    <View style={styles.section}>
      <ThemedText
        lightColor={APP_SHELL_MAIN_TEXT_COLOR}
        darkColor={APP_SHELL_MAIN_TEXT_COLOR}
        style={styles.title}
        accessibilityRole="header"
      >
        {SECTION_TITLE}
      </ThemedText>

      <Text style={styles.label}>Weigh-in day</Text>
      <View style={styles.dayRow} accessibilityRole="radiogroup">
        {WEEKDAY_LABELS.map((day, weekday) => {
          const selected = weekday === settings.weighInWeekday;
          return (
            <Pressable
              key={day}
              accessibilityRole="radio"
              accessibilityLabel={day}
              accessibilityState={{ selected }}
              onPress={() => {
                if (selected) return;
                tick();
                void setWeighInWeekday(weekday);
              }}
              style={[styles.dayChip, selected && styles.chipSelected]}
            >
              <Text style={styles.chipLabel}>{day.slice(0, 1)}</Text>
            </Pressable>
          );
        })}
      </View>

      <ToggleRow
        label="Weekly reminder"
        detail={
          reminderBlocked
            ? "Notifications are off for Fit Pixel. Tap to open Settings."
            : `8 AM every ${WEEKDAY_LABELS[settings.weighInWeekday]}`
        }
        value={reminderOn}
        onPress={() => {
          tick();
          if (reminderBlocked) {
            void Linking.openSettings();
            return;
          }
          void setReminderEnabled(!reminderOn).then((ok) => {
            setReminderBlocked(!reminderOn && !ok);
          });
        }}
      />
      <ToggleRow
        label="Hide numbers"
        detail="Show trends and milestones instead of your weight."
        value={settings.hideNumbers}
        onPress={() => {
          tick();
          void setHideNumbers(!settings.hideNumbers);
        }}
      />
    </View>
  );
}

function ToggleRow({
  label,
  detail,
  value,
  onPress,
}: {
  label: string;
  detail: string;
  value: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={detail}
      accessibilityState={{ checked: value }}
      onPress={onPress}
      style={({ pressed }) => [styles.toggleRow, pressed && styles.pressed]}
    >
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDetail}>{detail}</Text>
      </View>
      <View style={[styles.toggleChip, value && styles.chipSelected]}>
        <Text style={styles.chipLabel}>{value ? "On" : "Off"}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    alignSelf: "stretch",
    paddingVertical: 8,
    gap: 12,
  },
  title: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
  },
  label: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 13,
    color: APP_SHELL_LABEL_COLOR,
  },
  dayRow: {
    flexDirection: "row",
    gap: 6,
  },
  dayChip: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 6,
  },
  chipSelected: {
    borderColor: APP_SHELL_MAIN_TEXT_COLOR,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  chipLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 13,
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  pressed: {
    opacity: 0.85,
  },
  toggleText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  toggleLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 14,
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
  toggleDetail: {
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 12,
    color: APP_SHELL_LABEL_COLOR,
  },
  toggleChip: {
    minWidth: 52,
    alignItems: "center",
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 6,
  },
});
