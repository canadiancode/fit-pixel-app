import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { exerciseName } from "../exercises";
import {
  blankPlan,
  formatScheme,
  WEEKDAY_LETTER,
  WEEKDAY_SHORT,
  weekdayOf,
  workoutForWeekday,
} from "../programs";
import { setsDone, setsTotal } from "../session";
import { useTraining } from "../training-context";
import type { PlanWorkout, TrainingPlan, Weekday, WorkoutSession } from "../types";
import { XP_PER_WORKOUT_SET, XP_WORKOUT_COMPLETE } from "@/lib/db/xp";

import { Badge, BG, BodyText, PixelBackdrop, PixelButton, PixelCard, PixelNavRow, PixelText, T, tapHaptic } from "./pixel-ui";

const DUMBBELL = require("@/assets/icons/dumbbell.png");
const MOON = require("@/assets/icons/purple-moon.png");

function dayKeyToDate(dayKey: string): Date {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Monday 00:00 of the week containing `date`. */
function weekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - weekdayOf(d));
  return d;
}

export function estimateMinutes(w: PlanWorkout): number {
  const sec = w.exercises.reduce((t, e) => t + e.sets * (e.restSec + 45), 0);
  return Math.max(5, Math.round(sec / 60 / 5) * 5);
}

function weekNumber(plan: TrainingPlan, now: Date): number {
  const start = weekStart(new Date(plan.createdAt));
  return Math.max(1, Math.floor((weekStart(now).getTime() - start.getTime()) / (7 * 86_400_000)) + 1);
}

/** Top of the Train screen: the plan's week, today's workout and Start. */
export function TrainPlanSection() {
  const router = useRouter();
  const { isLoaded, plan, active, history, savePlan, discardWorkout } = useTraining();
  const today = new Date();
  const todayWd = weekdayOf(today);
  const [selected, setSelected] = useState<Weekday>(todayWd);

  const doneThisWeek = useMemo(() => {
    const start = weekStart(today).getTime();
    const map = new Map<Weekday, WorkoutSession>();
    for (const s of history) {
      const d = dayKeyToDate(s.dayKey);
      if (d.getTime() >= start && d.getTime() < start + 7 * 86_400_000) map.set(weekdayOf(d), s);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  if (!isLoaded) return null;

  if (active) {
    const done = setsDone(active);
    const total = setsTotal(active);
    return (
      <PixelCard>
        <View style={styles.rowBetween}>
          <Badge label="IN PROGRESS" color={T.lime} />
          <PixelText size={8} color={T.lime}>+{active.xpEarned} XP</PixelText>
        </View>
        <PixelText size={16}>{active.workoutName.toUpperCase()}</PixelText>
        <BodyText>{done} of {total} sets done</BodyText>
        <PixelButton label="RESUME WORKOUT" onPress={() => router.push("/(tabs)/actions/workout")} />
        <PixelButton
          label="Discard workout"
          variant="blue"
          size="sm"
          onPress={() =>
            Alert.alert("Discard this workout?", "Sets you finished won't be saved to your history.", [
              { text: "Keep going", style: "cancel" },
              { text: "Discard", style: "destructive", onPress: () => void discardWorkout() },
            ])
          }
        />
      </PixelCard>
    );
  }

  if (!plan) {
    return (
      <PixelCard>
        <View style={styles.promoRow}>
          <Image source={DUMBBELL} style={styles.promoIcon} contentFit="contain" />
          <View style={styles.flex}>
            <PixelText size={11}>Get a workout plan</PixelText>
            <BodyText>Answer 6 quick questions and get a weekly plan built for your goal. Every set you finish earns XP.</BodyText>
          </View>
        </View>
        <PixelButton label="TAKE THE QUIZ" onPress={() => router.push("/(tabs)/actions/train-quest")} />
        <PixelButton
          label="Build my own routine"
          variant="blue"
          size="md"
          onPress={async () => {
            await savePlan(blankPlan());
            router.push("/(tabs)/actions/train-plan");
          }}
        />
      </PixelCard>
    );
  }

  const workout = workoutForWeekday(plan, selected);
  const isToday = selected === todayWd;
  const doneSession = doneThisWeek.get(selected);
  const nextPlanned = (() => {
    for (let i = 1; i <= 7; i++) {
      const wd = ((selected + i) % 7) as Weekday;
      const w = workoutForWeekday(plan, wd);
      if (w) return { wd, w };
    }
    return null;
  })();

  return (
    <View style={styles.wrap}>
      <View style={styles.rowBetween}>
        <PixelText size={8} color={T.muted}>
          {plan.weeks ? `WEEK ${Math.min(weekNumber(plan, today), plan.weeks)} OF ${plan.weeks}` : "THIS WEEK"}
        </PixelText>
        <Pressable accessibilityRole="button" accessibilityLabel="Open my plan" hitSlop={10} onPress={() => router.push("/(tabs)/actions/train-plan")}>
          <PixelText size={8} color={T.cyan}>{plan.name.toUpperCase()} ›</PixelText>
        </Pressable>
      </View>

      <View style={styles.week}>
        {([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((wd) => {
          const w = workoutForWeekday(plan, wd);
          const done = doneThisWeek.has(wd);
          const on = wd === selected;
          return (
            <Pressable
              key={wd}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${WEEKDAY_SHORT[wd]}${wd === todayWd ? ", today" : ""}: ${done ? "done" : w ? w.name : "rest day"}`}
              onPress={() => {
                tapHaptic();
                setSelected(wd);
              }}
              style={styles.day}
            >
              <PixelBackdrop source={on ? BG.tileOn : BG.tile} />
              <PixelText size={7} color={wd === todayWd ? T.cyan : T.muted}>{WEEKDAY_LETTER[wd]}</PixelText>
              {done ? (
                <View style={styles.doneBox}>
                  <PixelBackdrop source={BG.tileDone} />
                  <PixelText size={8} color={T.black}>✓</PixelText>
                </View>
              ) : w ? (
                <Image source={DUMBBELL} style={styles.dayIcon} contentFit="contain" />
              ) : (
                <Image source={MOON} style={[styles.dayIcon, styles.dim]} contentFit="contain" />
              )}
            </Pressable>
          );
        })}
      </View>

      {workout ? (
        <PixelCard>
          <View style={styles.rowBetween}>
            <Badge label={`${isToday ? "TODAY · " : ""}${WEEKDAY_SHORT[selected]}`} color={T.cyan} />
            <PixelText size={8} color={T.lime}>
              +{workout.exercises.reduce((n, e) => n + e.sets, 0) * XP_PER_WORKOUT_SET + XP_WORKOUT_COMPLETE} XP
            </PixelText>
          </View>
          <PixelText size={18}>{workout.name.toUpperCase()}</PixelText>
          <BodyText>
            {workout.exercises.length} exercises · about {estimateMinutes(workout)} min{workout.focus ? ` · ${workout.focus}` : ""}
          </BodyText>
          {workout.exercises.slice(0, 3).map((e) => (
            <View key={e.key} style={styles.exRow}>
              <BodyText size={14} color={T.text} style={styles.flex} numberOfLines={1}>{exerciseName(e.exerciseId)}</BodyText>
              <PixelText size={8} color={T.cyan}>{formatScheme(e)}</PixelText>
            </View>
          ))}
          {workout.exercises.length > 3 ? (
            <BodyText size={12}>+ {workout.exercises.length - 3} more: {workout.exercises.slice(3).map((e) => exerciseName(e.exerciseId).toLowerCase()).join(", ")}</BodyText>
          ) : null}
          {workout.exercises.length === 0 ? <BodyText>No exercises yet. Add some in My plan.</BodyText> : null}
          {doneSession ? (
            <View style={styles.doneNote}>
              <PixelText size={8} color={T.lime}>DONE ✓ {doneSession.workoutName.toUpperCase()}</PixelText>
            </View>
          ) : null}
          <PixelButton
            label={doneSession ? "TRAIN AGAIN" : "START WORKOUT"}
            variant={doneSession ? "blue" : "lime"}
            disabled={workout.exercises.length === 0}
            onPress={() => router.push({ pathname: "/(tabs)/actions/workout", params: { workoutId: workout.id } })}
          />
        </PixelCard>
      ) : (
        <PixelCard>
          <View style={styles.promoRow}>
            <Image source={MOON} style={styles.promoIcon} contentFit="contain" />
            <View style={styles.flex}>
              <PixelText size={12}>REST DAY</PixelText>
              <BodyText>
                Recovery is where you grow.{nextPlanned ? ` Next up: ${WEEKDAY_SHORT[nextPlanned.wd]} · ${nextPlanned.w.name}.` : ""}
              </BodyText>
            </View>
          </View>
          {plan.workouts.filter((w) => w.exercises.length > 0).length > 0 ? (
            <>
              <PixelText size={7} color={T.muted}>TRAIN ANYWAY</PixelText>
              <View style={styles.anyway}>
                {plan.workouts
                  .filter((w) => w.exercises.length > 0)
                  .map((w) => (
                    <PixelButton
                      key={w.id}
                      label={w.name}
                      variant="blue"
                      size="sm"
                      style={styles.anywayBtn}
                      onPress={() => router.push({ pathname: "/(tabs)/actions/workout", params: { workoutId: w.id } })}
                    />
                  ))}
              </View>
            </>
          ) : null}
        </PixelCard>
      )}

      <PixelNavRow
        label="MY PLAN"
        detail={`${plan.workouts.length} workout${plan.workouts.length === 1 ? "" : "s"} · days and exercises`}
        onPress={() => router.push("/(tabs)/actions/train-plan")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  flex: { flex: 1, minWidth: 0 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  week: { flexDirection: "row", gap: 5 },
  day: {
    flex: 1,
    height: 62,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dayIcon: { width: 20, height: 20 },
  dim: { opacity: 0.6 },
  doneBox: { width: 22, height: 22, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  exRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#0d3a75",
  },
  doneNote: { alignItems: "center", paddingVertical: 2 },
  promoRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  promoIcon: { width: 44, height: 44 },
  anyway: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  anywayBtn: { minWidth: 120, flexGrow: 1 },
});
