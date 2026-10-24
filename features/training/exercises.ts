import type { Equipment, Exercise, Muscle } from "./types";

/**
 * The exercise library. Ids are stable (plans and history store them), so
 * rename freely but never reuse or change an id.
 */
export const EXERCISES: readonly Exercise[] = [
  // Chest
  { id: "bench-press", name: "Bench press", muscles: ["chest", "triceps", "shoulders"], equipment: "barbell", kind: "compound", load: "weight", cue: "Feet planted, shoulder blades pinched, bar to mid-chest." },
  { id: "incline-bench-press", name: "Incline bench press", muscles: ["chest", "shoulders", "triceps"], equipment: "barbell", kind: "compound", load: "weight", cue: "Bench at 30°, elbows about 45°, touch the upper chest." },
  { id: "db-bench-press", name: "Dumbbell bench press", muscles: ["chest", "triceps", "shoulders"], equipment: "dumbbell", kind: "compound", load: "weight", cue: "Lower until elbows are just below the bench, press up and in." },
  { id: "incline-db-press", name: "Incline dumbbell press", muscles: ["chest", "shoulders", "triceps"], equipment: "dumbbell", kind: "compound", load: "weight", cue: "Bench at 30°, control the stretch at the bottom." },
  { id: "machine-chest-press", name: "Machine chest press", muscles: ["chest", "triceps"], equipment: "machine", kind: "compound", load: "weight", cue: "Handles at mid-chest, don't let the shoulders roll forward." },
  { id: "cable-fly", name: "Cable fly", muscles: ["chest"], equipment: "cable", kind: "isolation", load: "weight", cue: "Soft elbows, hug a tree, squeeze at the middle." },
  { id: "db-fly", name: "Dumbbell fly", muscles: ["chest"], equipment: "dumbbell", kind: "isolation", load: "weight", cue: "Slight bend in the elbows, stretch wide, squeeze up." },
  { id: "push-up", name: "Push-up", muscles: ["chest", "triceps", "shoulders"], equipment: "bodyweight", kind: "compound", load: "bodyweight", cue: "Body in one straight line, chest to the floor." },
  { id: "dip", name: "Dip", muscles: ["chest", "triceps"], equipment: "bodyweight", kind: "compound", load: "bodyweight", cue: "Lean slightly forward, lower until elbows reach 90°." },

  // Back
  { id: "deadlift", name: "Deadlift", muscles: ["back", "hamstrings", "glutes"], equipment: "barbell", kind: "compound", load: "weight", cue: "Bar over mid-foot, flat back, push the floor away." },
  { id: "barbell-row", name: "Barbell row", muscles: ["back", "biceps"], equipment: "barbell", kind: "compound", load: "weight", cue: "Hinge to 45°, pull the bar to your belly button." },
  { id: "pull-up", name: "Pull-up", muscles: ["back", "biceps"], equipment: "bodyweight", kind: "compound", load: "bodyweight", cue: "Full hang, chest to the bar, no swinging." },
  { id: "lat-pulldown", name: "Lat pulldown", muscles: ["back", "biceps"], equipment: "cable", kind: "compound", load: "weight", cue: "Pull to the upper chest, elbows down to your sides." },
  { id: "seated-cable-row", name: "Seated cable row", muscles: ["back", "biceps"], equipment: "cable", kind: "compound", load: "weight", cue: "Sit tall, pull to the stomach, pause with shoulders back." },
  { id: "chest-supported-row", name: "Chest-supported row", muscles: ["back", "shoulders"], equipment: "dumbbell", kind: "compound", load: "weight", cue: "Chest on the pad, pull elbows back, pause at the top." },
  { id: "one-arm-db-row", name: "One-arm dumbbell row", muscles: ["back", "biceps"], equipment: "dumbbell", kind: "compound", load: "weight", cue: "Hand and knee on the bench, pull the dumbbell to your hip." },
  { id: "inverted-row", name: "Inverted row", muscles: ["back", "biceps"], equipment: "bodyweight", kind: "compound", load: "bodyweight", cue: "Body straight under a bar or table, pull your chest up." },
  { id: "face-pull", name: "Face pull", muscles: ["shoulders", "back"], equipment: "cable", kind: "isolation", load: "weight", cue: "Rope to your forehead, elbows high, thumbs back." },

  // Shoulders
  { id: "overhead-press", name: "Overhead press", muscles: ["shoulders", "triceps"], equipment: "barbell", kind: "compound", load: "weight", cue: "Squeeze glutes, press straight up, head through at the top." },
  { id: "seated-db-press", name: "Seated dumbbell press", muscles: ["shoulders", "triceps"], equipment: "dumbbell", kind: "compound", load: "weight", cue: "Back against the pad, press up without clanging the bells." },
  { id: "lateral-raise", name: "Lateral raise", muscles: ["shoulders"], equipment: "dumbbell", kind: "isolation", load: "weight", cue: "Lead with the elbows, stop at shoulder height." },
  { id: "rear-delt-fly", name: "Rear delt fly", muscles: ["shoulders", "back"], equipment: "dumbbell", kind: "isolation", load: "weight", cue: "Hinge forward, arms out wide, squeeze the back of the shoulders." },
  { id: "pike-push-up", name: "Pike push-up", muscles: ["shoulders", "triceps"], equipment: "bodyweight", kind: "compound", load: "bodyweight", cue: "Hips high, lower the top of your head toward the floor." },

  // Arms
  { id: "barbell-curl", name: "Barbell curl", muscles: ["biceps"], equipment: "barbell", kind: "isolation", load: "weight", cue: "Elbows pinned, no swinging, squeeze at the top." },
  { id: "db-curl", name: "Dumbbell curl", muscles: ["biceps"], equipment: "dumbbell", kind: "isolation", load: "weight", cue: "Turn the pinkies up as you curl." },
  { id: "hammer-curl", name: "Hammer curl", muscles: ["biceps", "forearms"], equipment: "dumbbell", kind: "isolation", load: "weight", cue: "Thumbs up the whole way, slow on the way down." },
  { id: "cable-curl", name: "Cable curl", muscles: ["biceps"], equipment: "cable", kind: "isolation", load: "weight", cue: "Constant tension, don't let the weight stack touch." },
  { id: "triceps-pushdown", name: "Triceps pushdown", muscles: ["triceps"], equipment: "cable", kind: "isolation", load: "weight", cue: "Elbows tucked, push down until arms are straight." },
  { id: "overhead-triceps-extension", name: "Overhead triceps extension", muscles: ["triceps"], equipment: "dumbbell", kind: "isolation", load: "weight", cue: "Elbows point forward, lower behind the head, extend fully." },
  { id: "skull-crusher", name: "Skull crusher", muscles: ["triceps"], equipment: "barbell", kind: "isolation", load: "weight", cue: "Lower to the forehead, only the elbows move." },
  { id: "close-grip-push-up", name: "Close-grip push-up", muscles: ["triceps", "chest"], equipment: "bodyweight", kind: "compound", load: "bodyweight", cue: "Hands under the shoulders, elbows brush your ribs." },

  // Legs
  { id: "back-squat", name: "Back squat", muscles: ["quads", "glutes"], equipment: "barbell", kind: "compound", load: "weight", cue: "Brace, sit between your heels, knees track the toes." },
  { id: "front-squat", name: "Front squat", muscles: ["quads", "core"], equipment: "barbell", kind: "compound", load: "weight", cue: "Elbows high, stay upright, sit straight down." },
  { id: "goblet-squat", name: "Goblet squat", muscles: ["quads", "glutes"], equipment: "dumbbell", kind: "compound", load: "weight", cue: "Hold the weight at your chest, elbows inside the knees." },
  { id: "leg-press", name: "Leg press", muscles: ["quads", "glutes"], equipment: "machine", kind: "compound", load: "weight", cue: "Lower until hips nearly lift, don't lock the knees." },
  { id: "romanian-deadlift", name: "Romanian deadlift", muscles: ["hamstrings", "glutes"], equipment: "barbell", kind: "compound", load: "weight", cue: "Soft knees, push the hips back, bar slides down the thighs." },
  { id: "db-romanian-deadlift", name: "Dumbbell Romanian deadlift", muscles: ["hamstrings", "glutes"], equipment: "dumbbell", kind: "compound", load: "weight", cue: "Hips back, flat back, feel the hamstring stretch." },
  { id: "bulgarian-split-squat", name: "Bulgarian split squat", muscles: ["quads", "glutes"], equipment: "dumbbell", kind: "compound", load: "weight", cue: "Back foot on the bench, drop the back knee straight down." },
  { id: "walking-lunge", name: "Walking lunge", muscles: ["quads", "glutes"], equipment: "dumbbell", kind: "compound", load: "weight", cue: "Long steps, back knee kisses the floor." },
  { id: "leg-curl", name: "Leg curl", muscles: ["hamstrings"], equipment: "machine", kind: "isolation", load: "weight", cue: "Hips down on the pad, curl all the way, slow return." },
  { id: "leg-extension", name: "Leg extension", muscles: ["quads"], equipment: "machine", kind: "isolation", load: "weight", cue: "Pause at the top, lower under control." },
  { id: "hip-thrust", name: "Hip thrust", muscles: ["glutes", "hamstrings"], equipment: "barbell", kind: "compound", load: "weight", cue: "Upper back on the bench, chin tucked, squeeze at the top." },
  { id: "glute-bridge", name: "Glute bridge", muscles: ["glutes"], equipment: "bodyweight", kind: "isolation", load: "bodyweight", cue: "Drive through the heels, ribs down, hold the top." },
  { id: "calf-raise", name: "Calf raise", muscles: ["calves"], equipment: "machine", kind: "isolation", load: "weight", cue: "Full stretch at the bottom, pause at the top." },
  { id: "bodyweight-squat", name: "Bodyweight squat", muscles: ["quads", "glutes"], equipment: "bodyweight", kind: "compound", load: "bodyweight", cue: "Arms forward, sit back and down, chest proud." },
  { id: "split-squat", name: "Split squat", muscles: ["quads", "glutes"], equipment: "bodyweight", kind: "compound", load: "bodyweight", cue: "Stay tall, drop straight down, push through the front heel." },
  { id: "single-leg-rdl", name: "Single-leg Romanian deadlift", muscles: ["hamstrings", "glutes"], equipment: "bodyweight", kind: "compound", load: "bodyweight", cue: "Hinge on one leg, back leg in line with your body." },
  { id: "kb-swing", name: "Kettlebell swing", muscles: ["glutes", "hamstrings", "cardio"], equipment: "kettlebell", kind: "compound", load: "weight", cue: "Hike it back, snap the hips, let it float to chest height." },

  // Core
  { id: "plank", name: "Plank", muscles: ["core"], equipment: "bodyweight", kind: "isolation", load: "time", cue: "Elbows under shoulders, squeeze glutes, don't sag." },
  { id: "hanging-knee-raise", name: "Hanging knee raise", muscles: ["core"], equipment: "bodyweight", kind: "isolation", load: "bodyweight", cue: "No swinging, curl the pelvis up." },
  { id: "cable-crunch", name: "Cable crunch", muscles: ["core"], equipment: "cable", kind: "isolation", load: "weight", cue: "Kneel, crunch the ribs toward the hips, hips stay still." },
  { id: "dead-bug", name: "Dead bug", muscles: ["core"], equipment: "bodyweight", kind: "isolation", load: "bodyweight", cue: "Lower back pressed down, opposite arm and leg reach out." },
  { id: "pallof-press", name: "Pallof press", muscles: ["core"], equipment: "cable", kind: "isolation", load: "weight", cue: "Stand side-on to the cable, press out, don't let it twist you." },

  // Conditioning
  { id: "burpee", name: "Burpee", muscles: ["cardio", "chest", "quads"], equipment: "bodyweight", kind: "compound", load: "bodyweight", cue: "Chest to floor, jump at the top, keep a steady pace." },
  { id: "mountain-climber", name: "Mountain climber", muscles: ["cardio", "core"], equipment: "bodyweight", kind: "compound", load: "time", cue: "Hips low, drive the knees fast." },
  { id: "jump-squat", name: "Jump squat", muscles: ["quads", "glutes", "cardio"], equipment: "bodyweight", kind: "compound", load: "bodyweight", cue: "Land softly and go straight into the next rep." },
  { id: "rowing-machine", name: "Rowing machine", muscles: ["cardio", "back", "quads"], equipment: "machine", kind: "compound", load: "time", cue: "Legs, then hips, then arms. Reverse on the way back." },
];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise | undefined {
  return BY_ID.get(id);
}

export function exerciseName(id: string): string {
  return BY_ID.get(id)?.name ?? "Exercise";
}

export const MUSCLE_LABELS: Record<Muscle, string> = {
  chest: "Chest", back: "Back", shoulders: "Shoulders", biceps: "Biceps",
  triceps: "Triceps", forearms: "Forearms", quads: "Quads", hamstrings: "Hamstrings",
  glutes: "Glutes", calves: "Calves", core: "Core", cardio: "Cardio",
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: "Barbell", dumbbell: "Dumbbell", machine: "Machine",
  cable: "Cable", bodyweight: "Bodyweight", kettlebell: "Kettlebell",
};
