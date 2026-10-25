import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PixelFrameBackdrop } from "@/components/pixel-panel";
import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";

import { usePrefsProfile } from "../prefs-profile-context";
import { SettingsSingleLineTextField } from "./settings-text-field";

const NAME_MAX = 80;

type Props = {
  visible: boolean;
  onClose: () => void;
};

/** Small centred card for renaming your Pixel (Settings header pencil). */
export function DisplayNameDialog({ visible, onClose }: Props) {
  const { profile, updateProfile } = usePrefsProfile();
  const [draft, setDraft] = useState(profile.displayName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setDraft(profile.displayName);
  }, [visible, profile.displayName]);

  const trimmed = draft.trim();
  const canSave = trimmed !== "" && trimmed !== profile.displayName && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      await updateProfile({ displayName: trimmed });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Pressable
            style={styles.card}
            onPress={() => {}}
            accessibilityViewIsModal
          >
            <PixelFrameBackdrop frame="button" />
            <View style={styles.titleRow}>
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={styles.title}
                accessibilityRole="header"
              >
                Display name
              </ThemedText>
              <ThemedText
                lightColor={APP_SHELL_LABEL_COLOR}
                darkColor={APP_SHELL_LABEL_COLOR}
                style={styles.counter}
              >
                {draft.length}/{NAME_MAX}
              </ThemedText>
            </View>

            <SettingsSingleLineTextField
              accessibilityLabel="Display name"
              value={draft}
              onChangeText={setDraft}
              placeholder="Fit Pixel"
              autoCapitalize="words"
              autoCorrect
              autoFocus
              maxLength={NAME_MAX}
              returnKeyType="done"
              onSubmitEditing={() => void save()}
              plain
              style={styles.inputText}
            />

            <ThemedText
              lightColor={APP_SHELL_LABEL_COLOR}
              darkColor={APP_SHELL_LABEL_COLOR}
              style={styles.hint}
            >
              Shown in chats, search and on your Pixel card.
            </ThemedText>

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={styles.button}
              >
                {({ pressed }) => (
                  <>
                    <PixelFrameBackdrop frame={pressed ? "well" : "blue"} />
                    <Text style={[styles.buttonLabel, styles.cancelLabel]}>
                      Cancel
                    </Text>
                  </>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSave }}
                disabled={!canSave}
                onPress={() => void save()}
                style={[styles.button, !canSave && styles.disabled]}
              >
                {({ pressed }) => (
                  <>
                    <PixelFrameBackdrop
                      frame={pressed && canSave ? "well" : "green"}
                    />
                    <Text style={[styles.buttonLabel, styles.saveLabel]}>
                      Save
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  card: {
    padding: 20,
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    lineHeight: 18,
  },
  counter: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 13,
  },
  inputText: {
    fontSize: 12,
    paddingHorizontal: 14,
  },
  hint: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 14,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  button: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
  },
  cancelLabel: {
    color: APP_SHELL_LABEL_COLOR,
  },
  saveLabel: {
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
  disabled: {
    opacity: 0.45,
  },
});
