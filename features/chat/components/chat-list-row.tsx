import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { PixelChevron, PixelPanel } from "@/components/pixel-panel";
import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { CHAT_UNREAD_DOT_COLOR } from "@/features/chat/constants";

type Props = {
  leading: ReactNode;
  title: string;
  subtitle?: string | null;
  /** Small text at the top-right (e.g. "5m"). */
  meta?: string | null;
  /** Bold title, bright preview, brighter frame and a dot. */
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

/** Pixel-frame list row for the Chat tab (DMs, friends, requests, gyms). */
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
    <PixelPanel frame={unread ? "button" : "blue"} style={styles.card}>
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
                {showChevron ? <PixelChevron style={styles.chevron} /> : null}
              </View>
            )}
          </Pressable>
        </View>
        {trailing != null ? (
          <View style={styles.trailing}>{trailing}</View>
        ) : null}
      </View>
      {footer != null ? <View style={styles.footer}>{footer}</View> : null}
    </PixelPanel>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  hitOuter: {
    flex: 1,
    minWidth: 0,
  },
  hit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 14,
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
  /** Square pixel dot with a dark outline. */
  unreadDot: {
    width: 10,
    height: 10,
    borderWidth: 2,
    borderColor: "#000a1c",
    backgroundColor: CHAT_UNREAD_DOT_COLOR,
  },
  chevron: {
    flexShrink: 0,
  },
  trailing: {
    flexShrink: 0,
    paddingRight: 14,
  },
  footer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
});
