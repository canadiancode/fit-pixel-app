import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_INPUT_BOARDER_COLOR,
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { usePrefsProfile } from "@/features/settings/prefs-profile-context";
import { useXpState } from "@/features/xp/xp-state-context";
import {
  APP_THEME_CATALOG,
  type AppThemeId,
  type UnitSystem,
} from "@/lib/db";

/** Common fitness “day starts at” hour presets (minutes from midnight). */
const DAY_START_PRESETS: readonly {
  minutes: number;
  label: string;
}[] = [
  { minutes: 0, label: "Midnight" },
  { minutes: 3 * 60, label: "3:00 AM" },
  { minutes: 4 * 60, label: "4:00 AM" },
  { minutes: 5 * 60, label: "5:00 AM" },
];

function formatDayStartLabel(minutes: number): string {
  const preset = DAY_START_PRESETS.find((p) => p.minutes === minutes);
  if (preset) return preset.label;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${suffix}`;
}

export function PreferencesSettingsForm() {
  const { prefs, isHydrated, updatePrefs, unlockAppTheme } = usePrefsProfile();
  const { xp } = useXpState();

  const units = prefs.unitSystem;

  const setUnits = (next: UnitSystem) => {
    void updatePrefs({ unitSystem: next });
  };

  const selectTheme = (id: AppThemeId) => {
    void updatePrefs({ selectedThemeId: id });
  };

  const tryUnlockTheme = (id: AppThemeId) => {
    void unlockAppTheme(id).catch(() => {
      // Level gate failure — leave UI as-is.
    });
  };

  return (
    <View style={styles.root}>
      <View style={styles.leadSection}>
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.sectionTitle}
          accessibilityRole="header"
        >
          Theme
        </ThemedText>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.sectionHint}
        >
          The app is on the blue look you see today. Other color themes unlock
          as you earn XP and level your pixel.
        </ThemedText>
        <View style={styles.themeList}>
          {APP_THEME_CATALOG.map((theme) => {
            const owned = prefs.unlockedThemeIds.includes(theme.id);
            const selected = owned && prefs.selectedThemeId === theme.id;
            const canUnlock =
              !owned && xp.level >= theme.unlockLevel;

            if (owned) {
              return (
                <Pressable
                  key={theme.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${theme.name}${selected ? ", current theme" : ""}`}
                  accessibilityState={{ selected }}
                  onPress={() => selectTheme(theme.id)}
                  style={({ pressed }) => [
                    styles.themeRow,
                    selected && styles.themeRowSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.themeRowLeft}>
                    <View
                      style={[styles.swatch, { backgroundColor: theme.swatch }]}
                      accessibilityElementsHidden
                    />
                    <View style={styles.themeTextBlock}>
                      <ThemedText
                        lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                        darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                        style={styles.themeName}
                      >
                        {theme.name}
                      </ThemedText>
                      <ThemedText
                        lightColor={APP_SHELL_LABEL_COLOR}
                        darkColor={APP_SHELL_LABEL_COLOR}
                        style={styles.themeMeta}
                      >
                        {selected ? "Current" : "Tap to select"}
                      </ThemedText>
                    </View>
                  </View>
                </Pressable>
              );
            }

            if (canUnlock) {
              return (
                <Pressable
                  key={theme.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Unlock ${theme.name}`}
                  onPress={() => tryUnlockTheme(theme.id)}
                  style={({ pressed }) => [
                    styles.themeRow,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.themeRowLeft}>
                    <View
                      style={[styles.swatch, { backgroundColor: theme.swatch }]}
                      accessibilityElementsHidden
                    />
                    <View style={styles.themeTextBlock}>
                      <ThemedText
                        lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                        darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                        style={styles.themeName}
                      >
                        {theme.name}
                      </ThemedText>
                      <ThemedText
                        lightColor={APP_SHELL_LABEL_COLOR}
                        darkColor={APP_SHELL_LABEL_COLOR}
                        style={styles.themeMeta}
                      >
                        Tap to unlock (level {theme.unlockLevel})
                      </ThemedText>
                    </View>
                  </View>
                </Pressable>
              );
            }

            return (
              <View
                key={theme.id}
                style={[styles.themeRow, styles.themeRowLocked]}
                accessibilityRole="text"
                accessibilityLabel={`${theme.name}, locked. Requires level ${theme.unlockLevel}.`}
              >
                <View style={styles.themeRowLeft}>
                  <View
                    style={[
                      styles.swatch,
                      styles.swatchLocked,
                      { backgroundColor: theme.swatch },
                    ]}
                    accessibilityElementsHidden
                  />
                  <View style={styles.themeTextBlock}>
                    <ThemedText
                      lightColor={APP_SHELL_LABEL_COLOR}
                      darkColor={APP_SHELL_LABEL_COLOR}
                      style={styles.themeName}
                    >
                      {theme.name}
                    </ThemedText>
                    <ThemedText
                      lightColor={APP_SHELL_LABEL_COLOR}
                      darkColor={APP_SHELL_LABEL_COLOR}
                      style={styles.themeMeta}
                    >
                      Locked — level {theme.unlockLevel}
                    </ThemedText>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.sectionTitle}
          accessibilityRole="header"
        >
          Units of measure
        </ThemedText>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.sectionHint}
        >
          Choose how weights, distances, and similar values are shown in the
          app.
        </ThemedText>
        <View style={styles.unitChips}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Metric units"
            accessibilityState={{ selected: units === "metric" }}
            disabled={!isHydrated}
            onPress={() => setUnits("metric")}
            style={({ pressed }) => [
              styles.unitChip,
              units === "metric" && styles.unitChipSelected,
              pressed && styles.unitChipPressed,
            ]}
          >
            <ThemedText
              lightColor={
                units === "metric"
                  ? APP_SHELL_MAIN_TEXT_COLOR
                  : APP_SHELL_LABEL_COLOR
              }
              darkColor={
                units === "metric"
                  ? APP_SHELL_MAIN_TEXT_COLOR
                  : APP_SHELL_LABEL_COLOR
              }
              style={styles.unitChipLabel}
            >
              Metric
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Imperial units"
            accessibilityState={{ selected: units === "imperial" }}
            disabled={!isHydrated}
            onPress={() => setUnits("imperial")}
            style={({ pressed }) => [
              styles.unitChip,
              units === "imperial" && styles.unitChipSelected,
              pressed && styles.unitChipPressed,
            ]}
          >
            <ThemedText
              lightColor={
                units === "imperial"
                  ? APP_SHELL_MAIN_TEXT_COLOR
                  : APP_SHELL_LABEL_COLOR
              }
              darkColor={
                units === "imperial"
                  ? APP_SHELL_MAIN_TEXT_COLOR
                  : APP_SHELL_LABEL_COLOR
              }
              style={styles.unitChipLabel}
            >
              Imperial
            </ThemedText>
          </Pressable>
        </View>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.unitFootnote}
        >
          {units === "metric"
            ? "Examples: kilograms, kilometers, milliliters."
            : "Examples: pounds, miles, fluid ounces."}
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.sectionTitle}
          accessibilityRole="header"
        >
          Day starts at
        </ThemedText>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.sectionHint}
        >
          Habit logs and daily goals use this boundary for “today.” Changing it
          can re-open local day bonuses until a server is authoritative.
        </ThemedText>
        <View style={styles.dayStartChips}>
          {DAY_START_PRESETS.map((preset) => {
            const selected = prefs.dayStartsAtMinutes === preset.minutes;
            return (
              <Pressable
                key={preset.minutes}
                accessibilityRole="button"
                accessibilityLabel={`Day starts at ${preset.label}`}
                accessibilityState={{ selected }}
                disabled={!isHydrated}
                onPress={() => {
                  void updatePrefs({ dayStartsAtMinutes: preset.minutes });
                }}
                style={({ pressed }) => [
                  styles.dayStartChip,
                  selected && styles.unitChipSelected,
                  pressed && styles.unitChipPressed,
                ]}
              >
                <ThemedText
                  lightColor={
                    selected
                      ? APP_SHELL_MAIN_TEXT_COLOR
                      : APP_SHELL_LABEL_COLOR
                  }
                  darkColor={
                    selected
                      ? APP_SHELL_MAIN_TEXT_COLOR
                      : APP_SHELL_LABEL_COLOR
                  }
                  style={styles.unitChipLabel}
                >
                  {preset.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        {!DAY_START_PRESETS.some(
          (p) => p.minutes === prefs.dayStartsAtMinutes,
        ) ? (
          <ThemedText
            lightColor={APP_SHELL_LABEL_COLOR}
            darkColor={APP_SHELL_LABEL_COLOR}
            style={styles.unitFootnote}
          >
            Current: {formatDayStartLabel(prefs.dayStartsAtMinutes)}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 0,
    paddingBottom: 28,
  },
  leadSection: {
    gap: 10,
    paddingBottom: 6,
  },
  section: {
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: APP_SHELL_INPUT_BOARDER_COLOR,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
  },
  sectionHint: {
    fontSize: 13,
    lineHeight: 19,
  },
  themeList: {
    gap: 8,
    marginTop: 4,
  },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: APP_SHELL_INPUT_BOARDER_COLOR,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  themeRowSelected: {
    borderColor: "rgba(120,200,255,0.65)",
    backgroundColor: "rgba(120,200,255,0.12)",
  },
  themeRowLocked: {
    opacity: 0.72,
  },
  pressed: {
    opacity: 0.9,
  },
  themeRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.35)",
  },
  swatchLocked: {
    opacity: 0.55,
  },
  themeTextBlock: {
    flex: 1,
    gap: 2,
  },
  themeName: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  themeMeta: {
    fontSize: 12,
    lineHeight: 17,
  },
  unitChips: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  dayStartChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  unitChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: APP_SHELL_INPUT_BOARDER_COLOR,
    alignItems: "center",
  },
  dayStartChip: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: APP_SHELL_INPUT_BOARDER_COLOR,
    alignItems: "center",
    minWidth: "45%",
    flexGrow: 1,
  },
  unitChipSelected: {
    borderColor: "rgba(120,200,255,0.65)",
    backgroundColor: "rgba(120,200,255,0.12)",
  },
  unitChipPressed: {
    opacity: 0.9,
  },
  unitChipLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  unitFootnote: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
});
