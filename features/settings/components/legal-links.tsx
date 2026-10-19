import { Fragment } from "react";
import { StyleSheet, View } from "react-native";

import {
  SettingsDivider,
  SettingsIntro,
  SettingsLinkRow,
  SettingsSection,
} from "@/features/settings/components/settings-ui";
import { LEGAL_PAGES, openLegalPage, type LegalPageId } from "@/lib/legal";

const PAGES: { id: LegalPageId; caption: string }[] = [
  { id: "privacy", caption: "What we collect and how it's used" },
  { id: "terms", caption: "Community rules and your agreement with us" },
];

export function LegalLinks() {
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 20,
  },
});
