import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import {
  AUTH_EMAIL_MAX_LENGTH,
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
} from "@/features/auth/auth-constants";
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

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const trimmedEmail = email.trim();
  const canSubmit =
    trimmedEmail.length > 0 &&
    password.length >= AUTH_PASSWORD_MIN_LENGTH &&
    !busy;

  const onSubmit = () => {
    if (!canSubmit) return;
    setBusy(true);
    setMessage(null);
    void (async () => {
      try {
        const result = await signUp(trimmedEmail, password);
        if (result.needsEmailConfirm) {
          router.replace("/(auth)/check-email");
        }
      } catch (err) {
        setMessage(
          err instanceof Error ? err.message : AUTH_COPY.signUpFailed,
        );
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <AuthScreenShell title="Create account">
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
          returnKeyType="next"
        />
      </View>
      <View style={styles.field}>
        <AuthFieldLabel>Password</AuthFieldLabel>
        <SettingsSingleLineTextField
          accessibilityLabel="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          secureTextEntry
          maxLength={AUTH_PASSWORD_MAX_LENGTH}
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />
      </View>
      <AuthPrimaryButton
        label="Create account"
        onPress={onSubmit}
        disabled={!canSubmit}
      />
      <AuthTextLink
        label="Already have an account? Sign in"
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
