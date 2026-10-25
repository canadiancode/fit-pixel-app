import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { BODY_SIZE_LEVELS } from "@/features/pixel/character-catalog";
import { PixelFigure } from "@/features/pixel/components/pixel-character";
import { PIXEL_FIGURE_ASPECT_RATIO } from "@/features/pixel/figure-geometry";
import { usePixelLoadout } from "@/features/pixel/pixel-loadout-context";
import type { PixelBodySize, PixelGender } from "@/features/pixel/types";
import { HomeGymPicker } from "@/features/settings/components/home-gym-picker";
import { SettingsBioTextField } from "@/features/settings/components/settings-text-field";
import {
  SettingsField,
  SettingsSection,
  SettingsSegmented,
  SettingsToggleRow,
} from "@/features/settings/components/settings-ui";
import { usePrefsProfile } from "@/features/settings/prefs-profile-context";

const SAVE_DEBOUNCE_MS = 300;
const BIO_MAX = 500;
const PREVIEW_HEIGHT = 128;

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
] as const;

const BUILD_LABELS: Record<PixelBodySize, string> = {
  small: "Starter build",
  medium: "Medium build",
  big: "Big build",
};

function nextBuildHint(size: PixelBodySize): string {
  if (size === "small") return `Medium build at level ${BODY_SIZE_LEVELS.medium}.`;
  if (size === "medium") return `Big build at level ${BODY_SIZE_LEVELS.big}.`;
  return "Strongest build unlocked.";
}

export function ProfileSettingsForm() {
  const { profile, isHydrated, updateProfile } = usePrefsProfile();
  const { loadout, gender, bodySize, changeGender } = usePixelLoadout();
  const [bio, setBio] = useState(profile.bio);

  useEffect(() => {
    setBio(profile.bio);
  }, [profile.bio]);

  useEffect(() => {
    if (!isHydrated) return;
    const handle = setTimeout(() => {
      void updateProfile({ bio });
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [bio, isHydrated, updateProfile]);

  return (
    <View style={styles.root}>
      <SettingsSection
        title="your pixel"
        footer="Switching keeps your skin tone, hair and face. Clothes swap to the matching cut."
      >
        <View style={styles.pixelRow}>
          <PixelFigure
            loadout={loadout}
            accessibilityLabel="Your pixel"
            style={styles.preview}
          />
          <View style={styles.pixelControls}>
            <SettingsSegmented<PixelGender>
              accessibilityLabel="Pixel body"
              options={GENDER_OPTIONS}
              value={gender ?? "male"}
              onChange={changeGender}
            />
            <View style={styles.buildText}>
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={styles.buildLabel}
              >
                {BUILD_LABELS[bodySize]}
              </ThemedText>
              <ThemedText
                lightColor={APP_SHELL_LABEL_COLOR}
                darkColor={APP_SHELL_LABEL_COLOR}
                style={styles.buildHint}
              >
                {nextBuildHint(bodySize)}
              </ThemedText>
            </View>
          </View>
        </View>
      </SettingsSection>

      <SettingsSection
        title="pixel card"
        footer="Changes save automatically."
        bare
      >
        <View style={styles.fields}>
          <SettingsField
            label="Bio"
            hint="A line or two about your training."
            counter={`${bio.length}/${BIO_MAX}`}
          >
            <SettingsBioTextField
              accessibilityLabel="Bio"
              value={bio}
              onChangeText={setBio}
              placeholder="Just a pixel getting fit"
              maxLength={BIO_MAX}
              editable={isHydrated}
              plain
              shellStyle={styles.bioBox}
              style={[styles.inputText, styles.bioText]}
            />
          </SettingsField>

          <SettingsField label="Home gym" hint="Where you usually train.">
            <HomeGymPicker
              homeGymId={profile.homeGymId}
              homeGymName={profile.homeGymName}
              disabled={!isHydrated}
              onChange={(gym) => {
                void updateProfile({
                  homeGymId: gym?.id ?? null,
                  homeGymName: gym?.name ?? null,
                });
              }}
            />
          </SettingsField>
        </View>
      </SettingsSection>

      <SettingsSection
        title="visibility"
        footer="Your display name and Pixel look are always visible to other Pixels."
      >
        <SettingsToggleRow
          title="Public profile"
          description="Show your bio and home gym on your Pixel card."
          value={profile.profileVisible}
          disabled={!isHydrated}
          onValueChange={(value) => {
            void updateProfile({ profileVisible: value });
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
  fields: {
    gap: 22,
  },
  pixelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  preview: {
    height: PREVIEW_HEIGHT,
    aspectRatio: PIXEL_FIGURE_ASPECT_RATIO,
  },
  pixelControls: {
    flex: 1,
    minWidth: 0,
    gap: 14,
  },
  buildText: {
    gap: 4,
  },
  buildLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    lineHeight: 18,
  },
  buildHint: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 16,
  },
  inputText: {
    fontSize: 12,
    paddingHorizontal: 14,
  },
  bioBox: {
    minHeight: 96,
  },
  bioText: {
    minHeight: 96,
    lineHeight: 18,
  },
});
