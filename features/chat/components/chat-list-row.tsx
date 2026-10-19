import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import {
  CHAT_CARD_FILL,
  CHAT_CARD_RIM,
  CHAT_CARD_RIM_ACTIVE,
  CHAT_UNREAD_DOT_COLOR,
} from "@/features/chat/constants";

type Props = {
  leading: ReactNode;
  title: string;
  subtitle?: string | null;
  /** Small text at the top-right (e.g. "5m"). */
  meta?: string | null;
  /** Bold title, bright preview, brighter rim and a dot. */
  unread?: boolean;
  /** Buttons at the end of the row (outside the row's own press target). */
  trailing?: ReactNode;
  /** "›" affordance inside the press target (rows that only navigate). */
  showChevron?: boolean;
  /** Full-width block under the row (e.g. Accept / Decline). */
  footer?: ReactNode;
  /** Lines before the title truncates (gym names run long). */
  titleLines?: number;
  onPress: () => void;
  accessibilityLabel: string;
};

/** Pixel-card list row for the Chat tab (DMs, friends, requests, gyms). */
export function ChatListRow({
  leading,
  title,
  subtitle,
  meta,
  unread = false,
  trailing,
  showChevron = false,
  footer,
  titleLines = 1,
  onPress,
  accessibilityLabel,
}: Props) {
  return (
    <View style={[styles.card, unread && styles.cardUnread]}>
      <View style={styles.mainRow}>
        <View style={styles.hitOuter}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            onPress={onPress}
          >
            {({ pressed }) => (
              <View style={[styles.hit, pressed && styles.pressed]}>
                <View style={styles.leading}>{leading}</View>
                <View style={styles.textColumn}>
                  <View style={styles.titleLine}>
                    <ThemedText
                      lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                      darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                      style={[styles.title, unread && styles.titleUnread]}
                      numberOfLines={titleLines}
                    >
                      {title}
                    </ThemedText>
                    {meta ? (
                      <ThemedText
                        lightColor={APP_SHELL_LABEL_COLOR}
                        darkColor={APP_SHELL_LABEL_COLOR}
                        style={styles.meta}
                        numberOfLines={1}
                      >
                        {meta}
                      </ThemedText>
                    ) : null}
                  </View>
                  {subtitle ? (
                    <View style={styles.subtitleLine}>
                      <ThemedText
                        lightColor={
                          unread
                            ? APP_SHELL_MAIN_TEXT_COLOR
                            : APP_SHELL_LABEL_COLOR
                        }
                        darkColor={
                          unread
                            ? APP_SHELL_MAIN_TEXT_COLOR
                            : APP_SHELL_LABEL_COLOR
                        }
                        style={styles.subtitle}
                        numberOfLines={1}
                      >
                        {subtitle}
                      </ThemedText>
                      {unread ? <View style={styles.unreadDot} /> : null}
                    </View>
                  ) : null}
                </View>
                {showChevron ? (
                  <ThemedText
                    lightColor={APP_SHELL_LABEL_COLOR}
                    darkColor={APP_SHELL_LABEL_COLOR}
                    style={styles.chevron}
                  >
                    ›
                  </ThemedText>
                ) : null}
              </View>
            )}
          </Pressable>
        </View>
        {trailing != null ? (
          <View style={styles.trailing}>{trailing}</View>
        ) : null}
      </View>
      {footer != null ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: CHAT_CARD_RIM,
    backgroundColor: CHAT_CARD_FILL,
    overflow: "hidden",
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardUnread: {
    borderColor: CHAT_CARD_RIM_ACTIVE,
  },
  hitOuter: {
    flex: 1,
    minWidth: 0,
  },
  hit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 12,
  },
  pressed: {
    opacity: 0.85,
  },
  leading: {
    flexShrink: 0,
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  titleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
  },
  titleUnread: {
    fontWeight: "700",
  },
  meta: {
    flexShrink: 0,
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 12,
  },
  subtitleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subtitle: {
    flex: 1,
    minWidth: 0,
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 13,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CHAT_UNREAD_DOT_COLOR,
  },
  chevron: {
    flexShrink: 0,
    fontSize: 16,
    lineHeight: 20,
  },
  trailing: {
    flexShrink: 0,
    paddingRight: 12,
  },
  footer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
});
