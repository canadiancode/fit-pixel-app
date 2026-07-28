import { useEffect, useState } from "react";
import { StyleSheet, Switch, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_INPUT_BOARDER_COLOR,
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import {
  SettingsBioTextField,
  SettingsSingleLineTextField,
} from "@/features/settings/components/settings-text-field";
import { usePrefsProfile } from "@/features/settings/prefs-profile-context";

const SAVE_DEBOUNCE_MS = 300;

export function ProfileSettingsForm() {
  const { profile, isHydrated, updateProfile } = usePrefsProfile();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [homeGymName, setHomeGymName] = useState(profile.homeGymName ?? "");

  useEffect(() => {
    setDisplayName(profile.displayName);
    setBio(profile.bio);
    setHomeGymName(profile.homeGymName ?? "");
  }, [profile.displayName, profile.bio, profile.homeGymName]);

  useEffect(() => {
    if (!isHydrated) return;
    const handle = setTimeout(() => {
      void updateProfile({
        displayName,
        bio,
        homeGymName: homeGymName.trim() === "" ? null : homeGymName,
      });
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [displayName, bio, homeGymName, isHydrated, updateProfile]);

  return (
    <View style={styles.root}>
      <View style={styles.field}>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.fieldLabel}
        >
          Display name
        </ThemedText>
        <SettingsSingleLineTextField
          accessibilityLabel="Display name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Fit Pixel"
          autoCapitalize="words"
          autoCorrect
          maxLength={80}
          editable={isHydrated}
        />
      </View>

      <View style={styles.field}>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.fieldLabel}
        >
          Bio
        </ThemedText>
        <SettingsBioTextField
          accessibilityLabel="Bio"
          value={bio}
          onChangeText={setBio}
          placeholder="Just a pixel getting fit"
          maxLength={500}
          editable={isHydrated}
        />
      </View>

      <View style={styles.field}>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.fieldLabel}
        >
          Home gym
        </ThemedText>
        <SettingsSingleLineTextField
          accessibilityLabel="Home gym name"
          value={homeGymName}
          onChangeText={setHomeGymName}
          placeholder="No gym selected"
          autoCapitalize="words"
          autoCorrect
          maxLength={120}
          editable={isHydrated}
        />
      </View>

      <View style={[styles.field, styles.visibilityRow]}>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.fieldLabel}
        >
          Profile visibility
        </ThemedText>
        <Switch
          accessibilityLabel="Profile visibility"
          accessibilityHint="When off, your profile should not be published later"
          value={profile.profileVisible}
          disabled={!isHydrated}
          onValueChange={(value) => {
            void updateProfile({ profileVisible: value });
          }}
          ios_backgroundColor={APP_SHELL_INPUT_BOARDER_COLOR}
          trackColor={{
            false: APP_SHELL_INPUT_BOARDER_COLOR,
            true: "rgba(120,200,255,0.55)",
          }}
          thumbColor={APP_SHELL_MAIN_TEXT_COLOR}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 22,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  visibilityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
});
