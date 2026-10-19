import { Image } from "expo-image";
import { router, usePathname, useRouter } from "expo-router";
import { useMemo } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

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
import {
  useChatSearch,
  type ChatSection,
} from "@/features/chat/chat-search-context";
import {
  useChatThreadHeaderState,
  type ChatThreadHeader,
} from "@/features/chat/chat-thread-header-context";
import { CHAT_CARD_FILL, CHAT_CARD_RIM } from "@/features/chat/constants";
import { goBackInChat } from "@/features/chat/navigation";
import { useNotifications } from "@/features/social/notifications-context";

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

const SECTION_SEARCH_COPY: Record<
  ChatSection,
  { placeholder: string; a11yLabel: string }
> = {
  gyms: { placeholder: "Search gyms", a11yLabel: "Search gym chats" },
  messages: { placeholder: "Search DMs", a11yLabel: "Search messages" },
  friends: { placeholder: "Find Pixels", a11yLabel: "Find Pixels by name" },
};

/** Gym chat and DM threads show Back + title in the band instead of search. */
function isThreadPath(pathname: string): boolean {
  return pathname.includes("/gym-chat/") || pathname.includes("/dm/");
}

/** Primary header band; same dimensions as Settings / Actions / Map. */
export function ChatHeader() {
  const { query, setQuery, section, searchInputRef } = useChatSearch();
  const { unreadCount } = useNotifications();
  const pathname = usePathname();
  const thread = useChatThreadHeaderState();
  const { placeholder, a11yLabel } = useMemo(
    () => SECTION_SEARCH_COPY[section],
    [section],
  );
  const showThread = thread != null && isThreadPath(pathname);

  return (
    <View style={styles.headerRow}>
      <View style={styles.contentBlock}>
        <View style={styles.searchRow}>
          {showThread ? (
            <ThreadTitle header={thread} />
          ) : (
            <View style={styles.inputShell}>
              <Image
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                source={SEARCH_INPUT_BACKGROUND}
                style={StyleSheet.absoluteFillObject}
                contentFit="fill"
              />
              <TextInput
                ref={searchInputRef}
                accessibilityLabel={a11yLabel}
                value={query}
                onChangeText={setQuery}
                placeholder={placeholder}
                placeholderTextColor={APP_SHELL_INPUT_PLACEHOLDER_COLOR}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="always"
                returnKeyType="search"
                blurOnSubmit
                underlineColorAndroid="transparent"
                {...SINGLE_LINE_ANDROID}
              />
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
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
            {unreadCount > 0 ? (
              <View style={styles.bellBadge} pointerEvents="none">
                <Text style={styles.bellBadgeText}>
                  {unreadCount > 9 ? "9+" : String(unreadCount)}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Pixel back button + thread title / subtitle (fills the search slot). */
function ThreadTitle({ header }: { header: ChatThreadHeader }) {
  const nav = useRouter();
  const titleBlock = (
    <View style={styles.threadText}>
      <Text style={styles.threadTitle} numberOfLines={2} allowFontScaling>
        {header.title}
      </Text>
      {header.subtitle ? (
        <Text style={styles.threadSubtitle} numberOfLines={1}>
          {header.subtitle}
        </Text>
      ) : null}
    </View>
  );
  return (
    <View style={styles.threadRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={8}
        onPress={() => goBackInChat(nav)}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <Text style={styles.backGlyph}>‹</Text>
      </Pressable>
      {header.onTitlePress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={header.title}
          accessibilityHint={header.titleA11yHint}
          onPress={header.onTitlePress}
          style={({ pressed }) => [
            styles.threadTextHit,
            pressed && styles.pressed,
          ]}
        >
          {titleBlock}
        </Pressable>
      ) : (
        <View
          style={styles.threadTextHit}
          accessibilityRole="header"
          accessible
          accessibilityLabel={
            header.subtitle
              ? `${header.title}. ${header.subtitle}`
              : header.title
          }
        >
          {titleBlock}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  threadRow: {
    flex: 1,
    minWidth: 0,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: CHAT_CARD_RIM,
    backgroundColor: CHAT_CARD_FILL,
    alignItems: "center",
    justifyContent: "center",
  },
  backGlyph: {
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    lineHeight: 22,
    marginLeft: -2,
  },
  threadTextHit: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  threadText: {
    gap: 4,
  },
  threadTitle: {
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    lineHeight: 18,
  },
  threadSubtitle: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 13,
  },
  pressed: {
    opacity: 0.8,
  },
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
  bellBadge: {
    position: "absolute",
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: "#ff5a5a",
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadgeText: {
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontSize: 10,
    fontWeight: "700",
  },
});
