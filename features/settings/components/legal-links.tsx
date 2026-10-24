import Constants from "expo-constants";
import { Fragment, useRef } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  SettingsDivider,
  SettingsIntro,
  SettingsLinkRow,
  SettingsSection,
} from "@/features/settings/components/settings-ui";
import { APP_SHELL_LABEL_COLOR } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { sendTestError } from "@/lib/crash-reporting";
import { LEGAL_PAGES, openLegalPage, type LegalPageId } from "@/lib/legal";

/** Taps on the version line that send a Sentry test error. */
const TEST_ERROR_TAPS = 7;

const PAGES: { id: LegalPageId; caption: string }[] = [
  { id: "privacy", caption: "What we collect and how it's used" },
  { id: "terms", caption: "Community rules and your agreement with us" },
];

export function LegalLinks() {
  const taps = useRef(0);
  const onVersionPress = () => {
    taps.current += 1;
    if (taps.current < TEST_ERROR_TAPS) return;
    taps.current = 0;
    Alert.alert(
      "Crash reporting",
      sendTestError()
        ? "Test error sent to Sentry."
        : "Crash reporting is off in development builds.",
    );
  };

  return (
    <View style={styles.root}>
      <SettingsIntro>
        Opens in a browser sheet. You agreed to these when you created your
        account.
      </SettingsIntro>
      <SettingsSection title="documents">
        {PAGES.map((page, index) => (
          <Fragment key={page.id}>
            {index > 0 ? <SettingsDivider /> : null}
            <SettingsLinkRow
              title={LEGAL_PAGES[page.id].label}
              description={page.caption}
              onPress={() => {
                void openLegalPage(page.id);
              }}
              accessibilityLabel={`${LEGAL_PAGES[page.id].label}. ${page.caption}`}
            />
          </Fragment>
        ))}
      </SettingsSection>
      <Pressable onPress={onVersionPress} accessibilityRole="text" hitSlop={12}>
        <Text style={styles.version}>
          Fit Pixel v{Constants.expoConfig?.version ?? "?"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 20,
  },
  version: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    color: APP_SHELL_LABEL_COLOR,
    textAlign: "center",
    marginTop: 8,
  },
});
