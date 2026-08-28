import type { ReactNode } from "react";
import { Image } from "expo-image";
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
import { FONT_FAMILY } from "@/constants/fonts";

/** Same lime asset as food “Search for food” and other primary confirms. */
const AUTH_PRIMARY_BUTTON_BACKGROUND = require("@/assets/backgrounds/add-action.png");

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
  accessibilityLabel?: string;
};

export function AuthPrimaryButton({
  label,
  onPress,
  disabled,
  accessibilityLabel,
}: PrimaryProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryOuter,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.primaryShell}>
        <Image
          accessibilityIgnoresInvertColors
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          source={AUTH_PRIMARY_BUTTON_BACKGROUND}
          style={StyleSheet.absoluteFillObject}
          contentFit="fill"
        />
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.primaryLabel}
          numberOfLines={2}
        >
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

type LinkProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export function AuthSecondaryButton({ label, onPress, disabled }: PrimaryProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondary,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <ThemedText
        lightColor={APP_SHELL_MAIN_TEXT_COLOR}
        darkColor={APP_SHELL_MAIN_TEXT_COLOR}
        style={styles.secondaryLabel}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function AuthTextLink({ label, onPress, disabled }: LinkProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.linkButton,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <ThemedText
        lightColor={APP_SHELL_MAIN_TEXT_COLOR}
        darkColor={APP_SHELL_MAIN_TEXT_COLOR}
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
  primaryOuter: {
    alignSelf: "stretch",
  },
  primaryShell: {
    width: "100%",
    minHeight: 48,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    fontWeight: "600",
  },
  secondary: {
    alignSelf: "stretch",
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.55)",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryLabel: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  linkButton: {
    alignSelf: "stretch",
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  linkLabel: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
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
