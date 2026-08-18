import { useCallback, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_INPUT_BOARDER_COLOR,
  APP_SHELL_INPUT_PLACEHOLDER_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_PRIMARY_BACKGROUND,
  APP_SHELL_SECONDARY_BACKGROUND,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";

const SINGLE_LINE_ANDROID = Platform.select({
  android: {
    includeFontPadding: false,
    textAlignVertical: "center" as const,
  },
  default: {},
});

type Props = {
  onSend: (body: string) => Promise<void>;
  sending: boolean;
  disabled?: boolean;
};

export function MessageComposer({ onSend, sending, disabled }: Props) {
  const [draft, setDraft] = useState("");
  const canSend = draft.trim().length > 0 && !sending && !disabled;

  const submit = useCallback(async () => {
    const body = draft.trim();
    if (!body || sending || disabled) return;
    await onSend(body);
    setDraft("");
  }, [disabled, draft, onSend, sending]);

  return (
    <View style={styles.bar}>
      <TextInput
        accessibilityLabel="Message"
        value={draft}
        onChangeText={setDraft}
        placeholder="Say something..."
        placeholderTextColor={APP_SHELL_INPUT_PLACEHOLDER_COLOR}
        style={styles.input}
        maxLength={2000}
        editable={!disabled}
        returnKeyType="send"
        onSubmitEditing={() => {
          void submit();
        }}
        blurOnSubmit={false}
        underlineColorAndroid="transparent"
        {...SINGLE_LINE_ANDROID}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send"
        disabled={!canSend}
        onPress={() => {
          void submit();
        }}
        style={({ pressed }) => [
          styles.send,
          !canSend && styles.sendDisabled,
          pressed && canSend && styles.sendPressed,
        ]}
      >
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.sendLabel}
        >
          Send
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: APP_SHELL_INPUT_BOARDER_COLOR,
    backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: APP_SHELL_INPUT_BOARDER_COLOR,
    paddingHorizontal: 12,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
  send: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: APP_SHELL_PRIMARY_BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: {
    opacity: 0.45,
  },
  sendPressed: {
    opacity: 0.85,
  },
  sendLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 16,
  },
});
