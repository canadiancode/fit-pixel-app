import { StyleSheet, View } from "react-native";

import {
  SettingsDivider,
  SettingsSection,
  SettingsToggleRow,
} from "@/features/settings/components/settings-ui";
import { usePush } from "@/features/push/push-context";
import { usePrefsProfile } from "@/features/settings/prefs-profile-context";

export function NotificationsSettingsForm() {
  const { prefs, isHydrated, updatePrefs } = usePrefsProfile();
  const push = usePush();

  return (
    <View style={styles.root}>
      <SettingsSection
        title="on this phone"
        footer={
          push.loaded && !push.enabled
            ? "If iOS has notifications off for Fit Pixel, turning this on takes you to Settings."
            : null
        }
      >
        <SettingsToggleRow
          title="Friends & messages"
          description="A push when a Pixel messages you, or sends or accepts a friend request."
          value={push.enabled}
          disabled={!push.loaded}
          onValueChange={(value) => {
            void push.setEnabled(value);
          }}
          accessibilityHint="Push notifications for friend requests and direct messages on this device"
        />
      </SettingsSection>

      <SettingsSection
        title="coming soon"
        footer="These aren't sent yet. We'll use your choice when they launch."
      >
        <SettingsToggleRow
          title="Accountability reminders"
          description="Nudges during the day to log your habits and hit your goals."
          value={prefs.notifAccountability}
          disabled={!isHydrated}
          onValueChange={(value) => {
            void updatePrefs({ notifAccountability: value });
          }}
        />
        <SettingsDivider />
        <SettingsToggleRow
          title="News & updates"
          description="Now and then: new features, items and fixes. No spam."
          value={prefs.notifNews}
          disabled={!isHydrated}
          onValueChange={(value) => {
            void updatePrefs({ notifNews: value });
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
});
