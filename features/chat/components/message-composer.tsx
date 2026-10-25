import { Image } from "expo-image";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PixelFrameBackdrop } from "@/components/pixel-panel";
import {
  APP_SHELL_INPUT_PLACEHOLDER_COLOR,
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import {
  CHAT_BODY_FONT,
  CHAT_CARD_RIM,
  CHAT_TRACK_FILL,
} from "@/features/chat/constants";

const SEND_ICON = require("@/assets/icons/send-message.png");
const MAX_LENGTH = 2000;
/** Start counting down this close to the limit. */
const COUNTER_FROM = 1800;
const SEND_SIZE = 46;

type Props = {
  onSend: (body: string) => Promise<void>;
  sending: boolean;
  disabled?: boolean;
  placeholder?: string;
};

/**
 * Growing multi-line field (up to ~5 lines, then it scrolls) and a pixel send
 * button. Return adds a new line; the button sends, like most chat apps.
 */
export function MessageComposer({
  onSend,
  sending,
  disabled,
  placeholder = "Message...",
}: Props) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const canSend = draft.trim().length > 0 && !sending && !disabled;
  const remaining = MAX_LENGTH - draft.length;

  const submit = useCallback(async () => {
    const body = draft.trim();
    if (!body || sending || disabled) return;
    try {
      await onSend(body);
      setDraft("");
    } catch {
      // The thread shows the error; keep the draft so nothing is lost.
    }
  }, [disabled, draft, onSend, sending]);

  return (
    <View style={styles.bar}>
      <View style={styles.field}>
        {/* Recessed text box; lights up to the card frame while typing. */}
        <PixelFrameBackdrop frame={focused ? "blue" : "well"} />
        <TextInput
          accessibilityLabel="Message"
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder}
          placeholderTextColor={APP_SHELL_INPUT_PLACEHOLDER_COLOR}
          style={styles.input}
          maxLength={MAX_LENGTH}
          editable={!disabled}
          multiline
          textAlignVertical="center"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          underlineColorAndroid="transparent"
          keyboardAppearance="dark"
        />
        {remaining <= MAX_LENGTH - COUNTER_FROM ? (
          <Text
            style={[styles.counter, remaining <= 0 && styles.counterOver]}
            accessibilityLabel={`${remaining} characters left`}
          >
            {remaining}
          </Text>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send message"
        accessibilityState={{ disabled: !canSend, busy: sending }}
        disabled={!canSend}
        hitSlop={6}
        onPress={() => {
          void submit();
        }}
        style={({ pressed }) => [
          styles.send,
          !canSend && !sending && styles.sendDisabled,
          pressed && canSend && styles.sendPressed,
        ]}
      >
        <Image
          source={SEND_ICON}
          style={StyleSheet.absoluteFillObject}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
        {sending ? (
          <ActivityIndicator color={APP_SHELL_MAIN_TEXT_COLOR} size="small" />
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 2,
    borderTopColor: CHAT_CARD_RIM,
    backgroundColor: CHAT_TRACK_FILL,
  },
  field: {
    flex: 1,
    minWidth: 0,
    minHeight: SEND_SIZE,
    maxHeight: 132,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    paddingRight: 10,
  },
  input: {
    flex: 1,
    minWidth: 0,
    maxHeight: 128,
    paddingTop: Platform.OS === "ios" ? 12 : 8,
    paddingBottom: Platform.OS === "ios" ? 12 : 8,
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontFamily: CHAT_BODY_FONT,
    fontSize: 16,
    lineHeight: 21,
  },
  counter: {
    alignSelf: "flex-end",
    marginBottom: 8,
    marginLeft: 6,
    color: APP_SHELL_LABEL_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 12,
  },
  counterOver: {
    color: "#ff8a8a",
  },
  send: {
    width: SEND_SIZE,
    height: SEND_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
});
