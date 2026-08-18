import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/features/auth/auth-context";
import { useConversationRealtime } from "@/features/chat/use-conversation-realtime";
import type { ChatMessage } from "@/lib/api/chat";
import { FitPixelApiError } from "@/lib/api/client";

type LoadPage = (before?: string) => Promise<{
  conversationId: string;
  messages: ChatMessage[];
}>;

type SendFn = (body: string) => Promise<ChatMessage>;

function mergeMessages(
  current: ChatMessage[],
  incoming: ChatMessage[],
): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const message of current) byId.set(message.id, message);
  for (const message of incoming) {
    const existing = byId.get(message.id);
    if (existing && existing.senderDisplayName !== "Pixel") {
      byId.set(message.id, existing);
    } else if (existing && message.senderDisplayName === "Pixel") {
      byId.set(message.id, {
        ...message,
        senderDisplayName: existing.senderDisplayName,
      });
    } else {
      const named = [...byId.values()].find(
        (item) =>
          item.senderId === message.senderId &&
          item.senderDisplayName !== "Pixel",
      );
      byId.set(message.id, {
        ...message,
        senderDisplayName:
          message.senderDisplayName !== "Pixel"
            ? message.senderDisplayName
            : (named?.senderDisplayName ?? message.senderDisplayName),
      });
    }
  }
  return [...byId.values()].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
}

export function useChatThread(options: {
  enabled: boolean;
  reloadKey: string;
  loadPage: LoadPage;
  send: SendFn;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [liveViewerCount, setLiveViewerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const loadingOlder = useRef(false);
  const loadPageRef = useRef(options.loadPage);
  const sendRef = useRef(options.send);
  loadPageRef.current = options.loadPage;
  sendRef.current = options.send;

  useEffect(() => {
    if (!options.enabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setMessages([]);
    setConversationId(null);
    void loadPageRef
      .current()
      .then((result) => {
        if (cancelled) return;
        setConversationId(result.conversationId);
        setMessages(result.messages);
        setHasMore(result.messages.length >= 50);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof FitPixelApiError
            ? err.message
            : "Could not load messages.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [options.enabled, options.reloadKey]);

  const onRealtimeMessage = useCallback((message: ChatMessage) => {
    setMessages((current) => mergeMessages(current, [message]));
  }, []);

  useConversationRealtime({
    conversationId,
    userId: user?.id ?? null,
    onMessage: onRealtimeMessage,
    onPresence: setLiveViewerCount,
  });

  const send = useCallback(
    async (body: string) => {
      setSending(true);
      try {
        const message = await sendRef.current(body);
        setMessages((current) => mergeMessages(current, [message]));
      } finally {
        setSending(false);
      }
    },
    [],
  );

  const loadOlder = useCallback(() => {
    if (!hasMore || loadingOlder.current || messages.length === 0) return;
    const oldest = messages[0];
    loadingOlder.current = true;
    void loadPageRef
      .current(oldest.createdAt)
      .then((result) => {
        setHasMore(result.messages.length >= 50);
        setMessages((current) => mergeMessages(result.messages, current));
      })
      .finally(() => {
        loadingOlder.current = false;
      });
  }, [hasMore, messages]);

  return {
    messages,
    conversationId,
    liveViewerCount,
    loading,
    sending,
    error,
    send,
    loadOlder,
    currentUserId: user?.id ?? null,
  };
}
