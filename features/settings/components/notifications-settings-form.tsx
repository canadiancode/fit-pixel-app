import { Platform, StyleSheet, View } from "react-native";

import {
  SettingsSection,
  SettingsToggleRow,
} from "@/features/settings/components/settings-ui";
import { usePush } from "@/features/push/push-context";

export function NotificationsSettingsForm() {
  const push = usePush();

  return (
    <View style={styles.root}>
      <SettingsSection
        title="on this phone"
        footer={
          push.loaded && !push.enabled
            ? `If ${Platform.OS === "android" ? "Android" : "iOS"} has notifications off for Fit Pixel, turning this on takes you to Settings.`
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

      {/* Accountability reminders and news pushes are hidden until they are
          sent; prefs.notifAccountability / notifNews keep any saved choice. */}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 28,
  },
});
