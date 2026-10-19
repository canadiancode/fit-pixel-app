import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo } from "react";
import {
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { ActionListSectionDivider } from "@/features/actions/components/action-list-section-divider";
import { useChatSearch } from "@/features/chat/chat-search-context";
import { ChatEmptyState } from "@/features/chat/components/chat-empty-state";
import { ChatListRow } from "@/features/chat/components/chat-list-row";
import { CHAT_CARD_RIM } from "@/features/chat/constants";
import { timeAgo } from "@/features/chat/time-ago";
import { gymHeroSource } from "@/features/map/gym-catalog";
import type { GymListItem } from "@/lib/api/chat";

const DUMBBELL_ICON = require("@/assets/icons/dumbbell.png");
const MAP_ICON = require("@/assets/icons/map.png");
const FAVOURITE_ICON = require("@/assets/icons/favourite.png");
const GYM_THUMB_SIZE = 48;
const STAR_BADGE_SIZE = 18;

type Props = {
  gyms: GymListItem[] | null;
  error: string | null;
  query: string;
  refreshing: boolean;
  onRefresh: () => void;
};

type GymSection = {
  key: "favourites" | "visited" | "more";
  title: string;
  data: GymListItem[];
};

function openGym(gymId: string) {
  router.push({
    pathname: "/(tabs)/chat/gym-chat/[gymId]",
    params: { gymId },
  });
}

function openMap() {
  router.navigate("/(tabs)/map");
}

function memberLabel(count: number): string {
  return `${count} member${count === 1 ? "" : "s"}`;
}

/** Most recently opened first; never-opened rows fall back to name order. */
function byLastVisit(a: GymListItem, b: GymListItem): number {
  return (
    (b.lastVisitedAt ?? "").localeCompare(a.lastVisitedAt ?? "") ||
    a.name.localeCompare(b.name)
  );
}

function byPopularity(a: GymListItem, b: GymListItem): number {
  return b.memberCount - a.memberCount || a.name.localeCompare(b.name);
}

/**
 * Favourites on top, then gyms you've entered before. You enter a gym from the
 * Map or by searching; a search also lists gyms you haven't been to yet.
 */
export function ChatGymsSection({
  gyms,
  error,
  query,
  refreshing,
  onRefresh,
}: Props) {
  const { focusSearch } = useChatSearch();
  const q = query.trim().toLowerCase();

  const sections = useMemo<GymSection[]>(() => {
    const rows = (gyms ?? []).filter(
      (gym) => !q || gym.name.toLowerCase().includes(q),
    );
    const favourites = rows
      .filter((gym) => gym.joined && gym.favorite)
      .sort(byLastVisit);
    const visited = rows
      .filter((gym) => gym.joined && !gym.favorite)
      .sort(byLastVisit);
    const more = q ? rows.filter((gym) => !gym.joined).sort(byPopularity) : [];
    return [
      { key: "favourites" as const, title: "favourites", data: favourites },
      { key: "visited" as const, title: "visited gyms", data: visited },
      { key: "more" as const, title: "more gyms", data: more },
    ].filter((section) => section.data.length > 0);
  }, [gyms, q]);

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
    ) : q ? (
      <ChatEmptyState
        icon={DUMBBELL_ICON}
        title="No gyms found"
        body="Try another name, or browse gyms near you on the Map."
        action={{ label: "Open the map", onPress: openMap }}
      />
    ) : (
      <ChatEmptyState
        icon={DUMBBELL_ICON}
        title="No gyms yet"
        body={
          "Find your gym on the Map or search for it above. " +
          "Gyms you enter and star show up here."
        }
        action={{ label: "Find a gym on the map", onPress: openMap }}
      />
    );

  return (
    <SectionList
      sections={sections}
      keyExtractor={(gym) => gym.id}
      renderItem={({ item }) => <GymRow gym={item} />}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <ActionListSectionDivider label={section.title} />
        </View>
      )}
      ListHeaderComponent={
        error ? (
          <ThemedText
            lightColor={APP_SHELL_LABEL_COLOR}
            darkColor={APP_SHELL_LABEL_COLOR}
            style={styles.hint}
          >
            {error}
          </ThemedText>
        ) : null
      }
      ListEmptyComponent={empty}
      ListFooterComponent={
        sections.length > 0 && !q ? (
          <FindGymFooter onSearch={focusSearch} />
        ) : null
      }
      stickySectionHeadersEnabled={false}
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

function GymRow({ gym }: { gym: GymListItem }) {
  const visited = gym.lastVisitedAt ? timeAgo(gym.lastVisitedAt) : null;
  const subtitle = [
    memberLabel(gym.memberCount),
    visited ? (visited === "now" ? "here now" : `visited ${visited}`) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <ChatListRow
      leading={
        <View>
          <Image
            source={gymHeroSource(gym.imageKey)}
            style={styles.thumb}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
          {gym.favorite ? (
            <Image
              source={FAVOURITE_ICON}
              style={styles.starBadge}
              contentFit="contain"
              accessibilityIgnoresInvertColors
            />
          ) : null}
        </View>
      }
      title={gym.name}
      subtitle={subtitle}
      titleLines={2}
      showChevron
      onPress={() => openGym(gym.id)}
      accessibilityLabel={`${gym.name} chat. ${subtitle}${gym.favorite ? ". Favourite" : ""}`}
    />
  );
}

/** Dashed "find another gym" card under your lists. */
function FindGymFooter({ onSearch }: { onSearch: () => void }) {
  return (
    <View style={styles.footer}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Find another gym on the map"
        onPress={openMap}
        style={({ pressed }) => [styles.findCard, pressed && styles.pressed]}
      >
        <Image
          source={MAP_ICON}
          style={styles.findIcon}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
        <View style={styles.findText}>
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.findTitle}
          >
            Find another gym
          </ThemedText>
          <ThemedText
            lightColor={APP_SHELL_LABEL_COLOR}
            darkColor={APP_SHELL_LABEL_COLOR}
            style={styles.findBody}
          >
            Browse the map to enter a new gym chat
          </ThemedText>
        </View>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.chevron}
        >
          ›
        </ThemedText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search all gyms"
        onPress={onSearch}
        hitSlop={8}
        style={({ pressed }) => [styles.searchLink, pressed && styles.pressed]}
      >
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.searchLinkLabel}
        >
          or search all gyms
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 4,
    paddingBottom: 24,
  },
  sectionHeader: {
    paddingTop: 8,
    paddingBottom: 8,
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
  starBadge: {
    position: "absolute",
    right: -6,
    bottom: -6,
    width: STAR_BADGE_SIZE,
    height: STAR_BADGE_SIZE,
  },
  footer: {
    marginTop: 16,
    gap: 10,
    alignItems: "stretch",
  },
  findCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: CHAT_CARD_RIM,
  },
  findIcon: {
    width: 36,
    height: 36,
  },
  findText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  findTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 16,
  },
  findBody: {
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 12,
  },
  chevron: {
    fontSize: 16,
    lineHeight: 20,
  },
  searchLink: {
    alignSelf: "center",
    paddingVertical: 4,
  },
  searchLinkLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 13,
    textDecorationLine: "underline",
  },
  pressed: {
    opacity: 0.8,
  },
});
