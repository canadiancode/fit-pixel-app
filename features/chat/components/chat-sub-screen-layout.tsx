import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_INPUT_BOARDER_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_SECONDARY_BACKGROUND,
} from "@/constants/app-colors";

const RIGHT_ARROW = require("@/assets/icons/right-arrow.png");
/** Decorative chevron; absolute so toolbar row height matches back-only layout. */
const TOOLBAR_CHEVRON_SIZE = Math.round(44 * 0.8);
const CHEVRON_ANIM_MS = 280;

type Props = {
  children: React.ReactNode;
  /**
   * Full-width block below the back row (no horizontal inset). Shares vertical
   * space with the scroll area when both are set (e.g. gym thread hero).
   */
  stackLeader?: React.ReactNode;
  /** Gym chat thread only: chevron toggles collapsible hero (pair with collapse props). */
  showGymToolbarChevron?: boolean;
  /** Gym thread: hero/title strip is tucked for more message space. */
  gymThreadHeroCollapsed?: boolean;
  /** Gym thread: toggles `gymThreadHeroCollapsed`. */
  onGymThreadHeroCollapseToggle?: () => void;
  /** Skip ScrollView wrapping so the body can host a FlatList + composer. */
  fillBody?: boolean;
};

export function ChatSubScreenLayout({
  children,
  stackLeader,
  showGymToolbarChevron,
  gymThreadHeroCollapsed = false,
  onGymThreadHeroCollapseToggle,
  fillBody = false,
}: Props) {
  const router = useRouter();
  const collapseProgress = useSharedValue(0);

  useEffect(() => {
    collapseProgress.value = withTiming(gymThreadHeroCollapsed ? 1 : 0, {
      duration: CHEVRON_ANIM_MS,
    });
  }, [gymThreadHeroCollapsed, collapseProgress]);

  const chevronRotateStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(
          collapseProgress.value,
          [0, 1],
          [-90, 90],
          Extrapolation.CLAMP,
        )}deg`,
      },
    ],
  }));

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.toolbar,
          showGymToolbarChevron && styles.toolbarReserveEndGlyph,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          onPress={() => router.back()}
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
        {showGymToolbarChevron && onGymThreadHeroCollapseToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              gymThreadHeroCollapsed
                ? "Expand gym details"
                : "Collapse gym details"
            }
            hitSlop={10}
            onPress={onGymThreadHeroCollapseToggle}
            style={styles.toolbarChevronWrap}
          >
            <Animated.View style={chevronRotateStyle}>
              <Image
                source={RIGHT_ARROW}
                style={styles.toolbarChevronImage}
                contentFit="contain"
                accessibilityIgnoresInvertColors
              />
            </Animated.View>
          </Pressable>
        ) : null}
      </View>
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
  toolbarReserveEndGlyph: {
    paddingRight: 52,
  },
  toolbarChevronWrap: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    width: TOOLBAR_CHEVRON_SIZE + 8,
    justifyContent: "center",
    alignItems: "center",
  },
  toolbarChevronImage: {
    width: TOOLBAR_CHEVRON_SIZE,
    height: TOOLBAR_CHEVRON_SIZE,
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
