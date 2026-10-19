import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_INPUT_BOARDER_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_SECONDARY_BACKGROUND,
} from "@/constants/app-colors";
import { goBackInChat } from "@/features/chat/navigation";

type Props = {
  children: React.ReactNode;
  /**
   * Full-width block below the back row (no horizontal inset). Shares vertical
   * space with the scroll area when both are set (e.g. the gym info strip).
   */
  stackLeader?: React.ReactNode;
  /** Skip ScrollView wrapping so the body can host a FlatList + composer. */
  fillBody?: boolean;
  /** Back row. Threads turn it off: the Chat header band shows Back + title. */
  toolbar?: boolean;
};

export function ChatSubScreenLayout({
  children,
  stackLeader,
  fillBody = false,
  toolbar = true,
}: Props) {
  const router = useRouter();

  return (
    <View style={styles.root}>
      {toolbar ? (
        <View style={styles.toolbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
            onPress={() => goBackInChat(router)}
            style={({ pressed }) => [
              styles.backHit,
              pressed && styles.backPressed,
            ]}
          >
            <ThemedText
              lightColor={APP_SHELL_MAIN_TEXT_COLOR}
              darkColor={APP_SHELL_MAIN_TEXT_COLOR}
              style={styles.backLabel}
            >
              ‹ Back
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
      {stackLeader != null ? (
        <View style={styles.splitBody}>
          <View style={styles.stackLeaderSlot}>{stackLeader}</View>
          {fillBody ? (
            <View style={styles.splitFill}>{children}</View>
          ) : (
            <ScrollView
              style={styles.splitScroll}
              contentContainerStyle={styles.splitScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          )}
        </View>
      ) : fillBody ? (
        <View style={styles.splitFill}>{children}</View>
      ) : (
        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
  },
  toolbar: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: APP_SHELL_INPUT_BOARDER_COLOR,
  },
  backHit: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  backPressed: {
    opacity: 0.85,
  },
  backLabel: {
    fontSize: 16,
    lineHeight: 22,
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    paddingTop: 18,
  },
  splitBody: {
    flex: 1,
    minHeight: 0,
    flexDirection: "column",
  },
  stackLeaderSlot: {
    alignSelf: "stretch",
    flexGrow: 0,
    flexShrink: 0,
  },
  splitScroll: {
    flex: 1,
    minHeight: 0,
  },
  splitFill: {
    flex: 1,
    minHeight: 0,
  },
  splitScrollContent: {
    padding: 16,
    paddingTop: 14,
    gap: 14,
    flexGrow: 1,
  },
});
