import { useEffect, useRef } from "react";

import type { ChatMessage } from "@/lib/api/chat";
import { getSupabaseClient } from "@/lib/supabase/client";

type RealtimeMessageRow = {
  id?: string;
  conversation_id?: string;
  sender_id?: string;
  body?: string;
  created_at?: string;
  deleted_at?: string | null;
};

function rowToMessage(row: RealtimeMessageRow): ChatMessage | null {
  if (!row.id || !row.conversation_id || !row.sender_id || !row.body || !row.created_at) {
    return null;
  }
  if (row.deleted_at) return null;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderDisplayName: "Pixel",
    body: row.body,
    createdAt: row.created_at,
  };
}

type Options = {
  conversationId: string | null;
  userId: string | null;
  onMessage: (message: ChatMessage) => void;
  onPresence: (liveCount: number) => void;
};

/** Subscribe to new messages + presence for one conversation. */
export function useConversationRealtime({
  conversationId,
  userId,
  onMessage,
  onPresence,
}: Options): void {
  const onMessageRef = useRef(onMessage);
  const onPresenceRef = useRef(onPresence);
  onMessageRef.current = onMessage;
  onPresenceRef.current = onPresence;

  useEffect(() => {
    if (!conversationId || !userId) return;
    const client = getSupabaseClient();
    if (!client) return;

    const channel = client.channel(`conversation:${conversationId}`, {
      config: { presence: { key: userId } },
    });

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const message = rowToMessage(payload.new as RealtimeMessageRow);
        if (message) onMessageRef.current(message);
      },
    );

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      onPresenceRef.current(Object.keys(state).length);
    });

    void channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ userId });
      }
    });

    return () => {
      void client.removeChannel(channel);
    };
  }, [conversationId, userId]);
}
