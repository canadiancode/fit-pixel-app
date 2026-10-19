import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { LEGAL_PAGES, openLegalPage, type LegalPageId } from "@/lib/legal";

const PAGES: { id: LegalPageId; caption: string }[] = [
  { id: "privacy", caption: "What we collect and how it's used" },
  { id: "terms", caption: "Community rules and your agreement with us" },
];

export function LegalLinks() {
  return (
    <View style={styles.root}>
      {PAGES.map((page) => (
        <Pressable
          key={page.id}
          accessibilityRole="link"
          accessibilityLabel={`${LEGAL_PAGES[page.id].label}. ${page.caption}`}
          onPress={() => {
            void openLegalPage(page.id);
          }}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <View style={styles.text}>
            <ThemedText
              lightColor={APP_SHELL_MAIN_TEXT_COLOR}
              darkColor={APP_SHELL_MAIN_TEXT_COLOR}
              style={styles.label}
            >
              {LEGAL_PAGES[page.id].label}
            </ThemedText>
            <ThemedText
              lightColor={APP_SHELL_LABEL_COLOR}
              darkColor={APP_SHELL_LABEL_COLOR}
              style={styles.caption}
            >
              {page.caption}
            </ThemedText>
          </View>
          <ThemedText
            lightColor={APP_SHELL_LABEL_COLOR}
            darkColor={APP_SHELL_LABEL_COLOR}
            style={styles.chevron}
          >
            {">"}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 4,
    paddingBottom: 28,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.16)",
  },
  rowPressed: {
    opacity: 0.6,
  },
  text: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
  },
  chevron: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
  },
});
