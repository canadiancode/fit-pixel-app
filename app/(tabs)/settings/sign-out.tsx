import { Image } from "expo-image";
import { useSQLiteContext } from "expo-sqlite";
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
import { drainUntilIdle } from "@/lib/sync/drain";

type SignOutStep = "idle" | "backing-up" | "signing-out";

export default function SignOutSettingsScreen() {
  const db = useSQLiteContext();
  const { session, signOut } = useAuth();
  const [step, setStep] = useState<SignOutStep>("idle");
  const signingOut = step !== "idle";

  const finishSignOut = () => {
    setStep("signing-out");
    void signOut().catch(() => setStep("idle"));
  };

  // Sign-out clears this phone, so upload everything first. Only if some
  // changes still can't reach the account does the user decide to lose them.
  const backUpThenSignOut = async () => {
    setStep("backing-up");
    let waiting: number;
    try {
      waiting = await drainUntilIdle(db, session?.access_token);
    } catch {
      waiting = -1;
    }
    if (waiting === 0) {
      finishSignOut();
      return;
    }
    const one = waiting === 1;
    const what =
      waiting > 0
        ? `${waiting} ${one ? "change hasn't" : "changes haven't"}`
        : "Some changes haven't";
    Alert.alert(
      "Not backed up yet",
      `${what} reached your account yet, usually because you're offline. ` +
        `If you sign out now, ${one ? "it" : "they"}'ll be lost. Stay signed ` +
        `in and try again when you're online to keep ${one ? "it" : "them"}.`,
      [
        { text: "Stay signed in", style: "cancel", onPress: () => setStep("idle") },
        { text: "Sign out anyway", style: "destructive", onPress: finishSignOut },
      ],
      { cancelable: true, onDismiss: () => setStep("idle") },
    );
  };

  const confirmSignOut = () => {
    if (signingOut) return;
    Alert.alert(
      "Sign out?",
      "We'll back up this phone first. Everything comes back when you sign in again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: () => {
            void backUpThenSignOut();
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
          phone. We back everything up to your account first, and it all
          comes back when you sign in again.
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
                {step === "backing-up"
                  ? "Backing up..."
                  : step === "signing-out"
                    ? "Signing out..."
                    : "Sign out"}
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
