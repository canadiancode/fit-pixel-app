import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_INPUT_BOARDER_COLOR,
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_PRIMARY_BACKGROUND,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";

import { usePrefsProfile } from "../prefs-profile-context";
import { SettingsSingleLineTextField } from "./settings-text-field";
import {
  SETTINGS_CARD_FILL,
  SETTINGS_CARD_RIM,
  SETTINGS_CARD_RIM_ACTIVE,
  SETTINGS_ON_COLOR,
} from "./settings-ui";

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
              shellStyle={styles.inputBox}
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
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.buttonLabel, styles.cancelLabel]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSave }}
                disabled={!canSave}
                onPress={() => void save()}
                style={({ pressed }) => [
                  styles.button,
                  styles.saveButton,
                  pressed && styles.pressed,
                  !canSave && styles.disabled,
                ]}
              >
                <Text style={[styles.buttonLabel, styles.saveLabel]}>Save</Text>
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
    borderRadius: 12,
    borderWidth: 2,
    borderColor: SETTINGS_CARD_RIM_ACTIVE,
    backgroundColor: SETTINGS_CARD_FILL,
    padding: 16,
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
  /** Same box as the Profile fields. */
  inputBox: {
    borderWidth: 2,
    borderColor: APP_SHELL_INPUT_BOARDER_COLOR,
    borderRadius: 8,
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
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: SETTINGS_CARD_RIM,
    backgroundColor: APP_SHELL_PRIMARY_BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    borderColor: SETTINGS_ON_COLOR,
    backgroundColor: "rgba(95,211,95,0.18)",
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
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.45,
  },
});
