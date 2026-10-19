import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_SECONDARY_BACKGROUND,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { useAuth } from "@/features/auth/auth-context";
import { AuthPrimaryButton } from "@/features/auth/components/auth-screen-shell";
import { FitPixelApiError } from "@/lib/api/client";

import {
  needsRestore,
  restoreFromServer,
  type RestoreProgress,
} from "./restore-from-server";

type GateState =
  | { status: "checking" }
  | { status: "restoring"; progress: RestoreProgress | null }
  | { status: "failed"; message: string }
  | { status: "ready" };

/**
 * First sign-in on a device (fresh install, new phone, switched account):
 * pull the account's server data before the tabs mount, then remount the
 * data providers. Never traps the user — a failure can be skipped and the
 * restore resumes on the next launch.
 */
export function RestoreGate({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const { user, session, refreshLocalData } = useAuth();
  const userId = user?.id ?? null;
  const accessToken = session?.access_token ?? null;
  const [state, setState] = useState<GateState>({ status: "checking" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId || !accessToken) {
      setState({ status: "ready" });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        if (!(await needsRestore(db, userId))) {
          if (!cancelled) setState({ status: "ready" });
          return;
        }
        if (!cancelled) setState({ status: "restoring", progress: null });
        await restoreFromServer(db, {
          accessToken,
          userId,
          onProgress: (progress) => {
            if (!cancelled) setState({ status: "restoring", progress });
          },
        });
        if (cancelled) return;
        refreshLocalData();
        setState({ status: "ready" });
      } catch (err) {
        if (cancelled) return;
        // A server without the restore endpoints yet: carry on quietly; the
        // unfinished restore_state row makes the next launch try again.
        if (err instanceof FitPixelApiError && err.status === 404) {
          setState({ status: "ready" });
          return;
        }
        setState({
          status: "failed",
          message:
            err instanceof Error && err.message
              ? err.message
              : "Could not reach Fit Pixel.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
    // Token refreshes must not restart a restore that is already running.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, userId, attempt, refreshLocalData]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const skip = useCallback(() => setState({ status: "ready" }), []);

  if (state.status === "ready") {
    return children;
  }

  if (state.status === "checking") {
    return <View style={styles.root} />;
  }

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        {state.status === "restoring" ? (
          <>
            <ActivityIndicator color={APP_SHELL_MAIN_TEXT_COLOR} />
            <ThemedText
              lightColor={APP_SHELL_MAIN_TEXT_COLOR}
              darkColor={APP_SHELL_MAIN_TEXT_COLOR}
              style={styles.title}
              accessibilityRole="header"
            >
              Restoring your Pixel...
            </ThemedText>
            <ThemedText
              lightColor={APP_SHELL_LABEL_COLOR}
              darkColor={APP_SHELL_LABEL_COLOR}
              style={styles.body}
              accessibilityLiveRegion="polite"
            >
              {state.progress && state.progress.totalLogs > 0
                ? `${Math.min(state.progress.restoredLogs, state.progress.totalLogs)} of ${state.progress.totalLogs} logs`
                : "Bringing back your logs, goals and XP."}
            </ThemedText>
          </>
        ) : (
          <>
            <ThemedText
              lightColor={APP_SHELL_MAIN_TEXT_COLOR}
              darkColor={APP_SHELL_MAIN_TEXT_COLOR}
              style={styles.title}
              accessibilityRole="header"
            >
              {"Couldn't restore your data"}
            </ThemedText>
            <ThemedText
              lightColor={APP_SHELL_LABEL_COLOR}
              darkColor={APP_SHELL_LABEL_COLOR}
              style={styles.body}
            >
              {"You can try again now, or continue and we'll finish restoring " +
                "next time you open Fit Pixel."}
            </ThemedText>
            <ThemedText
              lightColor={APP_SHELL_LABEL_COLOR}
              darkColor={APP_SHELL_LABEL_COLOR}
              style={styles.detail}
            >
              {state.message}
            </ThemedText>
            <View style={styles.primaryWrap}>
              <AuthPrimaryButton label="Try again" onPress={retry} />
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={skip}
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            >
              <ThemedText
                lightColor={APP_SHELL_LABEL_COLOR}
                darkColor={APP_SHELL_LABEL_COLOR}
                style={styles.buttonLabel}
              >
                Continue without restoring
              </ThemedText>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
  },
  card: {
    gap: 14,
    alignItems: "center",
  },
  title: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  button: {
    alignSelf: "stretch",
    alignItems: "center",
    borderRadius: 10,
    paddingVertical: 12,
  },
  primaryWrap: {
    alignSelf: "stretch",
    marginTop: 6,
  },
  detail: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    opacity: 0.8,
  },
  pressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 16,
  },
});
