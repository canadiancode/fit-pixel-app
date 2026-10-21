import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import {
  SETTINGS_CARD_FILL,
  SETTINGS_CARD_RIM,
  SETTINGS_ON_COLOR,
  SettingsSection,
  SettingsSegmented,
} from "@/features/settings/components/settings-ui";
import { usePrefsProfile } from "@/features/settings/prefs-profile-context";
import { useXpState } from "@/features/xp/xp-state-context";
import {
  APP_THEME_CATALOG,
  type AppThemeId,
  type UnitSystem,
} from "@/lib/db";

const UNIT_OPTIONS: readonly { value: UnitSystem; label: string }[] = [
  { value: "imperial", label: "Imperial" },
  { value: "metric", label: "Metric" },
];

/** Common fitness "day starts at" presets (minutes from midnight). */
const DAY_START_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 0, label: "12 AM" },
  { value: 3 * 60, label: "3 AM" },
  { value: 4 * 60, label: "4 AM" },
  { value: 5 * 60, label: "5 AM" },
];

function formatDayStart(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${suffix}`;
}

/**
 * Themes aren't applied yet, so the picker stays hidden; unlocks still
 * accrue below and a saved pick is kept for when they ship.
 */
const SHOW_THEME_PICKER = false;

export function PreferencesSettingsForm() {
  const { prefs, isHydrated, updatePrefs, unlockAppTheme } = usePrefsProfile();
  const { xp } = useXpState();

  // Themes are free like shop items: once you reach a theme's level it's
  // yours, no "Tap to unlock".
  useEffect(() => {
    if (!isHydrated) return;
    for (const theme of APP_THEME_CATALOG) {
      if (
        xp.level >= theme.unlockLevel &&
        !prefs.unlockedThemeIds.includes(theme.id)
      ) {
        void unlockAppTheme(theme.id).catch(() => undefined);
      }
    }
  }, [isHydrated, prefs.unlockedThemeIds, unlockAppTheme, xp.level]);

  const selectTheme = (id: AppThemeId) => {
    if (process.env.EXPO_OS === "ios") void Haptics.selectionAsync();
    void updatePrefs({ selectedThemeId: id });
  };

  const isPreset = DAY_START_OPTIONS.some(
    (option) => option.value === prefs.dayStartsAtMinutes,
  );

  return (
    <View style={styles.root}>
      {SHOW_THEME_PICKER ? (
        <SettingsSection
          title="theme"
          footer="Color themes are coming soon. Your pick is saved and applies when they launch."
          bare
        >
          <View style={styles.themeGrid}>
            {APP_THEME_CATALOG.map((theme) => {
              const owned = prefs.unlockedThemeIds.includes(theme.id);
              const selected = owned && prefs.selectedThemeId === theme.id;
              return (
                <Pressable
                  key={theme.id}
                  accessibilityRole="radio"
                  accessibilityLabel={
                    owned
                      ? theme.name
                      : `${theme.name}, locked until level ${theme.unlockLevel}`
                  }
                  accessibilityState={{ selected, disabled: !owned }}
                  disabled={!owned || !isHydrated}
                  onPress={() => selectTheme(theme.id)}
                  style={({ pressed }) => [
                    styles.themeTile,
                    selected && styles.themeTileSelected,
                    !owned && styles.themeTileLocked,
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[styles.swatch, { backgroundColor: theme.swatch }]}
                  >
                    {selected ? <Text style={styles.check}>✓</Text> : null}
                  </View>
                  <View style={styles.themeText}>
                    <Text style={styles.themeName} numberOfLines={1}>
                      {theme.name}
                    </Text>
                    <Text
                      style={[styles.themeMeta, selected && styles.themeMetaOn]}
                      numberOfLines={1}
                    >
                      {selected
                        ? "In use"
                        : owned
                          ? "Tap to use"
                          : `LV ${theme.unlockLevel}`}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </SettingsSection>
      ) : null}

      <SettingsSection
        title="units"
        footer={
          prefs.unitSystem === "metric"
            ? "Kilograms, kilometres and millilitres."
            : "Pounds, miles and fluid ounces."
        }
        bare
      >
        <SettingsSegmented
          accessibilityLabel="Units of measure"
          options={UNIT_OPTIONS}
          value={prefs.unitSystem}
          disabled={!isHydrated}
          onChange={(unitSystem) => {
            void updatePrefs({ unitSystem });
          }}
        />
      </SettingsSection>

      <SettingsSection
        title="day starts at"
        footer={
          isPreset
            ? "When your habits and daily goals reset. Pick a later time if you often train after midnight."
            : `Currently ${formatDayStart(prefs.dayStartsAtMinutes)}. Pick a preset to change it.`
        }
        bare
      >
        <SettingsSegmented
          accessibilityLabel="Day starts at"
          options={DAY_START_OPTIONS}
          value={prefs.dayStartsAtMinutes}
          disabled={!isHydrated}
          onChange={(dayStartsAtMinutes) => {
            void updatePrefs({ dayStartsAtMinutes });
          }}
        />
      </SettingsSection>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 28,
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  themeTile: {
    width: "48%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: SETTINGS_CARD_RIM,
    backgroundColor: SETTINGS_CARD_FILL,
  },
  themeTileSelected: {
    borderColor: SETTINGS_ON_COLOR,
  },
  themeTileLocked: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  check: {
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontSize: 16,
    fontWeight: "800",
  },
  themeText: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  themeName: {
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 14,
  },
  themeMeta: {
    color: APP_SHELL_LABEL_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 12,
  },
  themeMetaOn: {
    color: SETTINGS_ON_COLOR,
  },
});
