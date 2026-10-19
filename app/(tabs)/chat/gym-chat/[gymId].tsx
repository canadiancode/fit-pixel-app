import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_LABEL_COLOR } from "@/constants/app-colors";
import { useChatThreadHeader } from "@/features/chat/chat-thread-header-context";
import { ChatEmptyState } from "@/features/chat/components/chat-empty-state";
import { ChatSubScreenLayout } from "@/features/chat/components/chat-sub-screen-layout";
import { ChatThreadBody } from "@/features/chat/components/chat-thread-body";
import { GymChatInfoStrip } from "@/features/chat/components/gym-chat-info-strip";
import { goBackInChat } from "@/features/chat/navigation";
import { useChatThread } from "@/features/chat/use-chat-thread";
import { gymHeroSource } from "@/features/map/gym-catalog";
import {
  getGym,
  joinGymChat,
  leaveGymChat,
  listGymMessages,
  sendGymMessage,
  setGymFavorite,
  type GymListItem,
} from "@/lib/api/chat";
import { FitPixelApiError } from "@/lib/api/client";

const DUMBBELL_ICON = require("@/assets/icons/dumbbell.png");

function errorText(err: unknown, fallback: string): string {
  return err instanceof FitPixelApiError ? err.message : fallback;
}

export default function GymChatScreen() {
  const router = useRouter();
  const { gymId: gymIdParam } = useLocalSearchParams<{ gymId: string }>();
  const gymId = (Array.isArray(gymIdParam) ? gymIdParam[0] : gymIdParam) ?? "";
  const [gym, setGym] = useState<GymListItem | null>(null);
  const [gymError, setGymError] = useState<string | null>(null);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Opening a gym (from the Map, search or your list) enters it.
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
            setGymError(errorText(err, "Could not open this gym chat."));
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

  const memberCount = gym?.memberCount ?? 0;
  useChatThreadHeader({
    title: gym?.name ?? "Gym chat",
    subtitle: gym
      ? `${memberCount} member${memberCount === 1 ? "" : "s"} · ${thread.liveViewerCount} here now`
      : null,
  });

  const heroImage = useMemo(
    () => gymHeroSource(gym?.imageKey),
    [gym?.imageKey],
  );

  const toggleFavorite = useCallback(() => {
    if (!gym || favoriteBusy) return;
    const previous = gym;
    const next = !(gym.favorite ?? false);
    setGym({ ...gym, favorite: next });
    setFavoriteBusy(true);
    void setGymFavorite(gym.id, next)
      .then((row) => setGym(row))
      .catch((err) => {
        setGym(previous);
        const message =
          err instanceof FitPixelApiError && err.status === 404
            ? "Favourites aren't available yet. Try again later."
            : errorText(err, "Please try again.");
        Alert.alert("Couldn't update favourites", message);
      })
      .finally(() => setFavoriteBusy(false));
  }, [favoriteBusy, gym]);

  const confirmLeave = useCallback(() => {
    if (!gym || leaving) return;
    Alert.alert(
      `Leave ${gym.name}?`,
      `It will be removed from your gyms${gym.favorite ? " and favourites" : ""}. ` +
        "You can come back anytime from the Map or by searching.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            setLeaving(true);
            void leaveGymChat(gym.id)
              .then(() => goBackInChat(router))
              .catch((err) => {
                setLeaving(false);
                Alert.alert(
                  "Couldn't leave this gym",
                  errorText(err, "Please try again."),
                );
              });
          },
        },
      ],
    );
  }, [gym, leaving, router]);

  return (
    <ChatSubScreenLayout
      fillBody
      toolbar={false}
      stackLeader={
        gym ? (
          <GymChatInfoStrip
            image={heroImage}
            favorite={gym.favorite ?? false}
            favoriteBusy={favoriteBusy}
            onToggleFavorite={toggleFavorite}
            onLeave={confirmLeave}
            leaving={leaving}
          />
        ) : null
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
          loading={thread.loading || gym == null}
          error={thread.error}
          empty={
            <ChatEmptyState
              icon={DUMBBELL_ICON}
              title="No messages yet"
              body={`Say hi to everyone training at ${gym?.name ?? "this gym"}.`}
            />
          }
          composerPlaceholder="Message your gym..."
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
