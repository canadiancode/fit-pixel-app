import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";

import { ActionsSubScreenLayout } from "@/features/actions/components/actions-sub-screen-layout";
import { estimateMinutes } from "@/features/training/components/train-plan-section";
import { Badge, BodyText, PixelButton, PixelCard, PixelText, T, tapHaptic } from "@/features/training/components/pixel-ui";
import { exerciseName } from "@/features/training/exercises";
import { blankPlan, formatScheme, newKey, WEEKDAY_LETTER, WEEKDAY_SHORT } from "@/features/training/programs";
import { useTraining } from "@/features/training/training-context";
import type { PlanWorkout, TrainingPlan, Weekday } from "@/features/training/types";

export default function TrainPlanScreen() {
  const router = useRouter();
  const { plan, savePlan, updatePlan } = useTraining();

  if (!plan) {
    return (
      <ActionsSubScreenLayout>
        <View style={styles.wrap}>
          <PixelText size={12}>No plan yet</PixelText>
          <BodyText>Take the quiz for a plan built for you, or build your own routine.</BodyText>
          <PixelButton label="TAKE THE QUIZ" onPress={() => router.replace("/(tabs)/actions/train-quest")} />
          <PixelButton label="Build my own routine" variant="blue" size="md" onPress={() => void savePlan(blankPlan())} />
        </View>
      </ActionsSubScreenLayout>
    );
  }

  const update = (fn: (p: TrainingPlan) => TrainingPlan) => void updatePlan(fn);

  const toggleDay = (workoutId: string, day: Weekday) => {
    tapHaptic();
    update((p) => {
      const owner = p.workouts.find((w) => w.weekdays.includes(day));
      return {
        ...p,
        workouts: p.workouts.map((w) => {
          // One workout per weekday: tapping a day another workout has moves it here.
          if (w.id === workoutId) {
            return owner?.id === workoutId
              ? { ...w, weekdays: w.weekdays.filter((d) => d !== day) }
              : { ...w, weekdays: [...w.weekdays, day].sort() as Weekday[] };
          }
          return { ...w, weekdays: w.weekdays.filter((d) => d !== day) };
        }),
      };
    });
  };

  const addWorkout = () => {
    const letter = String.fromCharCode(65 + (plan.workouts.length % 26));
    const w: PlanWorkout = { id: newKey("w"), name: `Workout ${letter}`, focus: "", weekdays: [], exercises: [] };
    update((p) => ({ ...p, workouts: [...p.workouts, w] }));
    router.push({ pathname: "/(tabs)/actions/train-workout-edit", params: { workoutId: w.id } });
  };

  const deleteWorkout = (w: PlanWorkout) => {
    Alert.alert(`Delete ${w.name}?`, "Your past workouts stay in your history.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => update((p) => ({ ...p, workouts: p.workouts.filter((x) => x.id !== w.id) })) },
    ]);
  };

  return (
    <ActionsSubScreenLayout>
      <View style={styles.wrap}>
        <View style={styles.header}>
          <PixelText size={8} color={T.cyan}>MY PLAN</PixelText>
          <TextInput
            accessibilityLabel="Plan name"
            value={plan.name}
            onChangeText={(name) => update((p) => ({ ...p, name: name.slice(0, 40) }))}
            style={styles.nameInput}
            placeholder="Plan name"
            placeholderTextColor="#ffffff66"
            keyboardAppearance="dark"
            returnKeyType="done"
          />
          <View style={styles.badges}>
            {plan.className ? <Badge label={plan.className.toUpperCase()} /> : null}
            <BodyText size={12}>{plan.answers ? "Built from your quiz. Change anything." : "Your own routine."}</BodyText>
          </View>
        </View>

        <BodyText size={12}>Tap the days to choose when each workout happens. Each day holds one workout.</BodyText>

        {plan.workouts.map((w) => (
          <PixelCard key={w.id}>
            <View style={styles.rowBetween}>
              <PixelText size={11} style={styles.flex} numberOfLines={1}>{w.name.toUpperCase()}</PixelText>
              <BodyText size={12}>
                {w.exercises.length} exercises{w.exercises.length ? ` · ~${estimateMinutes(w)} min` : ""}
              </BodyText>
            </View>
            <View style={styles.days}>
              {([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((d) => {
                const on = w.weekdays.includes(d);
                return (
                  <Pressable
                    key={d}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`${w.name} on ${WEEKDAY_SHORT[d]}`}
                    onPress={() => toggleDay(w.id, d)}
                    style={[styles.day, on && styles.dayOn]}
                  >
                    <PixelText size={8} color={on ? T.black : T.muted}>{WEEKDAY_LETTER[d]}</PixelText>
                  </Pressable>
                );
              })}
            </View>
            {w.exercises.map((e) => (
              <View key={e.key} style={styles.exRow}>
                <BodyText size={13} color={T.text} style={styles.flex} numberOfLines={1}>{exerciseName(e.exerciseId)}</BodyText>
                <PixelText size={7} color={T.cyan}>{formatScheme(e)}</PixelText>
              </View>
            ))}
            {w.exercises.length === 0 ? <BodyText>No exercises yet.</BodyText> : null}
            <View style={styles.actions}>
              <PixelButton
                label="EDIT"
                variant="cyan"
                size="sm"
                style={styles.flexBtn}
                onPress={() => router.push({ pathname: "/(tabs)/actions/train-workout-edit", params: { workoutId: w.id } })}
              />
              {plan.workouts.length > 1 ? (
                <PixelButton label="DELETE" variant="blue" size="sm" style={styles.flexBtn} onPress={() => deleteWorkout(w)} />
              ) : null}
            </View>
          </PixelCard>
        ))}

        <PixelButton label="+ ADD WORKOUT" variant="cyan" size="md" onPress={addWorkout} />

        <View style={styles.divider} />
        <PixelButton label="Retake the quiz" variant="blue" size="md" onPress={() => router.push("/(tabs)/actions/train-quest")} />
        <PixelButton
          label="Start from scratch"
          variant="blue"
          size="md"
          onPress={() =>
            Alert.alert("Start from scratch?", "This clears your plan so you can build your own. Your workout history stays.", [
              { text: "Cancel", style: "cancel" },
              { text: "Clear plan", style: "destructive", onPress: () => void savePlan(blankPlan()) },
            ])
          }
        />
      </View>
    </ActionsSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14, paddingBottom: 24 },
  header: { gap: 8 },
  flex: { flex: 1, minWidth: 0 },
  flexBtn: { flex: 1 },
  nameInput: {
    fontFamily: "PressStart2P",
    fontSize: 15,
    color: T.text,
    backgroundColor: T.deep,
    borderWidth: 3,
    borderColor: T.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  badges: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  days: { flexDirection: "row", gap: 5 },
  day: { flex: 1, height: 36, borderRadius: 6, borderWidth: 2, borderColor: T.borderSoft, backgroundColor: T.deep, alignItems: "center", justifyContent: "center" },
  dayOn: { backgroundColor: T.cyan, borderColor: T.black },
  exRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#0d3a75" },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  divider: { height: 2, backgroundColor: "#0d3a75", marginVertical: 4 },
});

