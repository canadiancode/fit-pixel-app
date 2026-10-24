import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { ActionsSubScreenLayout } from "@/features/actions/components/actions-sub-screen-layout";
import { BodyText, PixelText, T, tapHaptic } from "@/features/training/components/pixel-ui";
import { EQUIPMENT_LABELS, EXERCISES, MUSCLE_LABELS } from "@/features/training/exercises";
import { defaultPlannedExercise } from "@/features/training/programs";
import { useTraining } from "@/features/training/training-context";
import type { Equipment, Muscle } from "@/features/training/types";

const MUSCLE_FILTERS: { label: string; muscles: Muscle[] | null }[] = [
  { label: "All", muscles: null },
  { label: "Chest", muscles: ["chest"] },
  { label: "Back", muscles: ["back"] },
  { label: "Shoulders", muscles: ["shoulders"] },
  { label: "Arms", muscles: ["biceps", "triceps", "forearms"] },
  { label: "Legs", muscles: ["quads", "hamstrings", "calves"] },
  { label: "Glutes", muscles: ["glutes"] },
  { label: "Core", muscles: ["core"] },
  { label: "Cardio", muscles: ["cardio"] },
];

const EQUIPMENT_FILTERS: { label: string; equipment: Equipment[] | null }[] = [
  { label: "Any gear", equipment: null },
  { label: "Gym", equipment: ["barbell", "machine", "cable", "kettlebell"] },
  { label: "Dumbbells", equipment: ["dumbbell"] },
  { label: "Bodyweight", equipment: ["bodyweight"] },
];

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      style={[styles.chip, on && styles.chipOn]}
    >
      <PixelText size={7} color={on ? T.black : T.text}>{label}</PixelText>
    </Pressable>
  );
}

export default function TrainExercisePickerScreen() {
  const router = useRouter();
  const { workoutId, replaceKey } = useLocalSearchParams<{ workoutId: string; replaceKey?: string }>();
  const { plan, savePlan } = useTraining();
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState(0);
  const [gear, setGear] = useState(0);
  const workout = plan?.workouts.find((w) => w.id === workoutId);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const mf = MUSCLE_FILTERS[muscle].muscles;
    const ef = EQUIPMENT_FILTERS[gear].equipment;
    return EXERCISES.filter(
      (e) =>
        (!q || e.name.toLowerCase().includes(q)) &&
        (!mf || e.muscles.some((m) => mf.includes(m))) &&
        (!ef || ef.includes(e.equipment)),
    );
  }, [query, muscle, gear]);

  if (!plan || !workout) {
    return (
      <ActionsSubScreenLayout>
        <BodyText>This workout no longer exists.</BodyText>
      </ActionsSubScreenLayout>
    );
  }

  const inWorkout = new Set(workout.exercises.map((e) => e.exerciseId));

  const pick = async (exerciseId: string) => {
    tapHaptic();
    const exercises = replaceKey
      ? workout.exercises.map((e) => (e.key === replaceKey ? { ...defaultPlannedExercise(exerciseId), key: e.key, sets: e.sets, restSec: e.restSec } : e))
      : [...workout.exercises, defaultPlannedExercise(exerciseId)];
    await savePlan({ ...plan, workouts: plan.workouts.map((w) => (w.id === workout.id ? { ...w, exercises } : w)) });
    router.back();
  };

  return (
    <ActionsSubScreenLayout>
      <View style={styles.wrap}>
        <PixelText size={8} color={T.cyan}>{replaceKey ? "SWAP EXERCISE" : `ADD TO ${workout.name.toUpperCase()}`}</PixelText>
        <TextInput
          accessibilityLabel="Search exercises"
          value={query}
          onChangeText={setQuery}
          placeholder="Search exercises"
          placeholderTextColor="#ffffff66"
          style={styles.search}
          keyboardAppearance="dark"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        <View style={styles.chips}>
          {MUSCLE_FILTERS.map((f, i) => (
            <Chip key={f.label} label={f.label} on={i === muscle} onPress={() => setMuscle(i)} />
          ))}
        </View>
        <View style={styles.chips}>
          {EQUIPMENT_FILTERS.map((f, i) => (
            <Chip key={f.label} label={f.label} on={i === gear} onPress={() => setGear(i)} />
          ))}
        </View>

        {results.map((e) => {
          const added = inWorkout.has(e.id);
          return (
            <Pressable
              key={e.id}
              accessibilityRole="button"
              accessibilityLabel={`${e.name}, ${EQUIPMENT_LABELS[e.equipment]}${added ? ", already in this workout" : ""}`}
              onPress={() => void pick(e.id)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.flex}>
                <BodyText size={14} color={T.text}>{e.name}</BodyText>
                <BodyText size={11}>
                  {e.muscles.map((m) => MUSCLE_LABELS[m]).join(" · ")} · {EQUIPMENT_LABELS[e.equipment]}
                </BodyText>
              </View>
              <PixelText size={8} color={added ? T.lime : T.cyan}>{added ? "ADDED" : replaceKey ? "USE" : "+ ADD"}</PixelText>
            </Pressable>
          );
        })}
        {results.length === 0 ? <BodyText>No exercises match. Try another filter.</BodyText> : null}
      </View>
    </ActionsSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, paddingBottom: 24 },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  search: {
    fontFamily: "PixeloidSans",
    fontSize: 15,
    color: T.text,
    backgroundColor: T.deep,
    borderWidth: 3,
    borderColor: T.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 8, paddingVertical: 7, borderRadius: 6, borderWidth: 2, borderColor: T.border, backgroundColor: T.card },
  chipOn: { backgroundColor: T.lime, borderColor: T.black },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: T.card,
    borderWidth: 2,
    borderColor: T.borderSoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 56,
  },
  rowPressed: { backgroundColor: T.cardActive },
});
