import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PixelFrameBackdrop } from "@/components/pixel-panel";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import {
  SETTINGS_ON_COLOR,
  SettingsSection,
  SettingsSegmented,
} from "@/features/settings/components/settings-ui";
import { usePrefsProfile } from "@/features/settings/prefs-profile-context";
import { Stepper } from "@/features/training/components/pixel-ui";
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

/**
 * One-tap "day starts at" picks (minutes from midnight): midnight, training
 * after midnight, and two night-shift starts. The stepper reaches any time.
 */
const DAY_START_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 0, label: "12 AM" },
  { value: 4 * 60, label: "4 AM" },
  { value: 12 * 60, label: "Noon" },
  { value: 18 * 60, label: "6 PM" },
];

const MINUTES_PER_DAY = 24 * 60;
const DAY_START_STEP_MINUTES = 30;
/** Holding the stepper sends many steps; save once it settles. */
const DAY_START_SAVE_DELAY_MS = 700;

function stepDayStart(minutes: number, direction: 1 | -1): number {
  // Snap off-grid values (set elsewhere) to the step, then wrap around midnight.
  const snapped =
    Math.round(minutes / DAY_START_STEP_MINUTES) * DAY_START_STEP_MINUTES;
  const next =
    snapped === minutes ? minutes + direction * DAY_START_STEP_MINUTES : snapped;
  return ((next % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

function dayStartFooter(minutes: number): string {
  if (minutes === 0) {
    return (
      "Habits, goals and your streak reset at midnight. Work nights or " +
      "train after midnight? Set this to when your day really starts."
    );
  }
  const end = formatDayStart(
    (minutes + MINUTES_PER_DAY - 1) % MINUTES_PER_DAY,
  );
  return (
    `Your day runs ${formatDayStart(minutes)} to ${end}. Habits, goals ` +
    `and your streak reset at ${formatDayStart(minutes)}.`
  );
}

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

  // The stepper edits a draft; it's saved (and synced) once it settles.
  const [dayStartDraft, setDayStartDraft] = useState<number | null>(null);
  const dayStart = dayStartDraft ?? prefs.dayStartsAtMinutes;
  const unsavedDayStartRef = useRef<number | null>(null);
  const updatePrefsRef = useRef(updatePrefs);
  updatePrefsRef.current = updatePrefs;

  useEffect(() => {
    if (dayStartDraft == null) return;
    if (dayStartDraft === prefs.dayStartsAtMinutes) {
      unsavedDayStartRef.current = null;
      setDayStartDraft(null);
      return;
    }
    unsavedDayStartRef.current = dayStartDraft;
    const timer = setTimeout(() => {
      unsavedDayStartRef.current = null;
      void updatePrefs({ dayStartsAtMinutes: dayStartDraft })
        .catch(() => undefined)
        .finally(() => setDayStartDraft(null));
    }, DAY_START_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [dayStartDraft, prefs.dayStartsAtMinutes, updatePrefs]);

  // Leaving the screen mid-wait still saves the pick.
  useEffect(
    () => () => {
      const unsaved = unsavedDayStartRef.current;
      if (unsaved != null) {
        void updatePrefsRef
          .current({ dayStartsAtMinutes: unsaved })
          .catch(() => undefined);
      }
    },
    [],
  );

  const stepDayStartBy = (direction: 1 | -1) => {
    if (!isHydrated) return;
    setDayStartDraft((draft) =>
      stepDayStart(draft ?? prefs.dayStartsAtMinutes, direction),
    );
  };

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
                    !owned && styles.themeTileLocked,
                    pressed && styles.pressed,
                  ]}
                >
                  <PixelFrameBackdrop frame={selected ? "green" : "blue"} />
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
        footer={dayStartFooter(dayStart)}
        bare
      >
        <View style={styles.dayStart}>
          <Stepper
            compact
            label="NEW DAY AT"
            value={formatDayStart(dayStart)}
            decreaseLabel={`Earlier, ${DAY_START_STEP_MINUTES} minutes`}
            increaseLabel={`Later, ${DAY_START_STEP_MINUTES} minutes`}
            onDecrease={() => stepDayStartBy(-1)}
            onIncrease={() => stepDayStartBy(1)}
          />
          <SettingsSegmented
            accessibilityLabel="Day starts at presets"
            options={DAY_START_OPTIONS}
            value={dayStart}
            disabled={!isHydrated}
            onChange={(minutes) => setDayStartDraft(minutes)}
          />
        </View>
      </SettingsSection>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 28,
  },
  dayStart: {
    gap: 12,
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
    padding: 12,
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
    borderWidth: 2,
    borderColor: "#000a1c",
    alignItems: "center",
    justifyContent: "center",
  },
  check: {
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
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
