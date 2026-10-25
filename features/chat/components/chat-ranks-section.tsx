import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import {
  PixelFrameBackdrop,
  PixelPanel,
  PixelPressablePanel,
} from "@/components/pixel-panel";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
  APP_SHELL_PRIMARY_BACKGROUND,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { useAuth } from "@/features/auth/auth-context";
import { ChatEmptyState } from "@/features/chat/components/chat-empty-state";
import { CHAT_CARD_FILL, CHAT_CARD_RIM_ACTIVE } from "@/features/chat/constants";
import { PixelFigure } from "@/features/pixel/components/pixel-character";
import { DEFAULT_PIXEL_LOADOUT } from "@/features/pixel/default-loadout";
import {
  figureFrameForCrop,
  type FigureCrop,
} from "@/features/pixel/figure-geometry";
import type { PixelLoadout } from "@/features/pixel/types";
import {
  FitPixelApiError,
  listLeaderboard,
  type EquippedLook,
  type LeaderboardBoard,
  type LeaderboardEntry,
} from "@/lib/api/chat";

const CELL_HEADING_FONT_FAMILY = "PixeloidSans";
const TROPHY_ICON = require("@/assets/icons/star.png");

/** Head to mid-chest, centred on the character canvas (figure pixels). */
const CHEST_UP_CROP: FigureCrop = { x: 35, y: 0, size: 260 };

const MEDALS = {
  1: { color: "#FFD23F", dark: "#7A5A00", label: "1ST" },
  2: { color: "#D7E1EC", dark: "#4B5A6B", label: "2ND" },
  3: { color: "#E59A5B", dark: "#6B3A12", label: "3RD" },
} as const;

const BOARDS: readonly { id: LeaderboardBoard; label: string }[] = [
  { id: "friends", label: "Friends" },
  { id: "global", label: "Global" },
];

function openPixel(userId: string) {
  router.push({
    pathname: "/(tabs)/chat/pixel/[userId]",
    params: { userId },
  });
}

function lookOf(equipped: EquippedLook): PixelLoadout {
  return Object.keys(equipped).length > 0
    ? (equipped as PixelLoadout)
    : DEFAULT_PIXEL_LOADOUT;
}

type Props = {
  query: string;
  onFindFriends: () => void;
};

/**
 * Leaderboard by lifetime XP: Friends or Global. The top three stand on a
 * podium; everyone else is a ranked row. Your row is always shown (pinned
 * at the bottom when you're outside the top 50).
 */
export function ChatRanksSection({ query, onFindFriends }: Props) {
  const { session } = useAuth();
  const [board, setBoard] = useState<LeaderboardBoard>("friends");
  const [entries, setEntries] = useState<
    Partial<Record<LeaderboardBoard, LeaderboardEntry[]>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (which: LeaderboardBoard) => {
      if (!session?.access_token) return;
      try {
        const rows = await listLeaderboard(which);
        setEntries((prev) => ({ ...prev, [which]: rows }));
        setError(null);
      } catch (err) {
        setError(
          err instanceof FitPixelApiError && err.status === 404
            ? "Leaderboards are almost here. Check back soon."
            : err instanceof FitPixelApiError
              ? err.message
              : "Could not load the leaderboard.",
        );
      }
    },
    [session?.access_token],
  );

  useFocusEffect(
    useCallback(() => {
      void load(board);
    }, [load, board]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load(board).finally(() => setRefreshing(false));
  }, [load, board]);

  const rows = entries[board];
  const q = query.trim().toLowerCase();
  const { podium, rest, pinnedMe } = useMemo(() => {
    const all = rows ?? [];
    const filtered = q
      ? all.filter((entry) => entry.displayName.toLowerCase().includes(q))
      : all;
    // The server appends your row after the top 50 when you're below it.
    const top = filtered.filter((entry) => entry.rank <= 50);
    const me = filtered.find((entry) => entry.isMe && entry.rank > 50) ?? null;
    // Rows arrive sorted by rank; ties past three spill into the list.
    const podiumCount = q
      ? 0
      : Math.min(3, top.filter((entry) => entry.rank <= 3).length);
    return {
      podium: top.slice(0, podiumCount),
      rest: top.slice(podiumCount),
      pinnedMe: me,
    };
  }, [rows, q]);

  const onlyMe = rows != null && rows.length <= 1 && board === "friends";

  return (
    <View style={styles.root}>
      <PixelPanel frame="well" style={styles.boardTrack} accessibilityRole="tablist">
        {BOARDS.map((option) => {
          const selected = option.id === board;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option.label} leaderboard`}
              onPress={() => {
                if (selected) return;
                void Haptics.selectionAsync();
                setBoard(option.id);
              }}
              style={styles.boardTab}
            >
              {selected ? <PixelFrameBackdrop frame="button" /> : null}
              <Text style={[styles.boardLabel, selected && styles.boardLabelSelected]}>
                {option.label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </PixelPanel>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={APP_SHELL_MAIN_TEXT_COLOR}
          />
        }
      >
        {rows == null ? (
          error != null ? (
            <Text style={styles.hint}>{error}</Text>
          ) : (
            <Text style={styles.hint}>Loading ranks...</Text>
          )
        ) : (
          <>
            {podium.length > 0 ? <Podium entries={podium} /> : null}
            {rest.map((entry) => (
              <RankRow key={entry.userId} entry={entry} />
            ))}
            {pinnedMe != null ? (
              <>
                <Text style={styles.gap}>• • •</Text>
                <RankRow entry={pinnedMe} />
              </>
            ) : null}
            {q && podium.length === 0 && rest.length === 0 ? (
              <Text style={styles.hint}>No one on this board matches that name.</Text>
            ) : null}
            {onlyMe && !q ? (
              <ChatEmptyState
                icon={TROPHY_ICON}
                title="Compete with friends"
                body="Add friends to see who's leveling up fastest. Or check the Global board."
                action={{ label: "Find Pixels", onPress: onFindFriends }}
              />
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** Top three: 2nd and 3rd flank a taller 1st place. */
function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  const byPlace = [entries[1], entries[0], entries[2]];
  return (
    <View style={styles.podium}>
      {byPlace.map((entry, i) =>
        entry != null ? (
          <PodiumSpot key={entry.userId} entry={entry} tall={i === 1} />
        ) : (
          <View key={`empty-${i}`} style={styles.podiumSpot} />
        ),
      )}
    </View>
  );
}

function PodiumSpot({ entry, tall }: { entry: LeaderboardEntry; tall: boolean }) {
  const medal = MEDALS[Math.min(3, Math.max(1, entry.rank)) as 1 | 2 | 3];
  const size = tall ? 96 : 76;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Rank ${entry.rank}, ${entry.displayName || "Pixel"}, level ${entry.level}${entry.isMe ? ", you" : ""}`}
      onPress={() => openPixel(entry.userId)}
      style={({ pressed }) => [styles.podiumSpot, pressed && styles.pressed]}
    >
      {tall ? <PixelCrown /> : null}
      <PixelPortrait
        equipped={entry.equipped}
        size={size}
        rim={medal.color}
        style={entry.isMe ? styles.meGlow : undefined}
      />
      <View style={[styles.medal, { backgroundColor: medal.color, borderColor: medal.dark }]}>
        <Text style={[styles.medalText, { color: medal.dark }]}>{medal.label}</Text>
      </View>
      <Text numberOfLines={1} style={styles.podiumName}>
        {entry.isMe ? "You" : entry.displayName || "Pixel"}
      </Text>
      <LevelChip level={entry.level} />
      <View
        style={[
          styles.step,
          { height: tall ? 34 : 20, borderColor: medal.color },
        ]}
      />
    </Pressable>
  );
}

function RankRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <PixelPressablePanel
      frame={entry.isMe ? "green" : "blue"}
      accessibilityRole="button"
      accessibilityLabel={`Rank ${entry.rank}, ${entry.displayName || "Pixel"}, level ${entry.level}, ${entry.lifetimeXp} XP${entry.isMe ? ", you" : ""}`}
      onPress={() => openPixel(entry.userId)}
      style={styles.row}
    >
      <Text style={styles.rank}>{entry.rank}</Text>
      <PixelPortrait equipped={entry.equipped} size={52} rim={CHAT_CARD_RIM_ACTIVE} />
      <View style={styles.rowText}>
        <Text numberOfLines={1} style={styles.rowName}>
          {entry.displayName || "Pixel"}
          {entry.isMe ? <Text style={styles.youTag}>  YOU</Text> : null}
        </Text>
        <Text style={styles.rowXp}>{entry.lifetimeXp.toLocaleString("en-US")} XP</Text>
      </View>
      <LevelChip level={entry.level} />
    </PixelPressablePanel>
  );
}

/** Head-and-chest crop of a Pixel in a square, medal-coloured pixel frame. */
function PixelPortrait({
  equipped,
  size,
  rim,
  style,
}: {
  equipped: EquippedLook;
  size: number;
  rim: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.portrait,
        { width: size, height: size, borderColor: rim },
        style,
      ]}
    >
      <View style={styles.portraitSky} />
      <PixelFigure
        loadout={lookOf(equipped)}
        style={[styles.portraitFigure, figureFrameForCrop(CHEST_UP_CROP, size - 6)]}
      />
    </View>
  );
}

function LevelChip({ level }: { level: number }) {
  return (
    <View style={styles.levelChip}>
      <Text style={styles.levelSmall}>LV</Text>
      <Text style={styles.levelValue}>{level}</Text>
    </View>
  );
}

const CROWN = ["x.x.x", "xxxxx", "xyxyx", "xxxxx"] as const;

function PixelCrown() {
  const px = 4;
  return (
    <View style={[styles.crown, { width: px * 5, height: px * 4 }]}>
      {CROWN.map((row, y) =>
        Array.from(row).map((cell, x) =>
          cell === "." ? null : (
            <View
              key={`${x}-${y}`}
              style={{
                position: "absolute",
                left: x * px,
                top: y * px,
                width: px + 0.5,
                height: px + 0.5,
                backgroundColor: cell === "y" ? "#E8412C" : "#FFD23F",
              }}
            />
          ),
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  boardTrack: {
    flexDirection: "row",
    alignSelf: "center",
    marginTop: 4,
    marginBottom: 6,
    padding: 6,
  },
  boardTab: {
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  boardLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 12,
    color: APP_SHELL_LABEL_COLOR,
  },
  boardLabelSelected: {
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 8,
  },
  hint: {
    fontFamily: CELL_HEADING_FONT_FAMILY,
    fontSize: 14,
    color: APP_SHELL_LABEL_COLOR,
    textAlign: "center",
    marginTop: 24,
  },
  gap: {
    color: APP_SHELL_LABEL_COLOR,
    textAlign: "center",
    letterSpacing: 4,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  podium: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 10,
    paddingTop: 18,
    paddingBottom: 6,
  },
  podiumSpot: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  crown: {
    marginBottom: -2,
  },
  medal: {
    marginTop: -16,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 2,
  },
  medalText: {
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 10,
  },
  podiumName: {
    fontFamily: CELL_HEADING_FONT_FAMILY,
    fontSize: 14,
    color: APP_SHELL_MAIN_TEXT_COLOR,
    maxWidth: "100%",
  },
  step: {
    alignSelf: "stretch",
    borderWidth: 4,
    borderBottomWidth: 0,
    backgroundColor: CHAT_CARD_FILL,
  },
  meGlow: {
    shadowColor: "#7CFFB2",
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  rank: {
    width: 28,
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 14,
    color: APP_SHELL_LABEL_COLOR,
    textAlign: "center",
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  rowName: {
    fontFamily: CELL_HEADING_FONT_FAMILY,
    fontSize: 16,
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
  youTag: {
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    color: "#7CFFB2",
  },
  rowXp: {
    fontFamily: CELL_HEADING_FONT_FAMILY,
    fontSize: 12,
    color: APP_SHELL_LABEL_COLOR,
  },
  portrait: {
    borderWidth: 3,
    overflow: "hidden",
    backgroundColor: APP_SHELL_PRIMARY_BACKGROUND,
  },
  portraitSky: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0A5BB0",
    opacity: 0.55,
  },
  portraitFigure: {
    position: "absolute",
  },
  levelChip: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: "#FFD23F",
    borderWidth: 2,
    borderColor: "#000a1c",
  },
  levelSmall: {
    fontFamily: FONT_FAMILY,
    fontSize: 7,
    lineHeight: 9,
    color: "#02284f",
  },
  levelValue: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 13,
    color: "#02284f",
  },
});
