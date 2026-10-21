import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { ActionListSectionDivider } from "@/features/actions/components/action-list-section-divider";
import {
  CHAT_CARD_FILL,
  CHAT_CARD_RIM,
  CHAT_CARD_RIM_ACTIVE,
} from "@/features/chat/constants";
import { PixelHeadAvatar } from "@/features/social/components/pixel-head-avatar";
import { usePixelLooks } from "@/features/social/pixel-looks-store";
import type { ChatMessage, EquippedLook } from "@/lib/api/chat";

const AVATAR_SIZE = 30;
const AVATAR_GUTTER = AVATAR_SIZE + 8;
/** Same sender within this window reads as one group (one name, one time). */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

/** Bubbles: own = bright pixel-blue card, others = the Chat tab's card. */
const OWN_FILL = "#0b4f96";
const OWN_RIM = CHAT_CARD_RIM_ACTIVE;
/** Sentences in a readable face; the pixel font stays on names and labels. */
const BODY_FONT = Platform.select({ ios: "System", default: undefined });

type Props = {
  messages: ChatMessage[];
  currentUserId: string | null;
  loading: boolean;
  error: string | null;
  /** Shown when the thread has no messages (and isn't loading). */
  empty: ReactNode;
  onLoadOlder?: () => void;
  /** Long-press on someone else's message (report / block). */
  onPeerMessageLongPress?: (message: ChatMessage) => void;
};

type Row = {
  message: ChatMessage;
  isOwn: boolean;
  /** First bubble of a sender's run: show avatar + name. */
  startsGroup: boolean;
  /** Last bubble of a run: show the time under it. */
  endsGroup: boolean;
  /** First message of a calendar day: show the day divider above it. */
  dayLabel: string | null;
};

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(today.toISOString())) return "today";
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function sameRun(a: ChatMessage, b: ChatMessage): boolean {
  return (
    a.senderId === b.senderId &&
    dayKey(a.createdAt) === dayKey(b.createdAt) &&
    Math.abs(
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ) < GROUP_WINDOW_MS
  );
}

function buildRows(
  messages: ChatMessage[],
  currentUserId: string | null,
): Row[] {
  return messages.map((message, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    return {
      message,
      isOwn: currentUserId != null && message.senderId === currentUserId,
      startsGroup: prev == null || !sameRun(prev, message),
      endsGroup: next == null || !sameRun(message, next),
      dayLabel:
        prev == null || dayKey(prev.createdAt) !== dayKey(message.createdAt)
          ? dayLabel(message.createdAt)
          : null,
    };
  });
}

function openProfile(userId: string) {
  router.push({ pathname: "/(tabs)/chat/pixel/[userId]", params: { userId } });
}

function MessageRow({
  row,
  senderLook,
  onLongPress,
}: {
  row: Row;
  senderLook: EquippedLook | null | undefined;
  onLongPress?: (message: ChatMessage) => void;
}) {
  const { message, isOwn, startsGroup, endsGroup } = row;
  const actionable = !isOwn && onLongPress != null;
  const time = timeLabel(message.createdAt);

  const bubble = (
    <Pressable
      disabled={!actionable}
      onLongPress={actionable ? () => onLongPress(message) : undefined}
      delayLongPress={350}
      accessibilityLabel={
        isOwn
          ? `You, ${time}: ${message.body}`
          : `${message.senderDisplayName}, ${time}: ${message.body}`
      }
      accessibilityHint={
        actionable ? "Long press to report or block" : undefined
      }
      accessibilityActions={
        actionable
          ? [{ name: "longpress", label: "Report or block" }]
          : undefined
      }
      onAccessibilityAction={
        actionable
          ? (event) => {
              if (event.nativeEvent.actionName === "longpress") {
                onLongPress(message);
              }
            }
          : undefined
      }
      style={({ pressed }) => [
        styles.bubble,
        isOwn ? styles.ownBubble : styles.peerBubble,
        isOwn
          ? [
              !startsGroup && styles.ownJoinTop,
              !endsGroup && styles.ownJoinBottom,
            ]
          : [
              !startsGroup && styles.peerJoinTop,
              !endsGroup && styles.peerJoinBottom,
            ],
        pressed && actionable && styles.bubblePressed,
      ]}
    >
      {/* Not `selectable`: iOS text selection would swallow the long press. */}
      <Text style={styles.body}>{message.body}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.row, endsGroup && styles.rowGroupEnd]}>
      {row.dayLabel ? (
        <View style={styles.day}>
          <ActionListSectionDivider label={row.dayLabel} />
        </View>
      ) : null}
      {isOwn ? (
        <View style={styles.ownColumn}>
          {bubble}
          {endsGroup ? (
            <Text style={[styles.time, styles.timeOwn]}>{time}</Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.peerLine}>
          <View style={styles.avatarSlot}>
            {startsGroup ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${message.senderDisplayName}'s Pixel`}
                hitSlop={6}
                onPress={() => openProfile(message.senderId)}
                style={styles.avatarFrame}
              >
                <PixelHeadAvatar equipped={senderLook} size={AVATAR_SIZE} />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.peerColumn}>
            {startsGroup ? (
              <Pressable
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                onPress={() => openProfile(message.senderId)}
              >
                <ThemedText
                  lightColor={APP_SHELL_LABEL_COLOR}
                  darkColor={APP_SHELL_LABEL_COLOR}
                  style={styles.author}
                  numberOfLines={1}
                >
                  {message.senderDisplayName}
                </ThemedText>
              </Pressable>
            ) : null}
            {bubble}
            {endsGroup ? <Text style={styles.time}>{time}</Text> : null}
          </View>
        </View>
      )}
    </View>
  );
}

/**
 * Inverted list: newest at the bottom, the list stays pinned there as the
 * keyboard opens or messages arrive, and scrolling up loads older pages.
 */
export function MessageList({
  messages,
  currentUserId,
  loading,
  error,
  empty,
  onLoadOlder,
  onPeerMessageLongPress,
}: Props) {
  const listRef = useRef<FlatList<Row>>(null);
  const peerIds = useMemo(
    () =>
      messages
        .map((message) => message.senderId)
        .filter((id) => id !== currentUserId),
    [currentUserId, messages],
  );
  const lookFor = usePixelLooks(peerIds);
  const rows = useMemo(
    () => buildRows(messages, currentUserId).reverse(),
    [currentUserId, messages],
  );

  // Jump to the bottom when you send, even if you'd scrolled up.
  const newest = messages[messages.length - 1];
  const newestOwnId =
    newest && newest.senderId === currentUserId ? newest.id : null;
  useEffect(() => {
    if (newestOwnId)
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [newestOwnId]);

  const renderItem = useCallback(
    ({ item }: { item: Row }) => (
      <MessageRow
        row={item}
        senderLook={lookFor(item.message.senderId)}
        onLongPress={onPeerMessageLongPress}
      />
    ),
    [lookFor, onPeerMessageLongPress],
  );

  if (messages.length === 0) {
    return (
      <View style={styles.emptyRoot}>
        {loading ? (
          <ThemedText
            lightColor={APP_SHELL_LABEL_COLOR}
            darkColor={APP_SHELL_LABEL_COLOR}
            style={styles.status}
          >
            Loading messages...
          </ThemedText>
        ) : error ? (
          <ThemedText
            lightColor={APP_SHELL_LABEL_COLOR}
            darkColor={APP_SHELL_LABEL_COLOR}
            style={styles.status}
          >
            {error}
          </ThemedText>
        ) : (
          empty
        )}
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      inverted
      data={rows}
      keyExtractor={(row) => row.message.id}
      renderItem={renderItem}
      extraData={lookFor}
      style={styles.list}
      contentContainerStyle={styles.content}
      onEndReached={onLoadOlder}
      onEndReachedThreshold={0.25}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 120,
      }}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  emptyRoot: {
    flex: 1,
    paddingHorizontal: 16,
  },
  status: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 16,
    paddingTop: 16,
    textAlign: "center",
  },
  row: {
    paddingBottom: 3,
  },
  rowGroupEnd: {
    paddingBottom: 12,
  },
  day: {
    paddingTop: 4,
    paddingBottom: 12,
  },
  ownColumn: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
    maxWidth: "80%",
  },
  peerLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    maxWidth: "88%",
  },
  avatarSlot: {
    width: AVATAR_GUTTER,
  },
  /** Tap target only: the circular avatar sits on the chat background. */
  avatarFrame: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  peerColumn: {
    flexShrink: 1,
    alignItems: "flex-start",
  },
  author: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 13,
    marginBottom: 4,
  },
  bubble: {
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ownBubble: {
    backgroundColor: OWN_FILL,
    borderColor: OWN_RIM,
  },
  peerBubble: {
    backgroundColor: CHAT_CARD_FILL,
    borderColor: CHAT_CARD_RIM,
  },
  /** Square off the corners where bubbles in one run meet. */
  ownJoinTop: {
    borderTopRightRadius: 3,
  },
  ownJoinBottom: {
    borderBottomRightRadius: 3,
  },
  peerJoinTop: {
    borderTopLeftRadius: 3,
  },
  peerJoinBottom: {
    borderBottomLeftRadius: 3,
  },
  bubblePressed: {
    opacity: 0.8,
  },
  body: {
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontFamily: BODY_FONT,
    fontSize: 15,
    lineHeight: 21,
  },
  time: {
    color: APP_SHELL_LABEL_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 12,
    marginTop: 4,
  },
  timeOwn: {
    textAlign: "right",
  },
});
