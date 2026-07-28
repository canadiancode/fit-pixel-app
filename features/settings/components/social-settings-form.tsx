import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_LABEL_COLOR } from "@/constants/app-colors";
import { SettingsSingleLineTextField } from "@/features/settings/components/settings-text-field";
import { usePrefsProfile } from "@/features/settings/prefs-profile-context";

const SAVE_DEBOUNCE_MS = 300;

export function SocialSettingsForm() {
  const { profile, isHydrated, updateProfile } = usePrefsProfile();
  const [instagram, setInstagram] = useState(profile.instagram ?? "");
  const [tiktok, setTiktok] = useState(profile.tiktok ?? "");
  const [youtube, setYoutube] = useState(profile.youtube ?? "");

  useEffect(() => {
    setInstagram(profile.instagram ?? "");
    setTiktok(profile.tiktok ?? "");
    setYoutube(profile.youtube ?? "");
  }, [profile.instagram, profile.tiktok, profile.youtube]);

  useEffect(() => {
    if (!isHydrated) return;
    const handle = setTimeout(() => {
      void updateProfile({
        instagram: instagram.trim() === "" ? null : instagram,
        tiktok: tiktok.trim() === "" ? null : tiktok,
        youtube: youtube.trim() === "" ? null : youtube,
      }).catch(() => {
        // Invalid scheme — leave local draft; user can fix.
      });
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [instagram, tiktok, youtube, isHydrated, updateProfile]);

  return (
    <View style={styles.root}>
      <View style={styles.field}>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.fieldLabel}
        >
          Instagram
        </ThemedText>
        <SettingsSingleLineTextField
          accessibilityLabel="Instagram profile or link"
          value={instagram}
          onChangeText={setInstagram}
          placeholder="@yourhandle or profile link"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={200}
          editable={isHydrated}
        />
      </View>

      <View style={styles.field}>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.fieldLabel}
        >
          TikTok
        </ThemedText>
        <SettingsSingleLineTextField
          accessibilityLabel="TikTok profile or link"
          value={tiktok}
          onChangeText={setTiktok}
          placeholder="@yourhandle or profile link"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={200}
          editable={isHydrated}
        />
      </View>

      <View style={styles.field}>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.fieldLabel}
        >
          YouTube
        </ThemedText>
        <SettingsSingleLineTextField
          accessibilityLabel="YouTube channel or link"
          value={youtube}
          onChangeText={setYoutube}
          placeholder="@yourhandle or channel link"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={200}
          editable={isHydrated}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 22,
    paddingBottom: 28,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
});
