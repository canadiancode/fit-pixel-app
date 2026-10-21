import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_PRIMARY_BACKGROUND,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { useAuth } from "@/features/auth/auth-context";
import { useBlockedUsers } from "@/features/chat/blocked-users-store";
import { ChatSubScreenLayout } from "@/features/chat/components/chat-sub-screen-layout";
import { useUserSafetyActions } from "@/features/chat/use-user-safety-actions";
import { FriendshipButton } from "@/features/social/components/friendship-button";
import {
  PixelCollection,
  PixelShowcase,
} from "@/features/social/components/pixel-showcase";
import { useNotifications } from "@/features/social/notifications-context";
import { useFriendshipActions } from "@/features/social/use-friendship-actions";
import {
  createOrGetDm,
  getPixel,
  type FriendshipStatus,
  type PixelProfile,
} from "@/lib/api/chat";
import { FitPixelApiError } from "@/lib/api/client";

const BLOCK_COLOR = "#ff8a8a";

export default function PixelProfileScreen() {
  const { userId: rawId } = useLocalSearchParams<{ userId: string }>();
  const userId = (Array.isArray(rawId) ? rawId[0] : rawId) ?? "";
  const [pixel, setPixel] = useState<PixelProfile | null>(null);
  const [friendship, setFriendship] = useState<FriendshipStatus>("none");
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const { user } = useAuth();
  const { blockedIds, unblock } = useBlockedUsers();
  const safety = useUserSafetyActions();
  const friendActions = useFriendshipActions();
  const { changeKey } = useNotifications();
  const isSelf = user?.id === userId;
  const isBlocked = blockedIds.has(userId);
  const target = { userId, displayName: pixel?.displayName || "this Pixel" };

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void getPixel(userId)
      .then((row) => {
        if (cancelled) return;
        setPixel(row);
        setFriendship(row.friendship ?? "none");
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof FitPixelApiError
              ? err.message
              : "Could not load this Pixel.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
    // `changeKey` refetches when they accept / send a request while we're here.
  }, [userId, changeKey]);

  // Blocking ends the friendship server-side.
  useEffect(() => {
    if (isBlocked) setFriendship("none");
  }, [isBlocked]);

  const openDm = useCallback(async () => {
    if (!userId || opening) return;
    setOpening(true);
    setError(null);
    try {
      const { conversationId } = await createOrGetDm(userId);
      router.push({
        pathname: "/(tabs)/chat/dm/[conversationId]",
        params: { conversationId },
      });
    } catch (err) {
      setError(
        err instanceof FitPixelApiError
          ? err.message
          : "Could not open a direct message.",
      );
    } finally {
      setOpening(false);
    }
  }, [opening, userId]);

  return (
    <ChatSubScreenLayout>
      <PixelShowcase
        equipped={pixel == null ? undefined : (pixel.equipped ?? null)}
        accessibilityLabel={`${target.displayName}'s pixel`}
      />
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <ThemedText
            type="title"
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.name}
            numberOfLines={2}
          >
            {pixel?.displayName || "Pixel profile"}
          </ThemedText>
          {pixel?.homeGymName ? (
            <ThemedText
              lightColor={APP_SHELL_LABEL_COLOR}
              darkColor={APP_SHELL_LABEL_COLOR}
              style={styles.meta}
              numberOfLines={2}
            >
              Home gym: {pixel.homeGymName}
            </ThemedText>
          ) : null}
          {friendship === "friends" && !isBlocked ? (
            <ThemedText
              lightColor={APP_SHELL_LABEL_COLOR}
              darkColor={APP_SHELL_LABEL_COLOR}
              style={styles.meta}
            >
              You&apos;re friends
            </ThemedText>
          ) : null}
        </View>
      </View>
      {pixel?.bio ? (
        <ThemedText
          style={styles.body}
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
        >
          {pixel.bio}
        </ThemedText>
      ) : null}
      {error || isBlocked || !pixel ? (
        <ThemedText
          style={styles.body}
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
        >
          {error ??
            (isBlocked
              ? "You blocked this Pixel. Their messages are hidden and direct messages are off."
              : "Loading Pixel...")}
        </ThemedText>
      ) : null}
      <View style={styles.actions}>
        {pixel && !isBlocked && !isSelf ? (
          <FriendshipButton
            target={target}
            status={friendship}
            actions={friendActions}
            onChange={setFriendship}
          />
        ) : null}
        {!isBlocked && !isSelf ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send direct message"
            disabled={!userId || opening}
            onPress={() => {
              void openDm();
            }}
            style={({ pressed }) => [
              styles.dmButton,
              pressed && styles.dmButtonPressed,
              (!userId || opening) && styles.dmButtonDisabled,
            ]}
          >
            <ThemedText
              lightColor={APP_SHELL_MAIN_TEXT_COLOR}
              darkColor={APP_SHELL_MAIN_TEXT_COLOR}
              style={styles.dmLabel}
            >
              {opening ? "Opening..." : "Message"}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
      {pixel && !isBlocked ? (
        <PixelCollection
          equipped={pixel.equipped ?? null}
          subtitle={
            isSelf
              ? "What you're showing off."
              : `What ${target.displayName} is showing off.`
          }
        />
      ) : null}
      {userId && !isSelf ? (
        <View style={styles.safetyActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Report ${target.displayName}`}
            onPress={() => safety.openReport(target)}
            style={({ pressed }) => [
              styles.safetyButton,
              pressed && styles.dmButtonPressed,
            ]}
          >
            <ThemedText
              lightColor={APP_SHELL_LABEL_COLOR}
              darkColor={APP_SHELL_LABEL_COLOR}
              style={styles.dmLabel}
            >
              Report
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isBlocked
                ? `Unblock ${target.displayName}`
                : `Block ${target.displayName}`
            }
            onPress={() => {
              if (isBlocked) {
                void unblock(userId).catch((err) => {
                  Alert.alert(
                    "Could not unblock",
                    err instanceof Error ? err.message : "Please try again.",
                  );
                });
              } else {
                safety.confirmBlock(target);
              }
            }}
            style={({ pressed }) => [
              styles.safetyButton,
              pressed && styles.dmButtonPressed,
            ]}
          >
            <ThemedText
              lightColor={BLOCK_COLOR}
              darkColor={BLOCK_COLOR}
              style={styles.dmLabel}
            >
              {isBlocked ? "Unblock" : "Block"}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
      {safety.sheet}
    </ChatSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop: 14,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  name: {
    fontSize: 20,
    lineHeight: 26,
  },
  meta: {
    fontSize: 11,
    lineHeight: 16,
  },
  body: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 22,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },
  dmButton: {
    alignSelf: "flex-start",
    backgroundColor: APP_SHELL_PRIMARY_BACKGROUND,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dmButtonPressed: {
    opacity: 0.85,
  },
  dmButtonDisabled: {
    opacity: 0.5,
  },
  dmLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
  },
  safetyActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 28,
  },
  safetyButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
