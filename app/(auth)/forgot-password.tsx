import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { AUTH_EMAIL_MAX_LENGTH } from "@/features/auth/auth-constants";
import { useAuth } from "@/features/auth/auth-context";
import { AUTH_COPY } from "@/features/auth/auth-errors";
import {
  AuthFieldLabel,
  AuthMessage,
  AuthPrimaryButton,
  AuthScreenShell,
  AuthTextLink,
} from "@/features/auth/components/auth-screen-shell";
import { SettingsSingleLineTextField } from "@/features/settings/components/settings-text-field";

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const trimmedEmail = email.trim();
  const canSubmit = trimmedEmail.length > 0 && !busy;

  const onSubmit = () => {
    if (!canSubmit) return;
    setBusy(true);
    setMessage(null);
    void (async () => {
      try {
        await resetPassword(trimmedEmail);
        setMessage(AUTH_COPY.resetSent);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : AUTH_COPY.network);
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <AuthScreenShell title="Reset password">
      <View style={styles.field}>
        <AuthFieldLabel>Email</AuthFieldLabel>
        <SettingsSingleLineTextField
          accessibilityLabel="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="example@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          maxLength={AUTH_EMAIL_MAX_LENGTH}
          returnKeyType="send"
          onSubmitEditing={onSubmit}
        />
      </View>
      <AuthPrimaryButton
        label="Send reset link"
        onPress={onSubmit}
        disabled={!canSubmit}
      />
      <AuthTextLink
        label="Back to sign in"
        disabled={busy}
        onPress={() => router.replace("/(auth)/sign-in")}
      />
      {message ? <AuthMessage>{message}</AuthMessage> : null}
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
});
