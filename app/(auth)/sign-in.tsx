import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import {
  AUTH_EMAIL_MAX_LENGTH,
  AUTH_PASSWORD_MAX_LENGTH,
} from "@/features/auth/auth-constants";
import { useAuth } from "@/features/auth/auth-context";
import {
  AuthFieldLabel,
  AuthMessage,
  AuthPrimaryButton,
  AuthScreenShell,
  AuthTextLink,
} from "@/features/auth/components/auth-screen-shell";
import { SettingsSingleLineTextField } from "@/features/settings/components/settings-text-field";

export default function SignInScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const trimmedEmail = email.trim();
  const canSubmit = trimmedEmail.length > 0 && password.length > 0 && !busy;

  const onSubmit = () => {
    if (!canSubmit) return;
    setBusy(true);
    setMessage(null);
    void (async () => {
      try {
        await signIn(trimmedEmail, password);
      } catch (err) {
        setMessage(
          err instanceof Error ? err.message : "Email or password is incorrect.",
        );
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <AuthScreenShell title="Fit Pixel">
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
          placeholder="Password"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          textContentType="password"
          secureTextEntry
          maxLength={AUTH_PASSWORD_MAX_LENGTH}
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />
      </View>
      <AuthPrimaryButton
        label="Sign in"
        onPress={onSubmit}
        disabled={!canSubmit}
      />
      <AuthTextLink
        label="Create account"
        disabled={busy}
        onPress={() => router.push("/(auth)/sign-up")}
      />
      <AuthTextLink
        label="Forgot password?"
        disabled={busy}
        onPress={() => router.push("/(auth)/forgot-password")}
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
