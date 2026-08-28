import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_SECONDARY_BACKGROUND,
} from "@/constants/app-colors";

import {
  SETTINGS_ROW_BACKGROUND,
  SETTINGS_ROW_BG_ASPECT_RATIO,
  SETTINGS_SIGN_OUT_BACKGROUND,
  SETTINGS_SIGN_OUT_BG_ASPECT_RATIO,
} from "../constants";
import { SETTINGS_ROWS } from "../data";
import { SyncStatusBanner } from "./sync-status-banner";

export function SettingsList() {
  return (
    <View style={styles.panelPage}>
      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <SyncStatusBanner />
        {SETTINGS_ROWS.map((row) => {
          const isSignOut = row.id === "sign-out";
          const rowAspectRatio = isSignOut
            ? SETTINGS_SIGN_OUT_BG_ASPECT_RATIO
            : SETTINGS_ROW_BG_ASPECT_RATIO;
          const rowBgSource = isSignOut
            ? SETTINGS_SIGN_OUT_BACKGROUND
            : SETTINGS_ROW_BACKGROUND;

          const rowContent = (
            <View style={styles.listRowTextBlock}>
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={[
                  styles.listRowLabel,
                  isSignOut && styles.listRowLabelSignOut,
                ]}
              >
                {row.label}
              </ThemedText>
              <ThemedText
                lightColor={APP_SHELL_LABEL_COLOR}
                darkColor={APP_SHELL_LABEL_COLOR}
                style={[
                  styles.listRowCaption,
                  isSignOut && styles.listRowCaptionSignOut,
                ]}
              >
                {row.caption}
              </ThemedText>
            </View>
          );

          return (
            <Pressable
              key={row.id}
              accessibilityRole="button"
              accessibilityLabel={`${row.label}. ${row.caption}`}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
              style={({ pressed }) => [
                styles.listRow,
                styles.listRowWithImageBg,
                pressed && styles.listRowPressed,
              ]}
              onPress={() => {
                router.push(`/(tabs)/settings/${row.id}`);
              }}
            >
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={[styles.listRowImageShell, { aspectRatio: rowAspectRatio }]}
              >
                <Image
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  source={rowBgSource}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="fill"
                />
                <View
                  style={
                    isSignOut
                      ? styles.listRowSignOutImageInner
                      : styles.listRowImageInner
                  }
                >
                  {rowContent}
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panelPage: {
    flex: 1,
    backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    overflow: "hidden",
  },
  listScroll: {
    flex: 1,
    backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
  },
  listContent: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 22,
    gap: 12,
  },
  listRowTextBlock: {
    gap: 6,
  },
  listRow: {
    justifyContent: "center",
    borderRadius: 12,
    overflow: "hidden",
    alignSelf: "stretch",
  },
  listRowWithImageBg: {
    padding: 0,
  },
  listRowImageShell: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  listRowImageInner: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    paddingVertical: 10,
    paddingLeft: 20,
    paddingRight: 44,
  },
  listRowSignOutImageInner: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    paddingVertical: 12,
    paddingLeft: 72,
    paddingRight: 20,
  },
  listRowPressed: {
    opacity: 0.85,
  },
  listRowLabel: {
    fontSize: 15,
    lineHeight: 22,
  },
  listRowLabelSignOut: {
    color: "#ff8a8a",
  },
  listRowCaption: {
    fontSize: 10,
    lineHeight: 14,
  },
  listRowCaptionSignOut: {
    color: "rgba(255,138,138,0.85)",
  },
});
