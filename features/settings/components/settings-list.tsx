import { Image } from "expo-image";
import { router } from "expo-router";
import { Fragment } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_SECONDARY_BACKGROUND } from "@/constants/app-colors";

import {
  SETTINGS_SIGN_OUT_BACKGROUND,
  SETTINGS_SIGN_OUT_BG_ASPECT_RATIO,
} from "../constants";
import { SETTINGS_GROUPS, SETTINGS_ROWS } from "../data";
import {
  SettingsDivider,
  SettingsLinkRow,
  SettingsSection,
} from "./settings-ui";
import { SyncStatusBanner } from "./sync-status-banner";

const SIGN_OUT = SETTINGS_ROWS.find((row) => row.id === "sign-out")!;

/**
 * Settings home: rows grouped into short sections, each row a title with its
 * description on its own line underneath, and Sign out set apart at the end.
 */
export function SettingsList() {
  return (
    <View style={styles.panelPage}>
      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <SyncStatusBanner />
        {SETTINGS_GROUPS.map((group) => {
          const rows = SETTINGS_ROWS.filter(
            (row) => row.group === group.id && row.id !== "sign-out",
          );
          if (rows.length === 0) return null;
          return (
            <SettingsSection key={group.id} title={group.label}>
              {rows.map((row, index) => (
                <Fragment key={row.id}>
                  {index > 0 ? <SettingsDivider /> : null}
                  <SettingsLinkRow
                    title={row.label}
                    description={row.caption}
                    onPress={() => router.push(`/(tabs)/settings/${row.id}`)}
                    accessibilityLabel={`${row.label}. ${row.caption}`}
                  />
                </Fragment>
              ))}
            </SettingsSection>
          );
        })}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${SIGN_OUT.label}. ${SIGN_OUT.caption}`}
          onPress={() => router.push("/(tabs)/settings/sign-out")}
          style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
        >
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.signOutShell,
              { aspectRatio: SETTINGS_SIGN_OUT_BG_ASPECT_RATIO },
            ]}
          >
            <Image
              source={SETTINGS_SIGN_OUT_BACKGROUND}
              style={StyleSheet.absoluteFillObject}
              contentFit="fill"
            />
            <View style={styles.signOutInner}>
              <ThemedText style={styles.signOutLabel}>
                {SIGN_OUT.label}
              </ThemedText>
              <ThemedText style={styles.signOutCaption}>
                {SIGN_OUT.caption}
              </ThemedText>
            </View>
          </View>
        </Pressable>
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
    paddingTop: 20,
    paddingBottom: 32,
    gap: 22,
  },
  signOut: {
    borderRadius: 12,
    overflow: "hidden",
  },
  signOutShell: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  signOutInner: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingLeft: 72,
    paddingRight: 20,
  },
  signOutLabel: {
    color: "#ff8a8a",
    fontSize: 15,
    lineHeight: 20,
  },
  signOutCaption: {
    color: "rgba(255,138,138,0.85)",
    fontSize: 10,
    lineHeight: 14,
  },
  pressed: {
    opacity: 0.85,
  },
});
