import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_SECONDARY_BACKGROUND,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";

export type SheetOption = {
  label: string;
  destructive?: boolean;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  options: SheetOption[];
  onClose: () => void;
};

const DESTRUCTIVE_COLOR = "#ff8a8a";

/** Bottom sheet of choices. Android Alert caps at 3 buttons, so chat uses this. */
export function OptionsSheet({
  visible,
  title,
  message,
  options,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Pressable
          style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}
          onPress={() => {}}
          accessibilityViewIsModal
        >
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.title}
            accessibilityRole="header"
          >
            {title}
          </ThemedText>
          {message ? (
            <ThemedText
              lightColor={APP_SHELL_LABEL_COLOR}
              darkColor={APP_SHELL_LABEL_COLOR}
              style={styles.message}
            >
              {message}
            </ThemedText>
          ) : null}
          <View style={styles.options}>
            {options.map((option) => (
              <Pressable
                key={option.label}
                accessibilityRole="button"
                onPress={option.onPress}
                style={({ pressed }) => [
                  styles.option,
                  pressed && styles.optionPressed,
                ]}
              >
                <ThemedText
                  lightColor={
                    option.destructive
                      ? DESTRUCTIVE_COLOR
                      : APP_SHELL_MAIN_TEXT_COLOR
                  }
                  darkColor={
                    option.destructive
                      ? DESTRUCTIVE_COLOR
                      : APP_SHELL_MAIN_TEXT_COLOR
                  }
                  style={styles.optionLabel}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.option,
                styles.cancel,
                pressed && styles.optionPressed,
              ]}
            >
              <ThemedText
                lightColor={APP_SHELL_LABEL_COLOR}
                darkColor={APP_SHELL_LABEL_COLOR}
                style={styles.optionLabel}
              >
                Cancel
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 8,
  },
  title: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    lineHeight: 18,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  options: {
    marginTop: 8,
    gap: 6,
  },
  option: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  optionPressed: {
    opacity: 0.8,
  },
  cancel: {
    marginTop: 4,
    backgroundColor: "transparent",
  },
  optionLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 16,
  },
});
