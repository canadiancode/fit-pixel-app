import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PixelFrameBackdrop, PixelPanel } from "@/components/pixel-panel";
import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import type { ChatSection } from "@/features/chat/chat-search-context";
import { CHAT_BADGE_COLOR } from "@/features/chat/constants";

const SECTIONS: readonly { id: ChatSection; label: string }[] = [
  { id: "gyms", label: "Gyms" },
  { id: "messages", label: "Messages" },
  { id: "friends", label: "Friends" },
  { id: "ranks", label: "Ranks" },
];

type Props = {
  active: ChatSection;
  onChange: (section: ChatSection) => void;
  /** Red count beside a label (unread DMs, incoming friend requests). */
  badges?: Partial<Record<ChatSection, number>>;
};

/** Gyms / Messages / Friends / Ranks switcher at the top of the Chat tab. */
export function ChatSectionTabs({ active, onChange, badges }: Props) {
  return (
    <PixelPanel frame="well" style={styles.track} accessibilityRole="tablist">
      {SECTIONS.map((section) => {
        const selected = section.id === active;
        const count = badges?.[section.id] ?? 0;
        return (
          <View key={section.id} style={styles.tabOuter}>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={
                count > 0 ? `${section.label}, ${count} new` : section.label
              }
              onPress={() => {
                if (selected) return;
                if (process.env.EXPO_OS === "ios") {
                  void Haptics.selectionAsync();
                }
                onChange(section.id);
              }}
            >
              {({ pressed }) => (
                <View style={[styles.tab, pressed && !selected && styles.tabPressed]}>
                  {selected ? <PixelFrameBackdrop frame="button" /> : null}
                  <ThemedText
                    lightColor={
                      selected
                        ? APP_SHELL_MAIN_TEXT_COLOR
                        : APP_SHELL_LABEL_COLOR
                    }
                    darkColor={
                      selected
                        ? APP_SHELL_MAIN_TEXT_COLOR
                        : APP_SHELL_LABEL_COLOR
                    }
                    style={styles.label}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {section.label}
                  </ThemedText>
                  {count > 0 ? (
                    <View style={styles.badge} pointerEvents="none">
                      <Text style={styles.badgeText}>
                        {count > 9 ? "9+" : String(count)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
            </Pressable>
          </View>
        );
      })}
    </PixelPanel>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    gap: 4,
    padding: 6,
  },
  tabOuter: {
    flex: 1,
    minWidth: 0,
  },
  tab: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabPressed: {
    opacity: 0.7,
  },
  label: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 14,
  },
  /** Square pixel badge pinned to the tab's corner so four labels keep their full width. */
  badge: {
    position: "absolute",
    top: -8,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: "#000a1c",
    backgroundColor: CHAT_BADGE_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 7,
    lineHeight: 9,
  },
});
