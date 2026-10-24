import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { exerciseName, getExercise, MUSCLE_LABELS } from "@/features/training/exercises";
import {
  Badge,
  BodyText,
  PixelButton,
  PixelText,
  Stepper,
  T,
  tapHaptic,
} from "@/features/training/components/pixel-ui";
import {
  formatClock,
  formatWeight,
  lastSetsFor,
  previousLabel,
  suggestWeight,
  weightStep,
} from "@/features/training/session";
import { useTraining } from "@/features/training/training-context";
import { TRAINING_SYNC_LIMITS } from "@/lib/db/training";

type Rest = { endsAt: number; total: number; notificationId: string | null };

async function scheduleRestEnd(seconds: number, body: string): Promise<string | null> {
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return null;
    return await Notifications.scheduleNotificationAsync({
      content: { title: "Rest's over", body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, Math.round(seconds)) },
    });
  } catch {
    return null;
  }
}

function cancelRestEnd(id: string | null) {
  if (id) void Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

export default function WorkoutScreen() {
  const router = useRouter();
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();
  const { isLoaded, active, history, unit, startWorkout, updateActive, completeSet, finishWorkout, discardWorkout } = useTraining();
  const [now, setNow] = useState(Date.now());
  const [rest, setRest] = useState<Rest | null>(null);
  const [selectedSet, setSelectedSet] = useState<number | null>(null);
  const [xpPop, setXpPop] = useState<{ key: number; amount: number } | null>(null);
  const popAnim = useRef(new Animated.Value(0)).current;
  const startedRef = useRef(false);
  const finishingRef = useRef(false);

  // Start (or resume) the workout once the training store has loaded.
  useEffect(() => {
    if (!isLoaded || startedRef.current) return;
    startedRef.current = true;
    if (!active && workoutId) void startWorkout(workoutId);
  }, [isLoaded, active, workoutId, startWorkout]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  // Rest finished: buzz and clear.
  useEffect(() => {
    if (rest && now >= rest.endsAt) {
      if (process.env.EXPO_OS === "ios") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRest(null);
    }
  }, [now, rest]);

  useEffect(() => () => cancelRestEnd(rest?.notificationId ?? null), [rest?.notificationId]);

  const session = active;
  const exIndex = session ? Math.min(session.current, session.exercises.length - 1) : 0;
  const ex = session?.exercises[exIndex];
  const info = ex ? getExercise(ex.exerciseId) : undefined;
  const load = info?.load ?? "weight";
  const last = useMemo(() => (ex ? lastSetsFor(history, ex.exerciseId) : null), [ex, history]);
  const firstOpen = ex ? ex.sets.findIndex((s) => !s.done) : -1;
  const target = selectedSet != null && ex && selectedSet < ex.sets.length && !ex.sets[selectedSet].done ? selectedSet : firstOpen;
  const allSetsDone = !!ex && firstOpen === -1;
  const workoutDone = !!session && session.exercises.every((e) => e.sets.every((s) => s.done));

  const mutate = updateActive;

  const editSet = useCallback(
    (field: "weight" | "reps", delta: number) => {
      if (!ex || target < 0) return;
      mutate((s) => ({
        ...s,
        exercises: s.exercises.map((e, ei) =>
          ei !== exIndex
            ? e
            : {
                ...e,
                sets: e.sets.map((set, si) => {
                  if (si !== target) return set;
                  if (field === "weight") {
                    const weight = Math.round((set.weight + delta) * 10) / 10;
                    return { ...set, weight: Math.max(0, Math.min(TRAINING_SYNC_LIMITS.weightMax, weight)) };
                  }
                  return { ...set, reps: Math.max(1, Math.min(load === "time" ? 600 : 100, set.reps + delta)) };
                }),
              },
        ),
      }));
    },
    [ex, exIndex, load, mutate, target],
  );

  const goTo = useCallback(
    (index: number) => {
      if (!session) return;
      tapHaptic();
      setSelectedSet(null);
      mutate((s) => ({ ...s, current: Math.max(0, Math.min(s.exercises.length - 1, index)) }));
    },
    [mutate, session],
  );

  const addSet = useCallback(() => {
    if (!ex || ex.sets.length >= TRAINING_SYNC_LIMITS.setsMax) return;
    const lastSet = ex.sets[ex.sets.length - 1];
    mutate((s) => ({
      ...s,
      exercises: s.exercises.map((e, ei) =>
        ei !== exIndex ? e : { ...e, sets: [...e.sets, { weight: lastSet?.weight ?? 0, reps: lastSet?.reps ?? e.repsMax, done: false, completedAt: null }] },
      ),
    }));
  }, [ex, exIndex, mutate]);

  const removeSet = useCallback(() => {
    if (!ex || ex.sets.length <= 1) return;
    const lastIdx = ex.sets.length - 1;
    if (ex.sets[lastIdx].done) return;
    mutate((s) => ({
      ...s,
      exercises: s.exercises.map((e, ei) => (ei !== exIndex ? e : { ...e, sets: e.sets.slice(0, -1) })),
    }));
  }, [ex, exIndex, mutate]);

  const onComplete = useCallback(async () => {
    if (!ex || target < 0) return;
    const setIdx = target;
    setSelectedSet(null);
    const xp = await completeSet(exIndex, setIdx);
    if (process.env.EXPO_OS === "ios") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (xp > 0) {
      setXpPop({ key: Date.now(), amount: xp });
      popAnim.setValue(0);
      Animated.timing(popAnim, { toValue: 1, duration: 1300, useNativeDriver: true }).start();
    }
    // Rest after every set except the very last one of the workout.
    const isLastOfWorkout = session
      ? session.exercises.every((e, ei) => e.sets.every((s, si) => s.done || (ei === exIndex && si === setIdx)))
      : true;
    if (!isLastOfWorkout) {
      const total = ex.restSec;
      const nextSet = ex.sets[setIdx + 1];
      const body = nextSet
        ? `${exerciseName(ex.exerciseId)}: set ${setIdx + 2}${load === "weight" ? ` · ${formatWeight(nextSet.weight)} ${unit} × ${nextSet.reps}` : ""}`
        : "On to the next exercise";
      cancelRestEnd(rest?.notificationId ?? null);
      const notificationId = await scheduleRestEnd(total, body);
      setRest({ endsAt: Date.now() + total * 1000, total, notificationId });
    }
  }, [completeSet, ex, exIndex, load, popAnim, rest?.notificationId, session, target, unit]);

  const skipRest = useCallback(() => {
    cancelRestEnd(rest?.notificationId ?? null);
    setRest(null);
  }, [rest?.notificationId]);

  const adjustRest = useCallback(
    async (delta: number) => {
      if (!rest) return;
      const endsAt = Math.max(Date.now() + 1000, rest.endsAt + delta * 1000);
      cancelRestEnd(rest.notificationId);
      const notificationId = await scheduleRestEnd((endsAt - Date.now()) / 1000, "Time for your next set");
      setRest({ endsAt, total: Math.max(rest.total, (endsAt - Date.now()) / 1000), notificationId });
    },
    [rest],
  );

  const finish = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    skipRest();
    const summary = await finishWorkout();
    finishingRef.current = false;
    if (summary) router.replace("/(tabs)/actions/workout-finish");
  }, [finishWorkout, router, skipRest]);

  const endWorkout = useCallback(() => {
    Alert.alert("End workout?", "Save the sets you've finished, or throw this workout away along with its set XP.", [
      { text: "Keep going", style: "cancel" },
      { text: "Save and finish", onPress: () => void finish() },
      {
        text: "Discard",
        style: "destructive",
        onPress: async () => {
          skipRest();
          await discardWorkout();
          router.back();
        },
      },
    ]);
  }, [discardWorkout, finish, router, skipRest]);

  if (!session || !ex) {
    return (
      <View style={[styles.root, styles.loading]}>
        <PixelText size={10} color={T.muted}>{isLoaded && !workoutId ? "No workout in progress" : "Loading workout…"}</PixelText>
        {isLoaded && !workoutId ? <PixelButton label="Back" variant="blue" size="md" onPress={() => router.back()} /> : null}
      </View>
    );
  }

  const elapsed = (now - Date.parse(session.startedAt)) / 1000;
  const restLeft = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0;
  const exDone = session.exercises.filter((e) => e.sets.every((s) => s.done)).length;
  const suggestion = suggestWeight(last, ex.repsMax, unit);
  const tip =
    load !== "weight"
      ? last
        ? `Last time: ${last.sets.map((s) => (load === "time" ? `${s.reps}s` : s.reps)).join(", ")}${load === "time" ? "" : " reps"}`
        : `Aim for ${ex.repsMin}–${ex.repsMax}${load === "time" ? " seconds" : " clean reps"} a set.`
      : suggestion.bumped
        ? `You hit ${ex.repsMax} on every set last time. Try ${formatWeight(suggestion.weight)} ${unit} (+${weightStep(unit)}).`
        : last
          ? `Last time: ${last.sets.map((s) => `${formatWeight(s.weight)}×${s.reps}`).join(", ")}`
          : `First time: pick a weight you can lift ${ex.repsMax} times with good form.`;
  const next = session.exercises[exIndex + 1];
  const targetSet = target >= 0 ? ex.sets[target] : null;
  const popStyle = {
    opacity: popAnim.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] }),
    transform: [{ translateY: popAnim.interpolate({ inputRange: [0, 1], outputRange: [10, -40] }) }],
  };

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="End workout" onPress={endWorkout} style={styles.endBtn}>
            <PixelText size={8}>END</PixelText>
          </Pressable>
          <View style={styles.topCenter}>
            <PixelText size={11} numberOfLines={1}>{session.workoutName.toUpperCase()}</PixelText>
            <PixelText size={9} color={T.lime}>{formatClock(elapsed)}</PixelText>
          </View>
          <View style={styles.xpBox}>
            <PixelText size={8} color={T.yellow}>{session.xpEarned} XP</PixelText>
          </View>
        </View>
        <PixelText size={7} color="#cfe0ff">EXERCISE {exIndex + 1} OF {session.exercises.length}</PixelText>
        <View style={styles.segRow}>
          {session.exercises.map((e, i) => (
            <View
              key={e.key}
              style={[
                styles.segFill,
                { backgroundColor: e.sets.every((s) => s.done) ? T.lime : i === exIndex ? T.cyan : "#0b1a2e" },
              ]}
            />
          ))}
        </View>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.exHeader}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous exercise" disabled={exIndex === 0} onPress={() => goTo(exIndex - 1)} style={[styles.navBtn, exIndex === 0 && styles.navDisabled]}>
            <PixelText size={12}>‹</PixelText>
          </Pressable>
          <PixelText size={14} style={styles.exName}>{exerciseName(ex.exerciseId).toUpperCase()}</PixelText>
          <Pressable accessibilityRole="button" accessibilityLabel="Next exercise" disabled={!next} onPress={() => goTo(exIndex + 1)} style={[styles.navBtn, !next && styles.navDisabled]}>
            <PixelText size={12}>›</PixelText>
          </Pressable>
        </View>
        <View style={styles.chips}>
          {(info?.muscles ?? []).map((mus) => (
            <View key={mus} style={styles.chip}>
              <BodyText size={11} color="#cfe0ff">{MUSCLE_LABELS[mus]}</BodyText>
            </View>
          ))}
        </View>
        {info?.cue ? <BodyText size={12}>{info.cue}</BodyText> : null}
        <View style={styles.tip}>
          <PixelText size={9} color={T.lime}>↑</PixelText>
          <BodyText size={12} color="#dfffb0" style={styles.flex}>{tip}</BodyText>
        </View>

        <View style={styles.table}>
          <View style={[styles.tr, styles.th]}>
            <PixelText size={6} color={T.muted} style={styles.cSet}>SET</PixelText>
            <PixelText size={6} color={T.muted} style={styles.cPrev}>PREVIOUS</PixelText>
            {load === "weight" ? <PixelText size={6} color={T.muted} style={styles.cW}>{unit.toUpperCase()}</PixelText> : null}
            <PixelText size={6} color={T.muted} style={styles.cR}>{load === "time" ? "SEC" : "REPS"}</PixelText>
            <View style={styles.cChk} />
          </View>
          {ex.sets.map((set, i) => {
            const isTarget = i === target;
            return (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`Set ${i + 1}${set.done ? ", done" : isTarget ? ", up next" : ""}`}
                disabled={set.done}
                onPress={() => {
                  tapHaptic();
                  setSelectedSet(i);
                }}
                style={[styles.tr, set.done ? styles.trDone : isTarget ? styles.trTarget : styles.trIdle]}
              >
                <PixelText size={9} style={styles.cSet}>{i + 1}</PixelText>
                <BodyText size={12} style={styles.cPrev} numberOfLines={1}>{previousLabel(last, i, load)}</BodyText>
                {load === "weight" ? <PixelText size={10} style={styles.cW}>{formatWeight(set.weight)}</PixelText> : null}
                <PixelText size={10} style={styles.cR}>{set.reps}</PixelText>
                <View style={styles.cChk}>
                  <View style={[styles.checkBox, set.done && styles.checkBoxDone]}>
                    {set.done ? <PixelText size={8} color={T.black}>✓</PixelText> : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
          <View style={styles.setActions}>
            {ex.sets.length < TRAINING_SYNC_LIMITS.setsMax ? (
              <Pressable accessibilityRole="button" onPress={addSet} hitSlop={8}>
                <PixelText size={7} color={T.cyan}>+ ADD SET</PixelText>
              </Pressable>
            ) : null}
            {ex.sets.length > 1 && !ex.sets[ex.sets.length - 1].done ? (
              <Pressable accessibilityRole="button" onPress={removeSet} hitSlop={8}>
                <PixelText size={7} color={T.muted}>− REMOVE SET</PixelText>
              </Pressable>
            ) : null}
          </View>
          {xpPop ? (
            <Animated.View key={xpPop.key} pointerEvents="none" style={[styles.xpPop, popStyle]}>
              <PixelText size={12} color={T.lime} style={styles.xpPopText}>+{xpPop.amount} XP</PixelText>
            </Animated.View>
          ) : null}
        </View>

        {targetSet ? (
          <View style={styles.steppers}>
            {load === "weight" ? (
              <Stepper
                label={`WEIGHT (${unit.toUpperCase()})`}
                value={formatWeight(targetSet.weight)}
                onDecrease={() => editSet("weight", -weightStep(unit))}
                onIncrease={() => editSet("weight", weightStep(unit))}
                decreaseLabel={`Weight down ${weightStep(unit)} ${unit}`}
                increaseLabel={`Weight up ${weightStep(unit)} ${unit}`}
              />
            ) : null}
            <Stepper
              label={load === "time" ? "SECONDS" : "REPS"}
              value={String(targetSet.reps)}
              onDecrease={() => editSet("reps", load === "time" ? -5 : -1)}
              onIncrease={() => editSet("reps", load === "time" ? 5 : 1)}
              decreaseLabel={load === "time" ? "Five seconds less" : "One fewer rep"}
              increaseLabel={load === "time" ? "Five seconds more" : "One more rep"}
            />
          </View>
        ) : null}

        <View style={styles.next}>
          <View style={styles.flex}>
            <PixelText size={6} color={T.muted}>{next ? "UP NEXT" : "LAST EXERCISE"}</PixelText>
            <BodyText size={13} color={T.text} numberOfLines={1}>
              {next ? `${exerciseName(next.exerciseId)} · ${next.sets.length}×${next.repsMin === next.repsMax ? next.repsMin : `${next.repsMin}–${next.repsMax}`}` : "Finish strong"}
            </BodyText>
          </View>
          <Badge label={`${exDone}/${session.exercises.length} DONE`} color={T.cyan} />
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        {rest ? (
          <View style={styles.restCard}>
            <View style={styles.restRow}>
              <View style={styles.restClock}>
                <PixelText size={8} color={T.cyan}>REST</PixelText>
                <PixelText size={20}>{formatClock(restLeft)}</PixelText>
              </View>
              <View style={styles.restBtns}>
                <PixelButton label="-15S" variant="blue" size="sm" onPress={() => void adjustRest(-15)} style={styles.restBtn} />
                <PixelButton label="+15S" variant="blue" size="sm" onPress={() => void adjustRest(15)} style={styles.restBtn} />
                <PixelButton label="SKIP" variant="yellow" size="sm" onPress={skipRest} style={styles.restBtn} />
              </View>
            </View>
            <View style={styles.restBar}>
              <View style={[styles.restFill, { width: `${Math.round((restLeft / Math.max(1, rest.total)) * 100)}%` }]} />
            </View>
          </View>
        ) : null}
        {workoutDone ? (
          <PixelButton label="FINISH WORKOUT" variant="yellow" onPress={() => void finish()} />
        ) : allSetsDone ? (
          <PixelButton label="NEXT EXERCISE" variant="cyan" onPress={() => goTo(session.exercises.findIndex((e, i) => i > exIndex && e.sets.some((s) => !s.done)) >= 0 ? session.exercises.findIndex((e, i) => i > exIndex && e.sets.some((s) => !s.done)) : session.exercises.findIndex((e) => e.sets.some((s) => !s.done)))} />
        ) : !rest ? (
          <PixelButton label={`COMPLETE SET ${target + 1}`} onPress={() => void onComplete()} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.navy },
  loading: { alignItems: "center", justifyContent: "center", gap: 16 },
  flex: { flex: 1, minWidth: 0 },
  top: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, gap: 8, backgroundColor: "#03418c" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  endBtn: { minWidth: 60, height: 40, borderRadius: 8, borderWidth: 3, borderColor: "#0a2e63", backgroundColor: "#0b3f86", alignItems: "center", justifyContent: "center" },
  topCenter: { flex: 1, alignItems: "center", gap: 4 },
  xpBox: { minWidth: 60, alignItems: "flex-end" },
  segRow: { flexDirection: "row", gap: 4 },
  segFill: { flex: 1, height: 8, borderWidth: 2, borderColor: T.black },
  body: { padding: 14, gap: 12, paddingBottom: 24 },
  exHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  exName: { flex: 1, lineHeight: 22, textShadowColor: T.black, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 },
  navBtn: { width: 40, height: 40, borderRadius: 8, borderWidth: 3, borderColor: T.border, backgroundColor: "#0b3f86", alignItems: "center", justifyContent: "center" },
  navDisabled: { opacity: 0.3 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderWidth: 2, borderColor: T.border, backgroundColor: T.card, paddingHorizontal: 6, paddingVertical: 1 },
  tip: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#2a3a05", borderWidth: 2, borderColor: T.lime, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  table: { backgroundColor: T.card, borderWidth: 3, borderColor: T.border, borderRadius: 12, overflow: "hidden" },
  tr: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, minHeight: 46, borderTopWidth: 2, borderTopColor: "#0d3a75" },
  th: { minHeight: 30, backgroundColor: T.deep, borderTopWidth: 0 },
  trDone: { backgroundColor: T.limeDark },
  trTarget: { backgroundColor: T.cardActive, borderWidth: 3, borderColor: T.cyan },
  trIdle: { opacity: 0.65 },
  cSet: { width: 34 },
  cPrev: { flex: 1 },
  cW: { width: 64 },
  cR: { width: 48 },
  cChk: { width: 34, alignItems: "center" },
  checkBox: { width: 26, height: 26, borderWidth: 3, borderColor: T.black, backgroundColor: "#0b1a2e", alignItems: "center", justifyContent: "center" },
  checkBoxDone: { backgroundColor: T.lime },
  setActions: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 2, borderTopColor: "#0d3a75" },
  xpPop: { position: "absolute", right: 14, top: 36 },
  xpPopText: { textShadowColor: T.black, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 },
  steppers: { flexDirection: "row", gap: 10 },
  next: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: T.deep, borderWidth: 2, borderStyle: "dashed", borderColor: T.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  bottom: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14, gap: 10, backgroundColor: T.navy },
  restCard: { backgroundColor: T.cardActive, borderWidth: 4, borderColor: T.cyan, borderRadius: 12, padding: 10, gap: 8 },
  restRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  restClock: { flexDirection: "row", alignItems: "baseline", gap: 10 },
  restBtns: { flexDirection: "row", gap: 6 },
  restBtn: { paddingHorizontal: 8 },
  restBar: { height: 10, backgroundColor: T.deep, borderWidth: 2, borderColor: T.black, overflow: "hidden" },
  restFill: { height: "100%", backgroundColor: T.cyan },
});
