import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { useAuth } from "@/features/auth/auth-context";
import { AUTH_COPY } from "@/features/auth/auth-errors";
import {
  SETTINGS_DANGER_COLOR,
  SETTINGS_SUCCESS_COLOR,
  SettingsButton,
  SettingsDivider,
  SettingsIntro,
  SettingsLinkRow,
  SettingsSection,
  SettingsValueRow,
} from "@/features/settings/components/settings-ui";
import { SyncStatusBanner } from "@/features/settings/components/sync-status-banner";
import { restoreFromServer } from "@/features/restore/restore-from-server";

export function AccountSettingsForm() {
  const db = useSQLiteContext();
  const {
    user,
    session,
    configured,
    resetPassword,
    deleteAccount,
    refreshLocalData,
  } = useAuth();
  const [resetState, setResetState] = useState<
    { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  const sendReset = () => {
    const email = user?.email;
    if (!email || resetState.kind === "sending") return;
    setResetState({ kind: "sending" });
    void resetPassword(email)
      .then(() => setResetState({ kind: "sent" }))
      .catch((err) =>
        setResetState({
          kind: "error",
          message: err instanceof Error ? err.message : AUTH_COPY.network,
        }),
      );
  };

  const runRestore = () => {
    const accessToken = session?.access_token;
    if (!user || !accessToken) return;
    setRestoring(true);
    setRestoreMessage(null);
    void (async () => {
      try {
        const { restoredLogs } = await restoreFromServer(db, {
          accessToken,
          userId: user.id,
          fromScratch: true,
        });
        // Native alert survives the provider remount refreshLocalData causes.
        Alert.alert(
          "Restore complete",
          restoredLogs > 0
            ? `Restored ${restoredLogs} log${restoredLogs === 1 ? "" : "s"} from the cloud.`
            : "This phone is already up to date.",
        );
        setRestoring(false);
        refreshLocalData();
      } catch (err) {
        setRestoreMessage(
          err instanceof Error ? err.message : AUTH_COPY.network,
        );
        setRestoring(false);
      }
    })();
  };

  const confirmRestore = () => {
    Alert.alert(
      "Restore from cloud?",
      "This brings your logs, goals, XP and Pixel from Fit Pixel's servers " +
        "onto this phone. Changes that haven't uploaded yet are kept.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Restore", onPress: runRestore },
      ],
    );
  };

  const runDelete = () => {
    setDeleting(true);
    setDeleteError(null);
    void (async () => {
      try {
        // On success the session gate swaps to the auth screens.
        await deleteAccount();
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : AUTH_COPY.network);
        setDeleting(false);
      }
    })();
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your Fit Pixel account, XP, Pixel, logs, " +
        "saved meals and chat messages. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete account", style: "destructive", onPress: runDelete },
      ],
    );
  };

  if (!configured) {
    return <SettingsIntro>{AUTH_COPY.misconfigured}</SettingsIntro>;
  }

  const resetDescription =
    resetState.kind === "sent"
      ? `Check ${user?.email ?? "your inbox"} for a reset link.`
      : resetState.kind === "error"
        ? resetState.message
        : "We'll email you a link to choose a new password.";

  return (
    <View style={styles.root}>
      <SettingsSection title="sign-in">
        <SettingsValueRow
          title="Email"
          value=""
          description={user?.email ?? user?.id ?? ""}
        />
        <SettingsDivider />
        <SettingsLinkRow
          title="Reset password"
          description={resetDescription}
          onPress={sendReset}
          disabled={!user?.email || resetState.kind === "sending"}
          accessibilityLabel="Send password reset email"
          trailing={
            resetState.kind === "sending" ? (
              <ActivityIndicator color={APP_SHELL_MAIN_TEXT_COLOR} />
            ) : resetState.kind === "sent" ? (
              <ThemedText
                lightColor={SETTINGS_SUCCESS_COLOR}
                darkColor={SETTINGS_SUCCESS_COLOR}
                style={styles.sent}
              >
                Sent
              </ThemedText>
            ) : undefined
          }
        />
      </SettingsSection>

      <SettingsSection
        title="cloud backup"
        footer={restoreMessage}
        bare
      >
        <View style={styles.stack}>
          <SyncStatusBanner />
          <SettingsButton
            label={restoring ? "Restoring..." : "Restore from cloud"}
            accessibilityLabel="Restore data from the cloud"
            disabled={restoring || !session}
            onPress={confirmRestore}
          />
        </View>
      </SettingsSection>

      <SettingsSection
        title="danger zone"
        footer="Permanently removes your account and all Fit Pixel data from our servers and this phone."
        bare
      >
        <View style={styles.stack}>
          <SettingsButton
            label={deleting ? "Deleting..." : "Delete account"}
            tone="danger"
            disabled={deleting}
            onPress={confirmDelete}
          />
          {deleteError ? (
            <ThemedText
              lightColor={SETTINGS_DANGER_COLOR}
              darkColor={SETTINGS_DANGER_COLOR}
              style={styles.error}
              accessibilityLiveRegion="polite"
            >
              {deleteError}
            </ThemedText>
          ) : null}
        </View>
      </SettingsSection>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 28,
  },
  stack: {
    gap: 12,
  },
  sent: {
    fontSize: 9,
    lineHeight: 13,
  },
  error: {
    fontSize: 9,
    lineHeight: 15,
    paddingHorizontal: 4,
  },
});
