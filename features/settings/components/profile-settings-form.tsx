import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { HomeGymPicker } from "@/features/settings/components/home-gym-picker";
import {
  SettingsBioTextField,
  SettingsSingleLineTextField,
} from "@/features/settings/components/settings-text-field";
import {
  SettingsField,
  SettingsSection,
  SettingsToggleRow,
} from "@/features/settings/components/settings-ui";
import { usePrefsProfile } from "@/features/settings/prefs-profile-context";

const SAVE_DEBOUNCE_MS = 300;
const NAME_MAX = 80;
const BIO_MAX = 500;

export function ProfileSettingsForm() {
  const { profile, isHydrated, updateProfile } = usePrefsProfile();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);

  useEffect(() => {
    setDisplayName(profile.displayName);
    setBio(profile.bio);
  }, [profile.displayName, profile.bio]);

  useEffect(() => {
    if (!isHydrated) return;
    const handle = setTimeout(() => {
      void updateProfile({ displayName, bio });
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [displayName, bio, isHydrated, updateProfile]);

  return (
    <View style={styles.root}>
      <SettingsSection
        title="your pixel card"
        footer="Changes save automatically."
        bare
      >
        <View style={styles.fields}>
          <SettingsField
            label="Display name"
            hint="Shown in chats, search and on your Pixel card."
            counter={`${displayName.length}/${NAME_MAX}`}
          >
            <SettingsSingleLineTextField
              accessibilityLabel="Display name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Fit Pixel"
              autoCapitalize="words"
              autoCorrect
              maxLength={NAME_MAX}
              editable={isHydrated}
              returnKeyType="done"
            />
          </SettingsField>

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
});
