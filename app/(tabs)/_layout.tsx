import { Image } from "expo-image";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_PRIMARY_BACKGROUND,
  APP_SHELL_SECONDARY_BACKGROUND,
} from "@/constants/app-colors";
import { DailyGoalsProvider } from "@/features/actions/daily-goals-context";
import { HabitProgressProvider } from "@/features/actions/habit-progress-context";

const TAB_ICON_SIZE = 28;

function tabBarImageIcon(source: number, focused: boolean) {
  return (
    <Image
      source={source}
      style={{
        width: TAB_ICON_SIZE,
        height: TAB_ICON_SIZE,
        opacity: focused ? 1 : 0.55,
      }}
      contentFit="contain"
    />
  );
}

const TAB_BAR_EDGE_PADDING = 1;
/** On iOS/Android, subtract from `insets.bottom` for tab bar only (web unchanged). */
const TAB_BAR_BOTTOM_INSET_REDUCTION_NATIVE = 20;
/** Default tab row body height from UIKit tab bar (~49pt); we grow beyond this. */
const UIKIT_TAB_BAR_BODY = 60;
const TAB_BAR_EXTRA_HEIGHT = 18;
/** Space between the icon stack and the label (icon wrapper gets bottom margin). */
const TAB_BAR_ICON_LABEL_GAP = 8;

/**
 * The real `role="tablist"` row is an internal View with no public style hook.
 * These item margins reproduce `padding: 0 3px` + `gap: 3px` on that row.
 */
const TAB_LIST_HORIZONTAL_PAD = 8;
const TAB_LIST_GAP = 1;
const TAB_ITEM_PAD_Y = 4;
const TAB_LIST_HALF_GAP = TAB_LIST_GAP / 2;

const tabItemBase: ViewStyle = { paddingVertical: TAB_ITEM_PAD_Y };
const tabItemFirst: ViewStyle = {
  ...tabItemBase,
  marginStart: TAB_LIST_HORIZONTAL_PAD,
  marginEnd: TAB_LIST_HALF_GAP,
};
const tabItemMiddle: ViewStyle = {
  ...tabItemBase,
  marginHorizontal: TAB_LIST_HALF_GAP,
};
const tabItemLast: ViewStyle = {
  ...tabItemBase,
  marginStart: TAB_LIST_HALF_GAP,
  marginEnd: TAB_LIST_HORIZONTAL_PAD,
};

/** Default landing tab is My Pixel (`pixel`), not a missing `index` screen. */
export const unstable_settings = {
  initialRouteName: "pixel",
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const horizontalInset = Math.max(insets.left, insets.right);
  const tabBarBottomInset =
    Platform.OS === "web"
      ? insets.bottom
      : Math.max(0, insets.bottom - TAB_BAR_BOTTOM_INSET_REDUCTION_NATIVE);

  return (
    <DailyGoalsProvider>
      <HabitProgressProvider>
        <Tabs
          layout={({ children }) => (
            <View
              style={{
                flex: 1,
                backgroundColor: APP_SHELL_PRIMARY_BACKGROUND,
              }}
            >
              {children}
            </View>
          )}
          screenOptions={{
            tabBarActiveTintColor: APP_SHELL_MAIN_TEXT_COLOR,
            tabBarInactiveTintColor: APP_SHELL_LABEL_COLOR,
            headerShown: false,
            tabBarButton: HapticTab,
            tabBarLabelStyle: { fontSize: 6 },
            tabBarIconStyle: { marginBottom: TAB_BAR_ICON_LABEL_GAP },
            // Styles the wrapper that parents the `role="tablist"` row in BottomTabBar.
            // Explicit `height` is required for a taller bar; `getTabBarHeight` reads it from here.
            tabBarStyle: {
              backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
              borderRadius: 15,
              overflow: "hidden",
              height:
                UIKIT_TAB_BAR_BODY +
                TAB_BAR_EXTRA_HEIGHT +
                TAB_BAR_EDGE_PADDING * 2 +
                tabBarBottomInset,
              paddingTop: TAB_BAR_EDGE_PADDING,
              paddingHorizontal: TAB_BAR_EDGE_PADDING + horizontalInset,
              paddingBottom: TAB_BAR_EDGE_PADDING + tabBarBottomInset,
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="pixel"
            options={{
              title: "My Pixel",
              tabBarItemStyle: tabItemFirst,
              tabBarIcon: ({ focused }) =>
                tabBarImageIcon(require("@/assets/icons/character.png"), focused),
            }}
          />
          <Tabs.Screen
            name="map"
            options={{
              title: "Map",
              tabBarItemStyle: tabItemMiddle,
              tabBarIcon: ({ focused }) =>
                tabBarImageIcon(require("@/assets/icons/map.png"), focused),
            }}
          />
          <Tabs.Screen
            name="actions"
            options={{
              title: "Actions",
              tabBarItemStyle: tabItemMiddle,
              tabBarIcon: ({ focused }) =>
                tabBarImageIcon(require("@/assets/icons/plus.png"), focused),
            }}
          />
          <Tabs.Screen
            name="chat"
            options={{
              title: "Chat",
              tabBarItemStyle: tabItemMiddle,
              tabBarIcon: ({ focused }) =>
                tabBarImageIcon(require("@/assets/icons/world.png"), focused),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: "Settings",
              tabBarItemStyle: tabItemLast,
              tabBarIcon: ({ focused }) =>
                tabBarImageIcon(require("@/assets/icons/gear.png"), focused),
            }}
          />
        </Tabs>
      </HabitProgressProvider>
    </DailyGoalsProvider>
  );
}
