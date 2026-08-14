import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { useAuth } from "@/features/auth/auth-context";
import { SettingsSubScreenLayout } from "@/features/settings/components/settings-sub-screen-layout";

export default function SignOutSettingsScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  return (
    <SettingsSubScreenLayout>
      <View style={styles.block}>
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.body}
        >
          {user
            ? "Sign out revokes this session, clears saved login, and resets local Fit Pixel data on this device."
            : "You are not signed in. You can still reset local data on this device."}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          onPress={() => {
            void (async () => {
              await signOut();
              router.back();
            })();
          }}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.buttonLabel}
          >
            {user ? "Sign out" : "Reset local data"}
          </ThemedText>
        </Pressable>
      </View>
    </SettingsSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 16,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    alignSelf: "stretch",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,120,120,0.55)",
    backgroundColor: "rgba(255,120,120,0.12)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
});
