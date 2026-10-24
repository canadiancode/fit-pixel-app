import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";

import { ActionsSubScreenLayout } from "@/features/actions/components/actions-sub-screen-layout";
import { BodyText, PixelButton, PixelCard, PixelText, Stepper, T, tapHaptic } from "@/features/training/components/pixel-ui";
import { exerciseName, getExercise } from "@/features/training/exercises";
import { useTraining } from "@/features/training/training-context";
import type { PlannedExercise, PlanWorkout } from "@/features/training/types";

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export default function TrainWorkoutEditScreen() {
  const router = useRouter();
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const { plan, savePlan } = useTraining();
  const workout = plan?.workouts.find((w) => w.id === workoutId);

  if (!plan || !workout) {
    return (
      <ActionsSubScreenLayout>
        <BodyText>This workout no longer exists.</BodyText>
      </ActionsSubScreenLayout>
    );
  }

  const updateWorkout = (fn: (w: PlanWorkout) => PlanWorkout) =>
    void savePlan({ ...plan, workouts: plan.workouts.map((w) => (w.id === workout.id ? fn(w) : w)) });

  const updateExercise = (key: string, fn: (e: PlannedExercise) => PlannedExercise) =>
    updateWorkout((w) => ({ ...w, exercises: w.exercises.map((e) => (e.key === key ? fn(e) : e)) }));

  const move = (index: number, delta: number) => {
    tapHaptic();
    updateWorkout((w) => {
      const to = index + delta;
      if (to < 0 || to >= w.exercises.length) return w;
      const list = [...w.exercises];
      [list[index], list[to]] = [list[to], list[index]];
      return { ...w, exercises: list };
    });
  };

  const remove = (e: PlannedExercise) =>
    Alert.alert(`Remove ${exerciseName(e.exerciseId)}?`, undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => updateWorkout((w) => ({ ...w, exercises: w.exercises.filter((x) => x.key !== e.key) })) },
    ]);

  return (
    <ActionsSubScreenLayout>
      <View style={styles.wrap}>
        <PixelText size={8} color={T.cyan}>EDIT WORKOUT</PixelText>
        <TextInput
          accessibilityLabel="Workout name"
          value={workout.name}
          onChangeText={(name) => updateWorkout((w) => ({ ...w, name: name.slice(0, 30) }))}
          style={styles.input}
          placeholder="Workout name"
          placeholderTextColor="#ffffff66"
          keyboardAppearance="dark"
          returnKeyType="done"
        />
        <TextInput
          accessibilityLabel="Focus, optional"
          value={workout.focus}
          onChangeText={(focus) => updateWorkout((w) => ({ ...w, focus: focus.slice(0, 60) }))}
          style={[styles.input, styles.inputSmall]}
          placeholder="Focus (optional), e.g. chest and back"
          placeholderTextColor="#ffffff66"
          keyboardAppearance="dark"
          returnKeyType="done"
        />

        {workout.exercises.map((e, i) => {
          const time = getExercise(e.exerciseId)?.load === "time";
          return (
            <PixelCard key={e.key}>
              <View style={styles.rowBetween}>
                <PixelText size={9} style={styles.flex} numberOfLines={2}>{i + 1}. {exerciseName(e.exerciseId).toUpperCase()}</PixelText>
                <View style={styles.iconRow}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Move up" disabled={i === 0} onPress={() => move(i, -1)} style={[styles.iconBtn, i === 0 && styles.dim]}>
                    <PixelText size={9}>↑</PixelText>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Move down" disabled={i === workout.exercises.length - 1} onPress={() => move(i, 1)} style={[styles.iconBtn, i === workout.exercises.length - 1 && styles.dim]}>
                    <PixelText size={9}>↓</PixelText>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${exerciseName(e.exerciseId)}`} onPress={() => remove(e)} style={styles.iconBtn}>
                    <PixelText size={9} color={T.red}>✕</PixelText>
                  </Pressable>
                </View>
              </View>
              <View style={styles.steppers}>
                <Stepper compact label="SETS" value={String(e.sets)} decreaseLabel="One fewer set" increaseLabel="One more set"
                  onDecrease={() => updateExercise(e.key, (x) => ({ ...x, sets: clamp(x.sets - 1, 1, 10) }))}
                  onIncrease={() => updateExercise(e.key, (x) => ({ ...x, sets: clamp(x.sets + 1, 1, 10) }))} />
                <Stepper compact label="REST" value={`${e.restSec}s`} decreaseLabel="Less rest" increaseLabel="More rest"
                  onDecrease={() => updateExercise(e.key, (x) => ({ ...x, restSec: clamp(x.restSec - 15, 15, 300) }))}
                  onIncrease={() => updateExercise(e.key, (x) => ({ ...x, restSec: clamp(x.restSec + 15, 15, 300) }))} />
              </View>
              <View style={styles.steppers}>
                <Stepper compact label={time ? "MIN SEC" : "MIN REPS"} value={String(e.repsMin)} decreaseLabel="Lower the minimum" increaseLabel="Raise the minimum"
                  onDecrease={() => updateExercise(e.key, (x) => ({ ...x, repsMin: clamp(x.repsMin - (time ? 5 : 1), 1, x.repsMax) }))}
                  onIncrease={() => updateExercise(e.key, (x) => ({ ...x, repsMin: clamp(x.repsMin + (time ? 5 : 1), 1, x.repsMax) }))} />
                <Stepper compact label={time ? "MAX SEC" : "MAX REPS"} value={String(e.repsMax)} decreaseLabel="Lower the maximum" increaseLabel="Raise the maximum"
                  onDecrease={() => updateExercise(e.key, (x) => ({ ...x, repsMax: clamp(x.repsMax - (time ? 5 : 1), x.repsMin, time ? 600 : 50) }))}
                  onIncrease={() => updateExercise(e.key, (x) => ({ ...x, repsMax: clamp(x.repsMax + (time ? 5 : 1), x.repsMin, time ? 600 : 50) }))} />
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: "/(tabs)/actions/train-exercise-picker", params: { workoutId: workout.id, replaceKey: e.key } })}
                hitSlop={8}
              >
                <PixelText size={7} color={T.cyan}>SWAP EXERCISE ›</PixelText>
              </Pressable>
            </PixelCard>
          );
        })}

        {workout.exercises.length === 0 ? <BodyText>Add your first exercise to build this workout.</BodyText> : null}

        <PixelButton
          label="+ ADD EXERCISE"
          variant="cyan"
          size="md"
          onPress={() => router.push({ pathname: "/(tabs)/actions/train-exercise-picker", params: { workoutId: workout.id } })}
        />
        <PixelButton label="DONE" size="md" onPress={() => router.back()} />
      </View>
    </ActionsSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, paddingBottom: 24 },
  flex: { flex: 1, minWidth: 0 },
  input: {
    fontFamily: "PressStart2P",
    fontSize: 14,
    color: T.text,
    backgroundColor: T.deep,
    borderWidth: 3,
    borderColor: T.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  inputSmall: { fontFamily: "PixeloidSans", fontSize: 14 },
  rowBetween: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconRow: { flexDirection: "row", gap: 6 },
  iconBtn: { width: 36, height: 36, borderRadius: 6, borderWidth: 2, borderColor: T.border, backgroundColor: "#0b3f86", alignItems: "center", justifyContent: "center" },
  dim: { opacity: 0.3 },
  steppers: { flexDirection: "row", gap: 8 },
});
