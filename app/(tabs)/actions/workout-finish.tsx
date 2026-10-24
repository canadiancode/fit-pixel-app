import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";

import { PixelCharacter } from "@/features/pixel/components/pixel-character";
import { usePixelLoadout } from "@/features/pixel/pixel-loadout-context";
import { usePrefsProfile } from "@/features/settings/prefs-profile-context";
import { exerciseName } from "@/features/training/exercises";
import { BodyText, PixelButton, PixelCard, PixelText, T } from "@/features/training/components/pixel-ui";
import { formatClock, formatWeight } from "@/features/training/session";
import { useTraining } from "@/features/training/training-context";
import { listJoinedGymChats, sendGymMessage } from "@/lib/api/chat";

const STAR = require("@/assets/icons/star.png");
const DUMBBELL = require("@/assets/icons/dumbbell.png");

function compact(n: number): string {
  return n >= 10_000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString("en-US");
}

export default function WorkoutFinishScreen() {
  const router = useRouter();
  const { lastSummary, plan, history, unit } = useTraining();
  const { loadout } = usePixelLoadout();
  const { profile } = usePrefsProfile();
  const [sharing, setSharing] = useState(false);

  const week = useMemo(() => {
    if (!plan) return null;
    const planned = plan.workouts.reduce((n, w) => n + w.weekdays.length, 0);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const done = history.filter((s) => {
      const [y, m, d] = s.dayKey.split("-").map(Number);
      return new Date(y, m - 1, d).getTime() >= start.getTime();
    }).length;
    return { planned, done: Math.min(done, Math.max(planned, done)) };
  }, [history, plan]);

  if (!lastSummary) {
    return (
      <View style={[styles.root, styles.center]}>
        <PixelText size={10} color={T.muted}>No finished workout to show.</PixelText>
        <PixelButton label="DONE" variant="blue" size="md" onPress={() => router.back()} />
      </View>
    );
  }

  const s = lastSummary;
  const minutes = Math.round(s.durationSec / 60);
  const prLine = s.records[0]
    ? ` New PR: ${exerciseName(s.records[0].exerciseId)} ${s.records[0].weight > 0 ? `${formatWeight(s.records[0].weight)} ${unit} × ` : ""}${s.records[0].reps}!`
    : "";
  const shareText = `Just finished ${s.session.workoutName}: ${s.setsDone} sets in ${minutes} min.${prLine}`;

  const share = async () => {
    setSharing(true);
    try {
      const chats = await listJoinedGymChats();
      const target = chats.find((c) => c.gymId === profile.homeGymId) ?? chats[0];
      if (!target) {
        Alert.alert("Join a gym chat first", "Find your gym on the map and join its chat, then you can share workouts there.", [
          { text: "Not now", style: "cancel" },
          { text: "Open Chat", onPress: () => router.push("/(tabs)/chat") },
        ]);
        return;
      }
      Alert.alert(`Post to ${target.name}?`, shareText, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Post",
          onPress: async () => {
            try {
              await sendGymMessage(target.gymId, shareText);
              Alert.alert("Posted!", `Your workout is in the ${target.name} lobby.`);
            } catch (err) {
              Alert.alert("Couldn't post", err instanceof Error ? err.message : "Try again in a moment.");
            }
          },
        },
      ]);
    } catch {
      Alert.alert("Couldn't reach chat", "Check your connection and try again.");
    } finally {
      setSharing(false);
    }
  };

  const stats = [
    { label: "TIME", value: formatClock(s.durationSec), color: T.text },
    { label: "VOLUME", value: `${compact(s.volume)}`, color: T.text },
    { label: "SETS", value: String(s.setsDone), color: T.text },
    { label: "XP", value: `+${s.session.xpEarned}`, color: T.lime },
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.body}>
      <PixelText size={18} color={T.yellow} style={styles.title}>{"WORKOUT\nCOMPLETE!"}</PixelText>
      <View style={styles.hero}>
        <PixelCharacter loadout={loadout} style={StyleSheet.absoluteFill} accessibilityLabel="Your Pixel" />
      </View>

      <View style={styles.stats}>
        {stats.map((st) => (
          <View key={st.label} style={styles.stat}>
            <PixelText size={6} color={T.muted}>{st.label}</PixelText>
            <PixelText size={10} color={st.color} numberOfLines={1}>{st.value}</PixelText>
          </View>
        ))}
      </View>
      <BodyText size={11} style={styles.centerText}>Volume = weight × reps, in {unit}</BodyText>

      <View style={styles.section}>
        <View style={styles.lootHeader}>
          <Image source={STAR} style={styles.icon} contentFit="contain" />
          <PixelText size={10} color={T.yellow}>LOOT DROP</PixelText>
        </View>
        {s.records.length > 0 ? (
          s.records.map((r) => (
            <View key={`${r.exerciseId}-${r.kind}`} style={styles.loot}>
              <View style={styles.lootTag}>
                <PixelText size={6} color={T.black}>{r.kind === "weight" ? "NEW PR" : "REP PR"}</PixelText>
              </View>
              <View style={styles.flex}>
                <BodyText size={13} color={T.text}>{exerciseName(r.exerciseId)}</BodyText>
                <PixelText size={8} color="#ffe57a">
                  {r.weight > 0 ? `${formatWeight(r.weight)} ${unit.toUpperCase()} × ${r.reps}` : `${r.reps} REPS`}
                  {r.previous && r.kind === "weight" ? `  (+${formatWeight(r.weight - r.previous.weight)} ${unit.toUpperCase()})` : ""}
                </PixelText>
              </View>
            </View>
          ))
        ) : (
          <BodyText>No new records this time. Every set still counts: XP banked.</BodyText>
        )}
      </View>

      <PixelCard>
        {week && week.planned > 0 ? (
          <>
            <View style={styles.rowBetween}>
              <PixelText size={8}>THIS WEEK · {plan?.name.toUpperCase()}</PixelText>
              <PixelText size={8} color={T.lime}>{week.done} / {week.planned}</PixelText>
            </View>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${Math.min(100, Math.round((week.done / week.planned) * 100))}%` }]} />
            </View>
          </>
        ) : null}
        <View style={styles.lootHeader}>
          <Image source={DUMBBELL} style={styles.icon} contentFit="contain" />
          <BodyText size={12} style={styles.flex}>
            {minutes > 0 ? `Added ${minutes} min to today's Train goal.` : "Short one! Under a minute isn't added to your Train goal."}
          </BodyText>
        </View>
      </PixelCard>

      <PixelButton label="SHARE TO GYM LOBBY" disabled={sharing} onPress={() => void share()} />
      <PixelButton label="DONE" variant="blue" size="md" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.navy },
  center: { alignItems: "center", justifyContent: "center", gap: 16 },
  body: { padding: 16, gap: 14, paddingBottom: 32 },
  flex: { flex: 1, minWidth: 0, gap: 4 },
  title: { textAlign: "center", lineHeight: 30, textShadowColor: T.black, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 },
  hero: { height: 190, borderRadius: 14, overflow: "hidden", borderWidth: 3, borderColor: T.yellow, backgroundColor: T.deep },
  stats: { flexDirection: "row", gap: 6 },
  stat: { flex: 1, backgroundColor: T.card, borderWidth: 3, borderColor: T.border, borderRadius: 10, paddingVertical: 10, alignItems: "center", gap: 8 },
  centerText: { textAlign: "center", marginTop: -6 },
  section: { gap: 8 },
  lootHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  icon: { width: 18, height: 18 },
  loot: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#2a1f04", borderWidth: 3, borderColor: T.yellow, borderRadius: 10, padding: 10 },
  lootTag: { backgroundColor: T.yellow, paddingHorizontal: 5, paddingVertical: 4 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  bar: { height: 12, backgroundColor: "#0b1a2e", borderWidth: 2, borderColor: T.black, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: T.lime },
});
