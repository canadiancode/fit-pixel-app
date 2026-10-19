import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { useAuth } from "@/features/auth/auth-context";
import { AUTH_COPY } from "@/features/auth/auth-errors";
import { AuthPrimaryButton } from "@/features/auth/components/auth-screen-shell";
import { restoreFromServer } from "@/features/restore/restore-from-server";

const DELETE_COLOR = "#ff8a8a";

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
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

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
    return (
      <View style={styles.root}>
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.hint}
        >
          {AUTH_COPY.misconfigured}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.field}>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.fieldLabel}
        >
          Signed in
        </ThemedText>
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.body}
        >
          {user?.email ?? user?.id ?? ""}
        </ThemedText>
      </View>
      <AuthPrimaryButton
        label="Reset password"
        accessibilityLabel="Send password reset email"
        disabled={busy || !user?.email}
        onPress={() => {
          if (!user?.email) return;
          setBusy(true);
          setMessage(null);
          void (async () => {
            try {
              await resetPassword(user.email ?? "");
              setMessage(AUTH_COPY.resetSent);
            } catch (err) {
              setMessage(
                err instanceof Error ? err.message : AUTH_COPY.network,
              );
            } finally {
              setBusy(false);
            }
          })();
        }}
      />
      {message ? (
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.hint}
          accessibilityLiveRegion="polite"
        >
          {message}
        </ThemedText>
      ) : null}
      <View style={styles.field}>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.fieldLabel}
        >
          Cloud backup
        </ThemedText>
        <AuthPrimaryButton
          label={restoring ? "Restoring..." : "Restore from cloud"}
          accessibilityLabel="Restore data from the cloud"
          disabled={restoring || !session}
          onPress={confirmRestore}
        />
        {restoreMessage ? (
          <ThemedText
            lightColor={APP_SHELL_LABEL_COLOR}
            darkColor={APP_SHELL_LABEL_COLOR}
            style={styles.hint}
            accessibilityLiveRegion="polite"
          >
            {restoreMessage}
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.dangerZone}>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.fieldLabel}
        >
          Delete account
        </ThemedText>
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.hint}
        >
          Permanently removes your account and all Fit Pixel data from our
          servers and this device.
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete account"
          accessibilityState={{ disabled: deleting }}
          disabled={deleting}
          onPress={confirmDelete}
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.deleteButtonPressed,
            deleting && styles.deleteButtonDisabled,
          ]}
        >
          <ThemedText
            lightColor={DELETE_COLOR}
            darkColor={DELETE_COLOR}
            style={styles.deleteLabel}
          >
            {deleting ? "Deleting..." : "Delete account"}
          </ThemedText>
        </Pressable>
        {deleteError ? (
          <ThemedText
            lightColor={DELETE_COLOR}
            darkColor={DELETE_COLOR}
            style={styles.hint}
            accessibilityLiveRegion="polite"
          >
            {deleteError}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 22,
    paddingBottom: 28,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  dangerZone: {
    gap: 10,
    marginTop: 12,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.16)",
  },
  deleteButton: {
    alignSelf: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DELETE_COLOR,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  deleteButtonPressed: {
    opacity: 0.85,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteLabel: {
    fontSize: 14,
    lineHeight: 20,
  },
});
