import { useCallback, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { useUserSafetyActions } from "@/features/chat/use-user-safety-actions";
import type { ChatMessage } from "@/lib/api/chat";
import { FitPixelApiError } from "@/lib/api/client";

import { KeyboardAwareView } from "./keyboard-aware-view";
import { MessageComposer } from "./message-composer";
import { MessageList } from "./message-list";

type Props = {
  messages: ChatMessage[];
  currentUserId: string | null;
  loading: boolean;
  error: string | null;
  /** Shown when the thread has no messages yet. */
  empty: ReactNode;
  composerPlaceholder?: string;
  sending: boolean;
  disabled?: boolean;
  onSend: (body: string) => Promise<void>;
  onLoadOlder?: () => void;
};

/** Message list + composer, lifted above the keyboard as one block. */
export function ChatThreadBody({
  messages,
  currentUserId,
  loading,
  error,
  empty,
  composerPlaceholder,
  sending,
  disabled,
  onSend,
  onLoadOlder,
}: Props) {
  const [sendError, setSendError] = useState<string | null>(null);
  const safety = useUserSafetyActions();

  const handleSend = useCallback(
    async (body: string) => {
      setSendError(null);
      try {
        await onSend(body);
      } catch (err) {
        setSendError(
          err instanceof FitPixelApiError
            ? err.message
            : "Could not send message.",
        );
        // Rethrow so the composer keeps the draft for another try.
        throw err;
      }
    },
    [onSend],
  );

  return (
    <KeyboardAwareView>
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        loading={loading}
        error={error}
        empty={empty}
        onLoadOlder={onLoadOlder}
        onPeerMessageLongPress={safety.openMessageActions}
      />
      {sendError ? (
        <Pressable
          accessibilityRole="alert"
          accessibilityLabel={`${sendError}. Tap to dismiss`}
          onPress={() => setSendError(null)}
          style={styles.errorBanner}
        >
          <Text style={styles.errorText}>{sendError}</Text>
          <Text style={styles.errorDismiss}>×</Text>
        </Pressable>
      ) : null}
      <MessageComposer
        onSend={handleSend}
        sending={sending}
        disabled={disabled}
        placeholder={composerPlaceholder}
      />
      {safety.sheet}
    </KeyboardAwareView>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ff8a8a",
    backgroundColor: "rgba(255, 90, 90, 0.16)",
  },
  errorText: {
    flex: 1,
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 14,
  },
  errorDismiss: {
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontSize: 18,
    lineHeight: 20,
  },
});
