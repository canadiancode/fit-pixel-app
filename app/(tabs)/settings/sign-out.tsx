import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { useAuth } from "@/features/auth/auth-context";
import { SettingsSubScreenLayout } from "@/features/settings/components/settings-sub-screen-layout";
import {
  SETTINGS_SIGN_OUT_BACKGROUND,
  SETTINGS_SIGN_OUT_BG_ASPECT_RATIO,
} from "@/features/settings/constants";

export default function SignOutSettingsScreen() {
  const { signOut } = useAuth();

  return (
    <SettingsSubScreenLayout>
      <View style={styles.block}>
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.body}
        >
          Sign out revokes this session, clears saved login, and resets local
          Fit Pixel data on this device.
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          android_ripple={{ color: "rgba(255,255,255,0.12)" }}
          onPress={() => {
            void signOut();
          }}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.buttonShell}
          >
            <Image
              accessibilityIgnoresInvertColors
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              source={SETTINGS_SIGN_OUT_BACKGROUND}
              style={StyleSheet.absoluteFillObject}
              contentFit="fill"
            />
            <View style={styles.buttonInner}>
              <ThemedText
                lightColor="#ff8a8a"
                darkColor="#ff8a8a"
                style={styles.buttonLabel}
              >
                Sign out
              </ThemedText>
            </View>
          </View>
        </Pressable>
      </View>
    </SettingsSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 20,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    alignSelf: "stretch",
    borderRadius: 12,
    overflow: "hidden",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonShell: {
    width: "100%",
    aspectRatio: SETTINGS_SIGN_OUT_BG_ASPECT_RATIO,
    borderRadius: 12,
    overflow: "hidden",
  },
  buttonInner: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    paddingVertical: 12,
    paddingLeft: 72,
    paddingRight: 20,
  },
  buttonLabel: {
    fontSize: 16,
    lineHeight: 22,
    color: "#ff8a8a",
  },
});
