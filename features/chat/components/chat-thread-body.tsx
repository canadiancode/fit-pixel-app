import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

import type { ChatMessage } from "@/lib/api/chat";
import { FitPixelApiError } from "@/lib/api/client";

import { MessageComposer } from "./message-composer";
import { MessageList } from "./message-list";

type Props = {
  messages: ChatMessage[];
  currentUserId: string | null;
  loading: boolean;
  error: string | null;
  emptyHint: string;
  sending: boolean;
  disabled?: boolean;
  onSend: (body: string) => Promise<void>;
  onLoadOlder?: () => void;
};

export function ChatThreadBody({
  messages,
  currentUserId,
  loading,
  error,
  emptyHint,
  sending,
  disabled,
  onSend,
  onLoadOlder,
}: Props) {
  const [sendError, setSendError] = useState<string | null>(null);

  const handleSend = useCallback(
    async (body: string) => {
      setSendError(null);
      try {
        await onSend(body);
      } catch (err) {
        const message =
          err instanceof FitPixelApiError
            ? err.message
            : "Could not send message.";
        setSendError(message);
      }
    },
    [onSend],
  );

  return (
    <View style={styles.root}>
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        loading={loading}
        error={sendError ?? error}
        emptyHint={emptyHint}
        onLoadOlder={onLoadOlder}
      />
      <MessageComposer
        onSend={handleSend}
        sending={sending}
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
});
