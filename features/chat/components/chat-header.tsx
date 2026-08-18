import { Image } from "expo-image";
import { router, usePathname } from "expo-router";
import { useMemo } from "react";
import { Platform, Pressable, StyleSheet, TextInput, View } from "react-native";

import {
  APP_SHELL_INPUT_PLACEHOLDER_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_PRIMARY_BACKGROUND,
} from "@/constants/app-colors";
import {
  TAB_HEADER_CONTENT_HEIGHT,
  TAB_HEADER_ROW_LAYOUT,
} from "@/constants/app-shell";
import { FONT_FAMILY } from "@/constants/fonts";
import { useChatSearch } from "@/features/chat/chat-search-context";

const SEARCH_INPUT_BACKGROUND = require("@/assets/backgrounds/search-input.png");
const BELL_ICON = require("@/assets/icons/bell.png");

const BELL_BUTTON_SIZE = 52;
const BELL_ICON_SIZE = 30;

const SINGLE_LINE_ANDROID = Platform.select({
  android: {
    includeFontPadding: false,
    textAlignVertical: "center" as const,
  },
  default: {},
});

function searchFieldCopy(pathname: string): {
  placeholder: string;
  a11yLabel: string;
} {
  if (pathname.includes("/gym-chat/")) {
    return { placeholder: "Search chat...", a11yLabel: "Search chat" };
  }
  if (pathname.includes("/gym-chats")) {
    return { placeholder: "Search chats", a11yLabel: "Search chats" };
  }
  return { placeholder: "Search Pixels", a11yLabel: "Search Pixels" };
}

/** Primary header band; same dimensions as Settings / Actions / Map. */
export function ChatHeader() {
  const { query, setQuery } = useChatSearch();
  const pathname = usePathname();
  const { placeholder, a11yLabel } = useMemo(
    () => searchFieldCopy(pathname),
    [pathname],
  );

  return (
    <View style={styles.headerRow}>
      <View style={styles.contentBlock}>
        <View style={styles.searchRow}>
          <View style={styles.inputShell}>
            <Image
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              source={SEARCH_INPUT_BACKGROUND}
              style={StyleSheet.absoluteFillObject}
              contentFit="fill"
            />
            <TextInput
              accessibilityLabel={a11yLabel}
              value={query}
              onChangeText={setQuery}
              placeholder={placeholder}
              placeholderTextColor={APP_SHELL_INPUT_PLACEHOLDER_COLOR}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              blurOnSubmit
              underlineColorAndroid="transparent"
              {...SINGLE_LINE_ANDROID}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => router.push("/(tabs)/chat/notifications")}
            style={({ pressed }) => [
              styles.bellButton,
              pressed && styles.bellButtonPressed,
            ]}
          >
            <Image
              source={BELL_ICON}
              style={styles.bellIcon}
              contentFit="contain"
              accessibilityIgnoresInvertColors
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    ...TAB_HEADER_ROW_LAYOUT,
    backgroundColor: APP_SHELL_PRIMARY_BACKGROUND,
  },
  contentBlock: {
    height: TAB_HEADER_CONTENT_HEIGHT,
    justifyContent: "flex-end",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputShell: {
    flex: 1,
    minWidth: 0,
    height: 52,
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
  },
  input: {
    width: "100%",
    height: 52,
    /** Extra space on the left for the search icon baked into the background asset. */
    paddingLeft: 55,
    /** Room for the iOS clear (“×”) control while editing. */
    paddingRight: 50,
    paddingVertical: 0,
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    color: APP_SHELL_MAIN_TEXT_COLOR,
    backgroundColor: "transparent",
  },
  bellButton: {
    width: BELL_BUTTON_SIZE,
    height: BELL_BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bellButtonPressed: {
    opacity: 0.85,
  },
  bellIcon: {
    width: BELL_ICON_SIZE,
    height: BELL_ICON_SIZE,
  },
});
