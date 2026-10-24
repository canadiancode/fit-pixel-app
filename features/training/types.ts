/**
 * Training: questionnaire answers, the editable plan it generates, and the
 * workout sessions logged against it. Stored locally (lib/db/training).
 */

export type TrainingGoal = "muscle" | "strength" | "fatloss" | "fitness" | "endurance";
export type TrainingExperience = "new" | "intermediate" | "advanced";
export type TrainingEquipment = "gym" | "dumbbells" | "bodyweight";
export type TrainingFocus = "none" | "upper" | "lower" | "glutes" | "arms" | "core";

export type QuestAnswers = {
  goal: TrainingGoal;
  experience: TrainingExperience;
  daysPerWeek: 2 | 3 | 4 | 5 | 6;
  sessionMin: 30 | 45 | 60 | 75;
  equipment: TrainingEquipment;
  focus: TrainingFocus;
};

export type Muscle =
  | "chest" | "back" | "shoulders" | "biceps" | "triceps" | "forearms"
  | "quads" | "hamstrings" | "glutes" | "calves" | "core" | "cardio";

export type Equipment = "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "kettlebell";

export type Exercise = {
  id: string;
  name: string;
  muscles: Muscle[];
  equipment: Equipment;
  kind: "compound" | "isolation";
  /** One short form cue shown in workout mode. */
  cue: string;
  /** Bodyweight moves log reps only; timed moves (planks) log seconds as reps. */
  load: "weight" | "bodyweight" | "time";
};

/** One exercise as planned inside a workout. */
export type PlannedExercise = {
  /** Stable per-plan id so edits and reorders keep identity. */
  key: string;
  exerciseId: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSec: number;
};

/** Weekdays, Monday-first: 0 = Mon … 6 = Sun. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type PlanWorkout = {
  id: string;
  name: string;
  focus: string;
  weekdays: Weekday[];
  exercises: PlannedExercise[];
};

export type TrainingPlan = {
  v: 1;
  /** Template it came from, or "custom" for build-your-own. */
  programId: string;
  name: string;
  /** Questionnaire answers it was generated from (null for build-your-own). */
  answers: QuestAnswers | null;
  className: string | null;
  weeks: number | null;
  workouts: PlanWorkout[];
  createdAt: string;
  updatedAt: string;
};

/** A set inside a running or finished workout. */
export type SessionSet = {
  weight: number;
  reps: number;
  done: boolean;
  completedAt: string | null;
};

export type SessionExercise = {
  key: string;
  exerciseId: string;
  repsMin: number;
  repsMax: number;
  restSec: number;
  sets: SessionSet[];
};

export type WorkoutSession = {
  id: string;
  workoutId: string;
  workoutName: string;
  dayKey: string;
  unit: "lb" | "kg";
  startedAt: string;
  finishedAt: string | null;
  exercises: SessionExercise[];
  /** Index into exercises of the one on screen. */
  current: number;
  xpEarned: number;
};

export type PersonalRecord = {
  exerciseId: string;
  kind: "weight" | "reps";
  weight: number;
  reps: number;
  previous: { weight: number; reps: number } | null;
};

export type WorkoutSummary = {
  session: WorkoutSession;
  durationSec: number;
  setsDone: number;
  volume: number;
  records: PersonalRecord[];
};
