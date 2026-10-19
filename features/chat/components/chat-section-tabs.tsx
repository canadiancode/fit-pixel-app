import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_PRIMARY_BACKGROUND,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import type { ChatSection } from "@/features/chat/chat-search-context";
import {
  CHAT_BADGE_COLOR,
  CHAT_CARD_RIM,
  CHAT_CARD_RIM_ACTIVE,
  CHAT_TRACK_FILL,
} from "@/features/chat/constants";

const SECTIONS: readonly { id: ChatSection; label: string }[] = [
  { id: "gyms", label: "Gyms" },
  { id: "messages", label: "Messages" },
  { id: "friends", label: "Friends" },
];

type Props = {
  active: ChatSection;
  onChange: (section: ChatSection) => void;
  /** Red count beside a label (unread DMs, incoming friend requests). */
  badges?: Partial<Record<ChatSection, number>>;
};

/** Gyms / Messages / Friends switcher at the top of the Chat tab. */
export function ChatSectionTabs({ active, onChange, badges }: Props) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
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
                <View
                  style={[
                    styles.tab,
                    selected && styles.tabSelected,
                    pressed && !selected && styles.tabPressed,
                  ]}
                >
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
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    borderRadius: 12,
    backgroundColor: CHAT_TRACK_FILL,
    borderWidth: 2,
    borderColor: CHAT_CARD_RIM,
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
    gap: 6,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  tabSelected: {
    backgroundColor: APP_SHELL_PRIMARY_BACKGROUND,
    borderColor: CHAT_CARD_RIM_ACTIVE,
  },
  tabPressed: {
    opacity: 0.7,
  },
  label: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 14,
  },
  badge: {
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: CHAT_BADGE_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontSize: 9,
    fontWeight: "700",
  },
});
