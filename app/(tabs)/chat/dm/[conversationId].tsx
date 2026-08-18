import { useLocalSearchParams } from "expo-router";
import { useCallback } from "react";
import { StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { ChatSubScreenLayout } from "@/features/chat/components/chat-sub-screen-layout";
import { ChatThreadBody } from "@/features/chat/components/chat-thread-body";
import { useChatThread } from "@/features/chat/use-chat-thread";
import { listDmMessages, sendDmMessage } from "@/lib/api/chat";

export default function DmScreen() {
  const { conversationId: rawId } = useLocalSearchParams<{
    conversationId: string;
  }>();
  const conversationId = (Array.isArray(rawId) ? rawId[0] : rawId) ?? "";

  const loadPage = useCallback(
    (before?: string) => listDmMessages(conversationId, { before, limit: 50 }),
    [conversationId],
  );
  const send = useCallback(
    (body: string) => sendDmMessage(conversationId, body),
    [conversationId],
  );

  const thread = useChatThread({
    enabled: conversationId.length > 0,
    reloadKey: conversationId,
    loadPage,
    send,
  });

  return (
    <ChatSubScreenLayout fillBody>
      <ThemedText
        type="title"
        lightColor={APP_SHELL_MAIN_TEXT_COLOR}
        darkColor={APP_SHELL_MAIN_TEXT_COLOR}
        style={styles.title}
      >
        Direct message
      </ThemedText>
      <ChatThreadBody
        messages={thread.messages}
        currentUserId={thread.currentUserId}
        loading={thread.loading}
        error={thread.error}
        emptyHint="No messages yet. Start the conversation."
        sending={thread.sending}
        onSend={thread.send}
        onLoadOlder={thread.loadOlder}
      />
    </ChatSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    paddingHorizontal: 16,
    paddingTop: 8,
    fontSize: 16,
    lineHeight: 22,
  },
});
