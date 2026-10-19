import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { SettingsSingleLineTextField } from "@/features/settings/components/settings-text-field";
import {
  SettingsField,
  SettingsIntro,
  SettingsSection,
} from "@/features/settings/components/settings-ui";
import { usePrefsProfile } from "@/features/settings/prefs-profile-context";

const SAVE_DEBOUNCE_MS = 400;
const LINK_MAX = 200;
const INVALID_LINK = "Use an @handle or a full https:// link.";

type Platform = "instagram" | "tiktok" | "youtube";

const FIELDS: {
  key: Platform;
  label: string;
  placeholder: string;
  a11y: string;
}[] = [
  {
    key: "instagram",
    label: "Instagram",
    placeholder: "@yourhandle",
    a11y: "Instagram handle or link",
  },
  {
    key: "tiktok",
    label: "TikTok",
    placeholder: "@yourhandle",
    a11y: "TikTok handle or link",
  },
  {
    key: "youtube",
    label: "YouTube",
    placeholder: "@yourchannel",
    a11y: "YouTube channel or link",
  },
];

export function SocialSettingsForm() {
  const { profile, isHydrated, updateProfile } = usePrefsProfile();
  const [values, setValues] = useState<Record<Platform, string>>({
    instagram: profile.instagram ?? "",
    tiktok: profile.tiktok ?? "",
    youtube: profile.youtube ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<Platform, string>>>({});

  useEffect(() => {
    setValues({
      instagram: profile.instagram ?? "",
      tiktok: profile.tiktok ?? "",
      youtube: profile.youtube ?? "",
    });
  }, [profile.instagram, profile.tiktok, profile.youtube]);

  // Save each field on its own so one bad link doesn't block the others, and
  // say which one needs fixing instead of silently dropping it.
  useEffect(() => {
    if (!isHydrated) return;
    const handle = setTimeout(() => {
      for (const { key } of FIELDS) {
        const raw = values[key].trim();
        const current = profile[key] ?? "";
        if (raw === current) {
          setErrors((prev) => ({ ...prev, [key]: undefined }));
          continue;
        }
        void updateProfile({ [key]: raw === "" ? null : raw })
          .then(() => setErrors((prev) => ({ ...prev, [key]: undefined })))
          .catch(() => setErrors((prev) => ({ ...prev, [key]: INVALID_LINK })));
      }
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // profile fields are compared, not re-saved, so they stay out of deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, isHydrated, updateProfile]);

  return (
    <View style={styles.root}>
      <SettingsIntro>
        Add the accounts you post your training on. Changes save automatically.
      </SettingsIntro>
      <SettingsSection title="your links" bare>
        <View style={styles.fields}>
          {FIELDS.map((field) => (
            <SettingsField
              key={field.key}
              label={field.label}
              error={errors[field.key]}
              hint="@handle or profile link"
            >
              <SettingsSingleLineTextField
                accessibilityLabel={field.a11y}
                value={values[field.key]}
                onChangeText={(text) =>
                  setValues((prev) => ({ ...prev, [field.key]: text }))
                }
                placeholder={field.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                textContentType="URL"
                maxLength={LINK_MAX}
                editable={isHydrated}
                returnKeyType="done"
              />
            </SettingsField>
          ))}
        </View>
      </SettingsSection>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 20,
  },
  fields: {
    gap: 22,
  },
});
