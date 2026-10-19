import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { ChatSubScreenLayout } from "@/features/chat/components/chat-sub-screen-layout";
import { ChatThreadBody } from "@/features/chat/components/chat-thread-body";
import { useChatThread } from "@/features/chat/use-chat-thread";
import { usePush } from "@/features/push/push-context";
import { useNotifications } from "@/features/social/notifications-context";
import {
  listDmMessages,
  listDms,
  sendDmMessage,
  type DmListItem,
} from "@/lib/api/chat";

export default function DmScreen() {
  const { conversationId: rawId } = useLocalSearchParams<{
    conversationId: string;
  }>();
  const conversationId = (Array.isArray(rawId) ? rawId[0] : rawId) ?? "";
  const [peer, setPeer] = useState<DmListItem | null>(null);
  const { refresh: refreshNotifications } = useNotifications();
  const { askAfterSocialAction } = usePush();

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    void listDms()
      .then((rows) => {
        if (cancelled) return;
        setPeer(rows.find((row) => row.conversationId === conversationId) ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  const loadPage = useCallback(
    async (before?: string) => {
      const page = await listDmMessages(conversationId, { before, limit: 50 });
      // Reading the thread clears its notification server-side.
      if (!before) void refreshNotifications();
      return page;
    },
    [conversationId, refreshNotifications],
  );
  const send = useCallback(
    async (body: string) => {
      const sent = await sendDmMessage(conversationId, body);
      // Offer push so their reply reaches you with the app closed.
      askAfterSocialAction();
      return sent;
    },
    [askAfterSocialAction, conversationId],
  );

  const thread = useChatThread({
    enabled: conversationId.length > 0,
    reloadKey: conversationId,
    loadPage,
    send,
  });

  return (
    <ChatSubScreenLayout fillBody>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          peer ? `Open ${peer.peerDisplayName}'s profile` : "Direct message"
        }
        disabled={!peer}
        onPress={() => {
          if (!peer) return;
          router.push({
            pathname: "/(tabs)/chat/pixel/[userId]",
            params: { userId: peer.peerUserId },
          });
        }}
      >
        <ThemedText
          type="title"
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.title}
          numberOfLines={1}
        >
          {peer?.peerDisplayName ?? "Direct message"}
        </ThemedText>
      </Pressable>
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
