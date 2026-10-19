import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { ActionListSectionDivider } from "@/features/actions/components/action-list-section-divider";
import { ChatEmptyState } from "@/features/chat/components/chat-empty-state";
import { ChatListRow } from "@/features/chat/components/chat-list-row";
import { gymHeroSource } from "@/features/map/gym-catalog";
import type { GymListItem } from "@/lib/api/chat";

const DUMBBELL_ICON = require("@/assets/icons/dumbbell.png");
const GYM_THUMB_SIZE = 48;

type Props = {
  gyms: GymListItem[] | null;
  error: string | null;
  query: string;
  refreshing: boolean;
  onRefresh: () => void;
};

function openGym(gymId: string) {
  router.push({
    pathname: "/(tabs)/chat/gym-chat/[gymId]",
    params: { gymId },
  });
}

function memberLabel(count: number): string {
  return `${count} member${count === 1 ? "" : "s"}`;
}

function byPopularity(a: GymListItem, b: GymListItem): number {
  return b.memberCount - a.memberCount || a.name.localeCompare(b.name);
}

/** Every gym has an open chat; the ones you've joined are pinned on top. */
export function ChatGymsSection({
  gyms,
  error,
  query,
  refreshing,
  onRefresh,
}: Props) {
  const q = query.trim().toLowerCase();

  const { joined, others } = useMemo(() => {
    const rows = (gyms ?? []).filter(
      (gym) => !q || gym.name.toLowerCase().includes(q),
    );
    return {
      joined: rows.filter((gym) => gym.joined).sort(byPopularity),
      others: rows.filter((gym) => !gym.joined).sort(byPopularity),
    };
  }, [gyms, q]);

  const header = (
    <View style={styles.header}>
      {error ? (
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.hint}
        >
          {error}
        </ThemedText>
      ) : null}
      {joined.length > 0 ? (
        <>
          <ActionListSectionDivider label="your gyms" />
          {joined.map((gym) => (
            <GymRow key={gym.id} gym={gym} joined />
          ))}
        </>
      ) : null}
      {others.length > 0 ? (
        <ActionListSectionDivider label={q ? "results" : "all gyms"} />
      ) : null}
    </View>
  );

  const empty =
    gyms == null ? (
      error ? null : (
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.hint}
        >
          Loading gym chats...
        </ThemedText>
      )
    ) : joined.length === 0 ? (
      <ChatEmptyState
        icon={DUMBBELL_ICON}
        title={q ? "No gyms found" : "No gym chats yet"}
        body={
          q
            ? "Try another name, or find gyms near you on the Map."
            : "Gym chats will show up here once gyms are added."
        }
      />
    ) : null;

  return (
    <FlatList
      data={others}
      keyExtractor={(gym) => gym.id}
      renderItem={({ item }) => <GymRow gym={item} />}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={RowGap}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      initialNumToRender={12}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={APP_SHELL_MAIN_TEXT_COLOR}
        />
      }
    />
  );
}

function RowGap() {
  return <View style={styles.rowGap} />;
}

function GymRow({
  gym,
  joined = false,
}: {
  gym: GymListItem;
  joined?: boolean;
}) {
  return (
    <ChatListRow
      leading={
        <Image
          source={gymHeroSource(gym.imageKey)}
          style={styles.thumb}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
      }
      title={gym.name}
      subtitle={memberLabel(gym.memberCount)}
      titleLines={2}
      showChevron
      onPress={() => openGym(gym.id)}
      accessibilityLabel={`${gym.name} chat. ${memberLabel(gym.memberCount)}${joined ? ", joined" : ""}`}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 4,
    paddingBottom: 24,
  },
  header: {
    gap: 8,
    marginBottom: 8,
  },
  rowGap: {
    height: 8,
  },
  hint: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 16,
    paddingVertical: 8,
  },
  thumb: {
    width: GYM_THUMB_SIZE,
    height: GYM_THUMB_SIZE,
    borderRadius: 8,
  },
});
