import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_INPUT_BOARDER_COLOR,
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { useAuth } from "@/features/auth/auth-context";
import { SettingsSingleLineTextField } from "@/features/settings/components/settings-text-field";

export function AccountSettingsForm() {
  const { user, configured, signIn, signUp, resetPassword } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage(success);
      setPassword("");
    } catch (err) {
      const text = err instanceof Error ? err.message : "Something went wrong.";
      setMessage(text);
    } finally {
      setBusy(false);
    }
  };

  if (!configured) {
    return (
      <View style={styles.root}>
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.hint}
        >
          Account sign-in is not configured in this build. Add
          EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (never a
          service-role key).
        </ThemedText>
      </View>
    );
  }

  if (user) {
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
            {user.email ?? user.id}
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send password reset email"
          disabled={busy || !user.email}
          onPress={() => {
            if (!user.email) return;
            void run(
              () => resetPassword(user.email ?? ""),
              "Password reset email sent. Open the HTTPS link on this device.",
            );
          }}
          style={({ pressed }) => [
            styles.resetButton,
            pressed && styles.resetButtonPressed,
            busy && styles.disabled,
          ]}
        >
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.resetButtonLabel}
          >
            Reset password
          </ThemedText>
        </Pressable>
        {message ? (
          <ThemedText
            lightColor={APP_SHELL_LABEL_COLOR}
            darkColor={APP_SHELL_LABEL_COLOR}
            style={styles.hint}
          >
            {message}
          </ThemedText>
        ) : null}
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
          Email
        </ThemedText>
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
          maxLength={254}
        />
      </View>
      <View style={styles.field}>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.fieldLabel}
        >
          Password
        </ThemedText>
        <SettingsSingleLineTextField
          accessibilityLabel="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          textContentType="password"
          secureTextEntry
          maxLength={128}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign in"
        disabled={busy}
        onPress={() => {
          void run(
            () => signIn(email.trim(), password),
            "Signed in.",
          );
        }}
        style={({ pressed }) => [
          styles.resetButton,
          pressed && styles.resetButtonPressed,
          busy && styles.disabled,
        ]}
      >
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.resetButtonLabel}
        >
          Sign in
        </ThemedText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create account"
        disabled={busy}
        onPress={() => {
          void run(
            () => signUp(email.trim(), password),
            "Account created. You can sign in now.",
          );
        }}
        style={({ pressed }) => [
          styles.resetButton,
          pressed && styles.resetButtonPressed,
          busy && styles.disabled,
        ]}
      >
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.resetButtonLabel}
        >
          Create account
        </ThemedText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reset password"
        disabled={busy}
        onPress={() => {
          void run(
            () => resetPassword(email.trim()),
            "Password reset email sent. Open the HTTPS link on this device.",
          );
        }}
        style={({ pressed }) => [
          styles.resetButton,
          pressed && styles.resetButtonPressed,
          busy && styles.disabled,
        ]}
      >
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.resetButtonLabel}
        >
          Reset password
        </ThemedText>
      </Pressable>
      {message ? (
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.hint}
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
  resetButton: {
    marginTop: 4,
    alignSelf: "stretch",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(120,200,255,0.55)",
    backgroundColor: "rgba(120,200,255,0.12)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  resetButtonPressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.55,
  },
  resetButtonLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
});
