import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_SECONDARY_BACKGROUND,
} from "@/constants/app-colors";

type ShellProps = {
  title: string;
  children: ReactNode;
};

export function AuthScreenShell({ title, children }: ShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 28), paddingBottom: insets.bottom + 28 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          type="title"
          style={styles.title}
          accessibilityRole="header"
        >
          {title}
        </ThemedText>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type PrimaryProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export function AuthPrimaryButton({ label, onPress, disabled }: PrimaryProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primary,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <ThemedText
        lightColor={APP_SHELL_MAIN_TEXT_COLOR}
        darkColor={APP_SHELL_MAIN_TEXT_COLOR}
        style={styles.primaryLabel}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

type LinkProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export function AuthTextLink({ label, onPress, disabled }: LinkProps) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [pressed && !disabled && styles.pressed]}
    >
      <ThemedText
        lightColor={APP_SHELL_LABEL_COLOR}
        darkColor={APP_SHELL_LABEL_COLOR}
        style={styles.linkLabel}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function AuthFieldLabel({ children }: { children: string }) {
  return (
    <ThemedText
      lightColor={APP_SHELL_LABEL_COLOR}
      darkColor={APP_SHELL_LABEL_COLOR}
      style={styles.fieldLabel}
    >
      {children}
    </ThemedText>
  );
}

export function AuthMessage({ children }: { children: string }) {
  return (
    <ThemedText
      lightColor={APP_SHELL_LABEL_COLOR}
      darkColor={APP_SHELL_LABEL_COLOR}
      style={styles.message}
      accessibilityLiveRegion="polite"
    >
      {children}
    </ThemedText>
  );
}

export function AuthMisconfiguredScreen() {
  return (
    <View style={styles.misconfiguredRoot}>
      <ThemedText
        lightColor={APP_SHELL_MAIN_TEXT_COLOR}
        darkColor={APP_SHELL_MAIN_TEXT_COLOR}
        style={styles.misconfiguredBody}
      >
        Account sign-in is not configured in this build. Add
        EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (never a
        service-role key).
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    gap: 18,
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    lineHeight: 30,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  primary: {
    marginTop: 8,
    alignSelf: "stretch",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(120,200,255,0.55)",
    backgroundColor: "rgba(120,200,255,0.12)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  primaryLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  linkLabel: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.55,
  },
  misconfiguredRoot: {
    flex: 1,
    backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  misconfiguredBody: {
    fontSize: 14,
    lineHeight: 20,
  },
});
