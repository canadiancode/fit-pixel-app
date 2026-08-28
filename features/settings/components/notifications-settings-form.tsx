import { StyleSheet, Switch, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_INPUT_BOARDER_COLOR,
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { usePrefsProfile } from "@/features/settings/prefs-profile-context";

export function NotificationsSettingsForm() {
  const { prefs, isHydrated, updatePrefs } = usePrefsProfile();

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.cardTitle}
            accessibilityRole="header"
          >
            Accountability reminders
          </ThemedText>
          <Switch
            accessibilityLabel="Accountability reminders"
            accessibilityHint="Toggles banner reminders to help you hit your daily goals"
            value={prefs.notifAccountability}
            disabled={!isHydrated}
            onValueChange={(value) => {
              void updatePrefs({ notifAccountability: value });
            }}
            ios_backgroundColor={APP_SHELL_INPUT_BOARDER_COLOR}
            trackColor={{
              false: APP_SHELL_INPUT_BOARDER_COLOR,
              true: "rgba(120,200,255,0.55)",
            }}
            thumbColor={APP_SHELL_MAIN_TEXT_COLOR}
          />
        </View>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.cardBody}
        >
          Get light banner notifications on your phone during the day—quick
          nudges tied to the goals you set here so you remember to log work,
          check in, and keep momentum before the day slips by. Turn this off
          anytime.
        </ThemedText>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.cardTitle}
            accessibilityRole="header"
          >
            News and updates
          </ThemedText>
          <Switch
            accessibilityLabel="News and updates"
            accessibilityHint="Toggles notifications about new releases and product news"
            value={prefs.notifNews}
            disabled={!isHydrated}
            onValueChange={(value) => {
              void updatePrefs({ notifNews: value });
            }}
            ios_backgroundColor={APP_SHELL_INPUT_BOARDER_COLOR}
            trackColor={{
              false: APP_SHELL_INPUT_BOARDER_COLOR,
              true: "rgba(120,200,255,0.55)",
            }}
            thumbColor={APP_SHELL_MAIN_TEXT_COLOR}
          />
        </View>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.cardBody}
        >
          Hear when we ship something worth knowing—new features, fixes, and
          occasional notes on what we’re building. We keep it sparse: no spam,
          just useful updates when there’s real news.
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 14,
    paddingBottom: 28,
  },
  card: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: APP_SHELL_INPUT_BOARDER_COLOR,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
    paddingTop: 2,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
  },
});
