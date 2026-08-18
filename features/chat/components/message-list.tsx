import { useCallback, useEffect, useRef } from "react";
import { FlatList, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_PRIMARY_BACKGROUND,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import type { ChatMessage } from "@/lib/api/chat";

type Props = {
  messages: ChatMessage[];
  currentUserId: string | null;
  loading: boolean;
  error: string | null;
  emptyHint: string;
  onLoadOlder?: () => void;
};

function MessageBubble({
  message,
  isOwn,
}: {
  message: ChatMessage;
  isOwn: boolean;
}) {
  return (
    <View style={[styles.bubbleWrap, isOwn ? styles.bubbleOwn : styles.bubblePeer]}>
      {!isOwn ? (
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.author}
          numberOfLines={1}
        >
          {message.senderDisplayName}
        </ThemedText>
      ) : null}
      <View style={[styles.bubble, isOwn ? styles.ownFill : styles.peerFill]}>
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.body}
        >
          {message.body}
        </ThemedText>
      </View>
    </View>
  );
}

export function MessageList({
  messages,
  currentUserId,
  loading,
  error,
  emptyHint,
  onLoadOlder,
}: Props) {
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const stickToEnd = useRef(true);

  useEffect(() => {
    if (!stickToEnd.current || messages.length === 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: false });
    });
  }, [messages.length]);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageBubble
        message={item}
        isOwn={currentUserId != null && item.senderId === currentUserId}
      />
    ),
    [currentUserId],
  );

  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      style={styles.list}
      contentContainerStyle={styles.content}
      onScroll={(event) => {
        const { contentOffset, contentSize, layoutMeasurement } =
          event.nativeEvent;
        const distance =
          contentSize.height - layoutMeasurement.height - contentOffset.y;
        stickToEnd.current = distance < 80;
        if (contentOffset.y < 40) onLoadOlder?.();
      }}
      scrollEventThrottle={16}
      ListEmptyComponent={
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.empty}
        >
          {loading ? "Loading messages..." : error ? error : emptyHint}
        </ThemedText>
      }
      ListHeaderComponent={
        error && messages.length > 0 ? (
          <ThemedText
            lightColor={APP_SHELL_LABEL_COLOR}
            darkColor={APP_SHELL_LABEL_COLOR}
            style={styles.empty}
          >
            {error}
          </ThemedText>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    flexGrow: 1,
  },
  empty: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 18,
    paddingTop: 12,
  },
  bubbleWrap: {
    maxWidth: "84%",
    gap: 4,
  },
  bubbleOwn: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  bubblePeer: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  author: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 13,
    paddingHorizontal: 4,
  },
  bubble: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ownFill: {
    backgroundColor: APP_SHELL_PRIMARY_BACKGROUND,
  },
  peerFill: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  body: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 16,
  },
});
