import { usePathname, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_INPUT_BOARDER_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_SECONDARY_BACKGROUND,
} from "@/constants/app-colors";

type Props = {
  children: React.ReactNode;
};

/** Habit roots under Actions — Back should clear sibling stacks (e.g. weight then sleep). */
const TOP_LEVEL_ACTION_PATH =
  /^\/actions\/(weight|sleep|water|steps|calories|train|food)\/?$/;

export function ActionsSubScreenLayout({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to actions"
          hitSlop={12}
          onPress={() => {
            if (TOP_LEVEL_ACTION_PATH.test(pathname)) {
              // Skip any prior sibling actions left on the stack from Pixel.
              router.dismissTo("/(tabs)/actions");
              return;
            }
            if (router.canDismiss()) {
              router.dismiss();
            } else {
              router.replace("/(tabs)/actions");
            }
          }}
          style={({ pressed }) => [styles.backHit, pressed && styles.backPressed]}
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
      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
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
});
