import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { useChatThreadHeader } from "@/features/chat/chat-thread-header-context";
import { ChatEmptyState } from "@/features/chat/components/chat-empty-state";
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

const CHAT_ICON = require("@/assets/icons/enter-chat.png");

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
        setPeer(
          rows.find((row) => row.conversationId === conversationId) ?? null,
        );
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

  const peerUserId = peer?.peerUserId;
  const openPeer = useCallback(() => {
    if (!peerUserId) return;
    router.push({
      pathname: "/(tabs)/chat/pixel/[userId]",
      params: { userId: peerUserId },
    });
  }, [peerUserId]);

  useChatThreadHeader({
    title: peer?.peerDisplayName ?? "Direct message",
    subtitle: peer ? "Tap to view their Pixel" : null,
    onTitlePress: peerUserId ? openPeer : undefined,
    titleA11yHint: "Opens their Pixel card",
  });

  const thread = useChatThread({
    enabled: conversationId.length > 0,
    reloadKey: conversationId,
    loadPage,
    send,
  });

  const name = peer?.peerDisplayName;
  return (
    <ChatSubScreenLayout fillBody toolbar={false}>
      <ChatThreadBody
        messages={thread.messages}
        currentUserId={thread.currentUserId}
        loading={thread.loading}
        error={thread.error}
        empty={
          <ChatEmptyState
            icon={CHAT_ICON}
            title="No messages yet"
            body={
              name
                ? `Start the conversation with ${name}.`
                : "Start the conversation."
            }
          />
        }
        composerPlaceholder={name ? `Message ${name}` : "Message..."}
        sending={thread.sending}
        onSend={thread.send}
        onLoadOlder={thread.loadOlder}
      />
    </ChatSubScreenLayout>
  );
}
