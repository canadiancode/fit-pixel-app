import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_LABEL_COLOR } from "@/constants/app-colors";
import { ChatSubScreenLayout } from "@/features/chat/components/chat-sub-screen-layout";
import { ChatThreadBody } from "@/features/chat/components/chat-thread-body";
import { GymChatHeaderCard } from "@/features/chat/components/gym-chat-header-card";
import { useChatThread } from "@/features/chat/use-chat-thread";
import { gymHeroSource } from "@/features/map/gym-catalog";
import {
  getGym,
  joinGymChat,
  listGymMessages,
  sendGymMessage,
  type GymListItem,
} from "@/lib/api/chat";
import { FitPixelApiError } from "@/lib/api/client";

export default function GymChatScreen() {
  const { gymId: gymIdParam } = useLocalSearchParams<{ gymId: string }>();
  const gymId = (Array.isArray(gymIdParam) ? gymIdParam[0] : gymIdParam) ?? "";
  const [threadHeroCollapsed, setThreadHeroCollapsed] = useState(false);
  const [gym, setGym] = useState<GymListItem | null>(null);
  const [gymError, setGymError] = useState<string | null>(null);

  useEffect(() => {
    if (!gymId) return;
    let cancelled = false;
    void joinGymChat(gymId)
      .then((row) => {
        if (!cancelled) setGym(row);
      })
      .catch(async (err) => {
        try {
          const row = await getGym(gymId);
          if (!cancelled) setGym(row);
        } catch {
          if (!cancelled) {
            setGymError(
              err instanceof FitPixelApiError
                ? err.message
                : "Could not open this gym chat.",
            );
          }
        }
      });
    return () => {
      cancelled = true;
    };
  }, [gymId]);

  const loadPage = useCallback(
    (before?: string) => listGymMessages(gymId, { before, limit: 50 }),
    [gymId],
  );
  const send = useCallback(
    (body: string) => sendGymMessage(gymId, body),
    [gymId],
  );

  const thread = useChatThread({
    enabled: gym != null && gymId.length > 0,
    reloadKey: gymId,
    loadPage,
    send,
  });

  const background_img = useMemo(
    () => gymHeroSource(gym?.imageKey),
    [gym?.imageKey],
  );

  return (
    <ChatSubScreenLayout
      fillBody
      showGymToolbarChevron
      gymThreadHeroCollapsed={threadHeroCollapsed}
      onGymThreadHeroCollapseToggle={() =>
        setThreadHeroCollapsed((prev) => !prev)
      }
      stackLeader={
        <GymChatHeaderCard
          collapsed={threadHeroCollapsed}
          name={gym?.name ?? "Gym chat"}
          memberCount={gym?.memberCount ?? 0}
          liveViewerCount={thread.liveViewerCount}
          background_img={background_img}
        />
      }
    >
      {gymError ? (
        <ThemedText
          style={styles.hint}
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
        >
          {gymError}
        </ThemedText>
      ) : (
        <ChatThreadBody
          messages={thread.messages}
          currentUserId={thread.currentUserId}
          loading={thread.loading}
          error={thread.error}
          emptyHint="No messages yet. Say hi to your gym."
          sending={thread.sending}
          onSend={thread.send}
          onLoadOlder={thread.loadOlder}
        />
      )}
    </ChatSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: 13,
    lineHeight: 20,
    padding: 16,
  },
});
