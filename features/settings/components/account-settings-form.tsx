import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { useAuth } from "@/features/auth/auth-context";
import { AUTH_COPY } from "@/features/auth/auth-errors";
import { AuthPrimaryButton } from "@/features/auth/components/auth-screen-shell";

export function AccountSettingsForm() {
  const { user, configured, resetPassword } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
});
