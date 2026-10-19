import { usePathname, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_SECONDARY_BACKGROUND,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";

import { SETTINGS_ROWS } from "../data";
import {
  SETTINGS_CARD_FILL,
  SETTINGS_CARD_RIM,
  SETTINGS_DIVIDER,
} from "./settings-ui";

type Props = {
  children: React.ReactNode;
  /** Defaults to the Settings list label for this route. */
  title?: string;
};

function titleForPath(pathname: string): string {
  const id = pathname.split("/").filter(Boolean).pop();
  return SETTINGS_ROWS.find((row) => row.id === id)?.label ?? "Settings";
}

/** Settings sub-page: pixel back button + page title, scrolling body. */
export function SettingsSubScreenLayout({ children, title }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const heading = title ?? titleForPath(pathname);

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to settings"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {heading}
        </Text>
      </View>
      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SETTINGS_DIVIDER,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: SETTINGS_CARD_RIM,
    backgroundColor: SETTINGS_CARD_FILL,
    alignItems: "center",
    justifyContent: "center",
  },
  backGlyph: {
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    lineHeight: 20,
    marginLeft: -2,
  },
  title: {
    flex: 1,
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.8,
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
});
