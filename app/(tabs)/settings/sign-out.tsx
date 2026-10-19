import { Image } from "expo-image";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/features/auth/auth-context";
import { SettingsSubScreenLayout } from "@/features/settings/components/settings-sub-screen-layout";
import { SettingsIntro } from "@/features/settings/components/settings-ui";
import { SyncStatusBanner } from "@/features/settings/components/sync-status-banner";
import {
  SETTINGS_SIGN_OUT_BACKGROUND,
  SETTINGS_SIGN_OUT_BG_ASPECT_RATIO,
} from "@/features/settings/constants";

export default function SignOutSettingsScreen() {
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const confirmSignOut = () => {
    if (signingOut) return;
    Alert.alert(
      "Sign out?",
      "Your synced data comes back when you sign in again. Anything not synced yet on this device will be lost.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: () => {
            setSigningOut(true);
            void signOut().catch(() => setSigningOut(false));
          },
        },
      ],
    );
  };

  return (
    <SettingsSubScreenLayout>
      <View style={styles.block}>
        <SettingsIntro>
          Signing out ends this session and clears Fit Pixel data from this
          phone. Everything that has synced comes back when you sign in again.
        </SettingsIntro>
        <SyncStatusBanner />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          accessibilityState={{ busy: signingOut, disabled: signingOut }}
          android_ripple={{ color: "rgba(255,255,255,0.12)" }}
          disabled={signingOut}
          onPress={confirmSignOut}
          style={({ pressed }) => [
            styles.button,
            (pressed || signingOut) && styles.buttonPressed,
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
                {signingOut ? "Signing out..." : "Sign out"}
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
