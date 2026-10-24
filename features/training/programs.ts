import { getExercise } from "./exercises";
import type {
  PlannedExercise,
  PlanWorkout,
  QuestAnswers,
  TrainingFocus,
  TrainingGoal,
  TrainingPlan,
  Weekday,
} from "./types";

/**
 * Program templates + the rules that turn questionnaire answers into a plan.
 * A generated plan is only a starting point: every workout, exercise, set
 * count, rep range and weekday can be edited afterwards.
 */

type Role = "main" | "secondary" | "accessory";
type Slot = { ex: string; role: Role };
type TemplateWorkout = { name: string; focus: string; kind: "upper" | "lower" | "full" | "push" | "pull" | "legs"; slots: Slot[] };
type ProgramTemplate = { id: string; name: string; weeks: number; workouts: TemplateWorkout[] };

const m = (ex: string): Slot => ({ ex, role: "main" });
const s = (ex: string): Slot => ({ ex, role: "secondary" });
const a = (ex: string): Slot => ({ ex, role: "accessory" });

export const PROGRAMS: readonly ProgramTemplate[] = [
  {
    id: "full-body",
    name: "Full Body",
    weeks: 8,
    workouts: [
      { name: "Full Body A", focus: "Squat, press, row", kind: "full", slots: [m("back-squat"), m("bench-press"), s("barbell-row"), s("romanian-deadlift"), a("lateral-raise"), a("triceps-pushdown"), a("plank")] },
      { name: "Full Body B", focus: "Hinge, press, pull", kind: "full", slots: [m("deadlift"), m("overhead-press"), s("lat-pulldown"), s("leg-press"), a("db-curl"), a("face-pull"), a("calf-raise")] },
      { name: "Full Body C", focus: "Squat, incline, row", kind: "full", slots: [m("front-squat"), m("incline-db-press"), s("seated-cable-row"), s("leg-curl"), a("rear-delt-fly"), a("hammer-curl"), a("cable-crunch")] },
    ],
  },
  {
    id: "strength-3",
    name: "Strength Foundations",
    weeks: 8,
    workouts: [
      { name: "Strength A", focus: "Squat, bench, row", kind: "full", slots: [m("back-squat"), m("bench-press"), m("barbell-row"), a("face-pull"), a("plank")] },
      { name: "Strength B", focus: "Squat, press, deadlift", kind: "full", slots: [m("back-squat"), m("overhead-press"), m("deadlift"), a("pull-up"), a("hanging-knee-raise")] },
    ],
  },
  {
    id: "upper-lower",
    name: "Upper / Lower",
    weeks: 8,
    workouts: [
      { name: "Upper A", focus: "Chest, back, shoulders, arms", kind: "upper", slots: [m("bench-press"), m("barbell-row"), s("overhead-press"), s("lat-pulldown"), a("lateral-raise"), a("barbell-curl"), a("triceps-pushdown")] },
      { name: "Lower A", focus: "Squat focus, hamstrings, calves", kind: "lower", slots: [m("back-squat"), s("romanian-deadlift"), s("leg-press"), a("leg-curl"), a("calf-raise"), a("plank")] },
      { name: "Upper B", focus: "Incline press, rows, shoulders, arms", kind: "upper", slots: [m("incline-bench-press"), m("chest-supported-row"), s("seated-db-press"), s("lat-pulldown"), a("hammer-curl"), a("overhead-triceps-extension"), a("face-pull")] },
      { name: "Lower B", focus: "Deadlift focus, quads, core", kind: "lower", slots: [m("deadlift"), s("bulgarian-split-squat"), s("leg-extension"), a("hip-thrust"), a("calf-raise"), a("cable-crunch")] },
    ],
  },
  {
    id: "ppl",
    name: "Push / Pull / Legs",
    weeks: 8,
    workouts: [
      { name: "Push A", focus: "Chest, shoulders, triceps", kind: "push", slots: [m("bench-press"), s("overhead-press"), s("incline-db-press"), a("lateral-raise"), a("triceps-pushdown"), a("cable-fly")] },
      { name: "Pull A", focus: "Back, rear delts, biceps", kind: "pull", slots: [m("deadlift"), s("pull-up"), s("seated-cable-row"), a("face-pull"), a("barbell-curl"), a("hammer-curl")] },
      { name: "Legs A", focus: "Quads, hamstrings, calves", kind: "legs", slots: [m("back-squat"), s("romanian-deadlift"), s("leg-press"), a("leg-curl"), a("calf-raise"), a("hanging-knee-raise")] },
      { name: "Push B", focus: "Shoulders, upper chest, triceps", kind: "push", slots: [m("overhead-press"), s("incline-bench-press"), s("dip"), a("lateral-raise"), a("overhead-triceps-extension"), a("db-fly")] },
      { name: "Pull B", focus: "Lats, mid-back, biceps", kind: "pull", slots: [m("barbell-row"), s("lat-pulldown"), s("chest-supported-row"), a("rear-delt-fly"), a("cable-curl"), a("db-curl")] },
      { name: "Legs B", focus: "Glutes, quads, core", kind: "legs", slots: [m("front-squat"), s("hip-thrust"), s("bulgarian-split-squat"), a("leg-extension"), a("calf-raise"), a("cable-crunch")] },
    ],
  },
  {
    id: "ppl-5",
    name: "Push / Pull / Legs + Upper / Lower",
    weeks: 8,
    workouts: [
      { name: "Push", focus: "Chest, shoulders, triceps", kind: "push", slots: [m("bench-press"), s("overhead-press"), s("incline-db-press"), a("lateral-raise"), a("triceps-pushdown"), a("cable-fly")] },
      { name: "Pull", focus: "Back, rear delts, biceps", kind: "pull", slots: [m("deadlift"), s("pull-up"), s("seated-cable-row"), a("face-pull"), a("barbell-curl"), a("hammer-curl")] },
      { name: "Legs", focus: "Quads, hamstrings, calves", kind: "legs", slots: [m("back-squat"), s("romanian-deadlift"), s("leg-press"), a("leg-curl"), a("calf-raise"), a("hanging-knee-raise")] },
      { name: "Upper", focus: "Incline press, rows, arms", kind: "upper", slots: [m("incline-bench-press"), m("barbell-row"), s("seated-db-press"), s("lat-pulldown"), a("db-curl"), a("overhead-triceps-extension")] },
      { name: "Lower", focus: "Glutes, quads, core", kind: "lower", slots: [m("front-squat"), s("hip-thrust"), s("bulgarian-split-squat"), a("leg-curl"), a("calf-raise"), a("cable-crunch")] },
    ],
  },
  {
    id: "db-full-body",
    name: "Dumbbell Full Body",
    weeks: 8,
    workouts: [
      { name: "Dumbbell A", focus: "Squat, press, row", kind: "full", slots: [m("goblet-squat"), m("db-bench-press"), s("one-arm-db-row"), s("db-romanian-deadlift"), a("lateral-raise"), a("db-curl"), a("dead-bug")] },
      { name: "Dumbbell B", focus: "Lunge, press, row", kind: "full", slots: [m("bulgarian-split-squat"), m("seated-db-press"), s("chest-supported-row"), s("walking-lunge"), a("db-fly"), a("overhead-triceps-extension"), a("plank")] },
    ],
  },
  {
    id: "db-upper-lower",
    name: "Dumbbell Upper / Lower",
    weeks: 8,
    workouts: [
      { name: "Upper A", focus: "Chest, back, arms", kind: "upper", slots: [m("db-bench-press"), m("one-arm-db-row"), s("seated-db-press"), a("lateral-raise"), a("db-curl"), a("overhead-triceps-extension")] },
      { name: "Lower A", focus: "Squat, hinge, calves", kind: "lower", slots: [m("goblet-squat"), s("db-romanian-deadlift"), s("walking-lunge"), a("glute-bridge"), a("plank")] },
      { name: "Upper B", focus: "Incline, rows, shoulders", kind: "upper", slots: [m("incline-db-press"), m("chest-supported-row"), s("seated-db-press"), a("rear-delt-fly"), a("hammer-curl"), a("close-grip-push-up")] },
      { name: "Lower B", focus: "Single leg, glutes, core", kind: "lower", slots: [m("bulgarian-split-squat"), s("db-romanian-deadlift"), s("goblet-squat"), a("glute-bridge"), a("dead-bug")] },
    ],
  },
  {
    id: "bodyweight",
    name: "Bodyweight Anywhere",
    weeks: 8,
    workouts: [
      { name: "Bodyweight A", focus: "Push, squat, core", kind: "full", slots: [m("push-up"), m("bodyweight-squat"), s("inverted-row"), s("split-squat"), a("pike-push-up"), a("glute-bridge"), a("plank")] },
      { name: "Bodyweight B", focus: "Pull, lunge, core", kind: "full", slots: [m("pull-up"), m("split-squat"), s("dip"), s("single-leg-rdl"), a("close-grip-push-up"), a("jump-squat"), a("dead-bug")] },
    ],
  },
];

/** Rep schemes by goal and role: [sets, repsMin, repsMax, restSec]. */
const SCHEMES: Record<TrainingGoal, Record<Role, [number, number, number, number]>> = {
  muscle: { main: [4, 6, 10, 120], secondary: [3, 8, 12, 90], accessory: [3, 10, 15, 60] },
  strength: { main: [5, 3, 5, 180], secondary: [3, 6, 8, 120], accessory: [2, 8, 12, 75] },
  fatloss: { main: [3, 8, 12, 75], secondary: [3, 10, 12, 60], accessory: [2, 12, 15, 45] },
  fitness: { main: [3, 8, 10, 90], secondary: [3, 10, 12, 75], accessory: [2, 12, 15, 60] },
  endurance: { main: [3, 12, 15, 60], secondary: [2, 12, 15, 45], accessory: [2, 15, 20, 45] },
};

/** Exercises per workout by session length. */
const MAX_EXERCISES: Record<QuestAnswers["sessionMin"], number> = { 30: 4, 45: 5, 60: 6, 75: 7 };

export const WEEKDAY_SCHEDULES: Record<QuestAnswers["daysPerWeek"], Weekday[]> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
};

export const CLASS_FOR_GOAL: Record<TrainingGoal, string> = {
  muscle: "Titan",
  strength: "Warrior",
  fatloss: "Ranger",
  fitness: "Adventurer",
  endurance: "Scout",
};

/** One extra exercise per focus area, by equipment, and which workouts get it. */
const FOCUS_EXERCISE: Record<Exclude<TrainingFocus, "none">, { gym: string; dumbbells: string; bodyweight: string; kinds: TemplateWorkout["kind"][] }> = {
  upper: { gym: "lateral-raise", dumbbells: "lateral-raise", bodyweight: "pike-push-up", kinds: ["upper", "push", "full"] },
  lower: { gym: "leg-press", dumbbells: "walking-lunge", bodyweight: "split-squat", kinds: ["lower", "legs", "full"] },
  glutes: { gym: "hip-thrust", dumbbells: "glute-bridge", bodyweight: "glute-bridge", kinds: ["lower", "legs", "full"] },
  arms: { gym: "hammer-curl", dumbbells: "hammer-curl", bodyweight: "close-grip-push-up", kinds: ["upper", "pull", "push", "full"] },
  core: { gym: "cable-crunch", dumbbells: "dead-bug", bodyweight: "plank", kinds: ["upper", "lower", "full", "push", "pull", "legs"] },
};

/** A conditioning finisher for fat-loss and endurance goals (sessions of 45+ min). */
const FINISHER: Record<QuestAnswers["equipment"], string> = {
  gym: "rowing-machine",
  dumbbells: "burpee",
  bodyweight: "mountain-climber",
};

export function pickProgram(answers: QuestAnswers): ProgramTemplate {
  const id =
    answers.equipment === "bodyweight"
      ? "bodyweight"
      : answers.equipment === "dumbbells"
        ? answers.daysPerWeek <= 3 ? "db-full-body" : "db-upper-lower"
        : answers.daysPerWeek <= 3
          ? answers.goal === "strength" ? "strength-3" : "full-body"
          : answers.daysPerWeek === 4 ? "upper-lower"
          : answers.daysPerWeek === 5 ? "ppl-5" : "ppl";
  return PROGRAMS.find((p) => p.id === id) ?? PROGRAMS[0];
}

let keyCounter = 0;
export function newKey(prefix = "k"): string {
  keyCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${keyCounter.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function planned(exerciseId: string, role: Role, answers: QuestAnswers): PlannedExercise {
  const [baseSets, repsMin, repsMax, restSec] = SCHEMES[answers.goal][role];
  let sets = baseSets;
  if (answers.experience === "new") sets = role === "main" ? Math.max(2, sets - 1) : Math.min(sets, 2);
  if (answers.experience === "advanced" && role === "main") sets += 1;
  if (getExercise(exerciseId)?.load === "time") {
    return { key: newKey("pe"), exerciseId, sets: 3, repsMin: 30, repsMax: 60, restSec: 45 };
  }
  return { key: newKey("pe"), exerciseId, sets, repsMin, repsMax, restSec };
}

/** Questionnaire answers → a full, editable plan. */
export function generatePlan(answers: QuestAnswers, now = new Date().toISOString()): TrainingPlan {
  const program = pickProgram(answers);
  const schedule = WEEKDAY_SCHEDULES[answers.daysPerWeek];
  const cap = MAX_EXERCISES[answers.sessionMin];

  // Weekdays go to the program's workouts in rotation.
  const weekdaysFor = new Map<number, Weekday[]>();
  schedule.forEach((day, i) => {
    const w = i % program.workouts.length;
    weekdaysFor.set(w, [...(weekdaysFor.get(w) ?? []), day]);
  });

  const workouts: PlanWorkout[] = program.workouts.map((tw, wi) => {
    let slots = tw.slots.slice(0, cap);

    const focus = answers.focus !== "none" ? FOCUS_EXERCISE[answers.focus] : null;
    if (focus && focus.kinds.includes(tw.kind)) {
      const focusEx = focus[answers.equipment];
      if (!slots.some((sl) => sl.ex === focusEx)) {
        slots = slots.length < cap ? [...slots, a(focusEx)] : [...slots.slice(0, -1), a(focusEx)];
      }
    }

    if ((answers.goal === "fatloss" || answers.goal === "endurance") && answers.sessionMin >= 45) {
      const fin = FINISHER[answers.equipment];
      if (!slots.some((sl) => sl.ex === fin)) {
        slots = slots.length < cap ? [...slots, a(fin)] : [...slots.slice(0, -1), a(fin)];
      }
    }

    return {
      id: newKey("w"),
      name: tw.name,
      focus: tw.focus,
      weekdays: weekdaysFor.get(wi) ?? [],
      exercises: slots.map((sl) => planned(sl.ex, sl.role, answers)),
    };
  });

  return {
    v: 1,
    programId: program.id,
    name: program.name,
    answers,
    className: CLASS_FOR_GOAL[answers.goal],
    weeks: program.weeks,
    workouts,
    createdAt: now,
    updatedAt: now,
  };
}

/** "Build my own": one empty workout to fill in. */
export function blankPlan(now = new Date().toISOString()): TrainingPlan {
  return {
    v: 1,
    programId: "custom",
    name: "My routine",
    answers: null,
    className: null,
    weeks: null,
    workouts: [{ id: newKey("w"), name: "Workout A", focus: "", weekdays: [], exercises: [] }],
    createdAt: now,
    updatedAt: now,
  };
}

/** A default planned exercise for one added by hand in the editor. */
export function defaultPlannedExercise(exerciseId: string): PlannedExercise {
  const ex = getExercise(exerciseId);
  if (ex?.load === "time") return { key: newKey("pe"), exerciseId, sets: 3, repsMin: 30, repsMax: 60, restSec: 45 };
  return ex?.kind === "compound"
    ? { key: newKey("pe"), exerciseId, sets: 3, repsMin: 6, repsMax: 10, restSec: 120 }
    : { key: newKey("pe"), exerciseId, sets: 3, repsMin: 10, repsMax: 15, restSec: 60 };
}

export const WEEKDAY_SHORT = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
export const WEEKDAY_LETTER = ["M", "T", "W", "T", "F", "S", "S"] as const;

/** Monday-first weekday for a date. */
export function weekdayOf(date: Date): Weekday {
  return ((date.getDay() + 6) % 7) as Weekday;
}

export function workoutForWeekday(plan: TrainingPlan, day: Weekday): PlanWorkout | null {
  return plan.workouts.find((w) => w.weekdays.includes(day)) ?? null;
}

export function formatScheme(p: PlannedExercise): string {
  const ex = getExercise(p.exerciseId);
  const reps = p.repsMin === p.repsMax ? `${p.repsMin}` : `${p.repsMin}–${p.repsMax}`;
  return ex?.load === "time" ? `${p.sets}×${reps}s` : `${p.sets}×${reps}`;
}
