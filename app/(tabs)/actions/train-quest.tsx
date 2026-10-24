import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ActionsSubScreenLayout } from "@/features/actions/components/actions-sub-screen-layout";
import { PixelCharacter } from "@/features/pixel/components/pixel-character";
import { usePixelLoadout } from "@/features/pixel/pixel-loadout-context";
import {
  Badge,
  BodyText,
  PixelButton,
  PixelCard,
  PixelText,
  ProgressSegments,
  T,
  tapHaptic,
} from "@/features/training/components/pixel-ui";
import { CLASS_FOR_GOAL, formatScheme, generatePlan, WEEKDAY_SHORT } from "@/features/training/programs";
import { exerciseName } from "@/features/training/exercises";
import { useTraining } from "@/features/training/training-context";
import type { QuestAnswers } from "@/features/training/types";

type Option<V> = { value: V; title: string; desc?: string; icon?: number; badge?: string };
type Step = { key: keyof QuestAnswers; question: string; hint: string; options: Option<QuestAnswers[keyof QuestAnswers]>[] };

const ICONS = {
  dumbbell: require("@/assets/icons/dumbbell.png"),
  lightning: require("@/assets/icons/lightning.png"),
  fire: require("@/assets/icons/fire.png"),
  heart: require("@/assets/icons/heart.png"),
  map: require("@/assets/icons/map.png"),
  star: require("@/assets/icons/star.png"),
  moon: require("@/assets/icons/purple-moon.png"),
  character: require("@/assets/icons/character.png"),
  world: require("@/assets/icons/world.png"),
};

const STEPS: Step[] = [
  {
    key: "goal",
    question: "What are you training for?",
    hint: "We'll build a plan around it. You can change it any time.",
    options: [
      { value: "muscle", title: "Build muscle", desc: "Bigger, more defined muscles", icon: ICONS.dumbbell, badge: "TITAN" },
      { value: "strength", title: "Get stronger", desc: "Lift heavier on the big lifts", icon: ICONS.lightning, badge: "WARRIOR" },
      { value: "fatloss", title: "Lose fat", desc: "Burn fat and keep your muscle", icon: ICONS.fire, badge: "RANGER" },
      { value: "fitness", title: "General fitness", desc: "Feel good, move well, stay consistent", icon: ICONS.heart, badge: "ADVENTURER" },
      { value: "endurance", title: "Endurance", desc: "Run, row and ride further", icon: ICONS.map, badge: "SCOUT" },
    ],
  },
  {
    key: "experience",
    question: "How long have you been training?",
    hint: "Be honest: it sets how many sets you start with.",
    options: [
      { value: "new", title: "New to lifting", desc: "Less than 6 months" },
      { value: "intermediate", title: "Getting there", desc: "6+ months, comfortable with the main lifts" },
      { value: "advanced", title: "Seasoned", desc: "2+ years of steady training" },
    ],
  },
  {
    key: "daysPerWeek",
    question: "How many days a week can you train?",
    hint: "Pick what you can keep up. Rest days count too.",
    options: [2, 3, 4, 5, 6].map((d) => ({ value: d as QuestAnswers["daysPerWeek"], title: `${d} days`, desc: d <= 3 ? "Full body sessions" : d === 4 ? "Upper / lower split" : "Push / pull / legs" })),
  },
  {
    key: "sessionMin",
    question: "How long is a workout?",
    hint: "Longer sessions get more exercises.",
    options: [
      { value: 30, title: "30 minutes", desc: "Quick and focused" },
      { value: 45, title: "45 minutes", desc: "The sweet spot for most" },
      { value: 60, title: "60 minutes", desc: "Room for extra work" },
      { value: 75, title: "75+ minutes", desc: "The full session" },
    ],
  },
  {
    key: "equipment",
    question: "Where do you train?",
    hint: "We'll only pick exercises you can do there.",
    options: [
      { value: "gym", title: "Full gym", desc: "Barbells, machines, cables", icon: ICONS.dumbbell },
      { value: "dumbbells", title: "Dumbbells only", desc: "Home gym or a few pairs", icon: ICONS.star },
      { value: "bodyweight", title: "Bodyweight", desc: "Home, park, hotel room", icon: ICONS.character },
    ],
  },
  {
    key: "focus",
    question: "Anything to focus on?",
    hint: "Optional. We'll add extra work for it.",
    options: [
      { value: "none", title: "Balanced", desc: "No extra focus" },
      { value: "upper", title: "Upper body", desc: "Chest, back and shoulders" },
      { value: "lower", title: "Lower body", desc: "Quads and hamstrings" },
      { value: "glutes", title: "Glutes", desc: "Hip thrusts and bridges" },
      { value: "arms", title: "Arms", desc: "Extra curls and presses" },
      { value: "core", title: "Core", desc: "Planks, crunches and anti-rotation" },
    ],
  },
];

export default function TrainQuestScreen() {
  const router = useRouter();
  const { plan, savePlan } = useTraining();
  const { loadout } = usePixelLoadout();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuestAnswers>>(plan?.answers ?? {});
  const [saving, setSaving] = useState(false);

  const done = step >= STEPS.length;
  const preview = useMemo(() => (done ? generatePlan(answers as QuestAnswers) : null), [done, answers]);

  if (done && preview) {
    const a = answers as QuestAnswers;
    const chips = [
      STEPS[0].options.find((o) => o.value === a.goal)?.title,
      STEPS[1].options.find((o) => o.value === a.experience)?.title,
      `${a.daysPerWeek} days`,
      `${a.sessionMin === 75 ? "75+" : a.sessionMin} min`,
      STEPS[4].options.find((o) => o.value === a.equipment)?.title,
      a.focus !== "none" ? `${STEPS[5].options.find((o) => o.value === a.focus)?.title} focus` : null,
    ].filter(Boolean) as string[];
    return (
      <ActionsSubScreenLayout scrollResetKey="result">
        <View style={styles.wrap}>
          <View style={styles.hero}>
            <PixelCharacter loadout={loadout} style={StyleSheet.absoluteFill} accessibilityLabel="Your Pixel" />
            <View style={styles.heroShade} />
            <View style={styles.heroText}>
              <PixelText size={9} color={T.cyan}>YOUR CLASS</PixelText>
              <PixelText size={30} color={T.yellow} style={styles.classText}>
                {CLASS_FOR_GOAL[a.goal].toUpperCase()}
              </PixelText>
            </View>
          </View>

          <View style={styles.chips}>
            {chips.map((c) => (
              <View key={c} style={styles.chip}>
                <BodyText size={12} color="#cfe0ff">{c}</BodyText>
              </View>
            ))}
          </View>

          <PixelCard active>
            <View style={styles.rowBetween}>
              <PixelText size={11}>{preview.name.toUpperCase()}</PixelText>
              <PixelText size={7} color={T.muted}>{preview.weeks} WEEKS</PixelText>
            </View>
            <BodyText>
              {a.daysPerWeek} workouts a week, about {a.sessionMin === 75 ? "75+" : a.sessionMin} minutes each. It&apos;s a starting point: you can change any exercise, set or day.
            </BodyText>
            {preview.workouts.map((w) => (
              <View key={w.id} style={styles.dayRow}>
                <View style={styles.dayTags}>
                  {w.weekdays.length > 0 ? (
                    w.weekdays.map((d) => <Badge key={d} label={WEEKDAY_SHORT[d]} color={T.cyan} />)
                  ) : (
                    <Badge label="EXTRA" color={T.muted} />
                  )}
                </View>
                <View style={styles.flex}>
                  <PixelText size={9}>{w.name}</PixelText>
                  <BodyText size={12} numberOfLines={2}>
                    {w.exercises.slice(0, 3).map((e) => `${exerciseName(e.exerciseId)} ${formatScheme(e)}`).join(" · ")}
                    {w.exercises.length > 3 ? ` +${w.exercises.length - 3} more` : ""}
                  </BodyText>
                </View>
              </View>
            ))}
          </PixelCard>

          <View style={styles.reward}>
            <Image source={ICONS.star} style={styles.rewardIcon} contentFit="contain" />
            <BodyText color={T.yellow} style={styles.flex}>Every set you finish earns XP. Show up, level up.</BodyText>
          </View>

          {plan ? <BodyText size={12} style={styles.center}>This replaces your current plan. Your workout history stays.</BodyText> : null}

          <PixelButton
            label={plan ? "USE THIS PLAN" : "START WEEK 1"}
            disabled={saving}
            onPress={async () => {
              setSaving(true);
              try {
                await savePlan(preview);
                router.back();
              } finally {
                setSaving(false);
              }
            }}
          />
          <PixelButton label="Change my answers" variant="blue" size="md" onPress={() => setStep(0)} />
        </View>
      </ActionsSubScreenLayout>
    );
  }

  const current = STEPS[step];
  const selected = answers[current.key];
  return (
    <ActionsSubScreenLayout scrollResetKey={step}>
      <View style={styles.wrap}>
        <View style={styles.stepHeader}>
          <PixelText size={8} color={T.muted}>STEP {step + 1} OF {STEPS.length}</PixelText>
          <ProgressSegments total={STEPS.length} done={step} current={step} />
        </View>
        <View style={styles.questionBlock}>
          <PixelText size={9} color={T.cyan}>CHOOSE YOUR QUEST</PixelText>
          <PixelText size={16} style={styles.question}>{current.question}</PixelText>
          <BodyText size={14} color="#cfe0ff">{current.hint}</BodyText>
        </View>

        <View style={styles.options}>
          {current.options.map((o) => {
            const on = selected === o.value;
            return (
              <Pressable
                key={String(o.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${o.title}. ${o.desc ?? ""}`}
                onPress={() => {
                  tapHaptic();
                  setAnswers((prev) => ({ ...prev, [current.key]: o.value }));
                }}
                style={[styles.option, on && styles.optionOn]}
              >
                {o.icon ? <Image source={o.icon} style={styles.optionIcon} contentFit="contain" /> : null}
                <View style={styles.flex}>
                  <View style={styles.optionTitleRow}>
                    <PixelText size={10}>{o.title}</PixelText>
                    {o.badge ? <Badge label={o.badge} /> : null}
                  </View>
                  {o.desc ? <BodyText size={12}>{o.desc}</BodyText> : null}
                </View>
                {on ? (
                  <View style={styles.check}>
                    <PixelText size={10} color={T.black}>✓</PixelText>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <PixelButton label="CONTINUE" disabled={selected == null} onPress={() => setStep((s) => s + 1)} />
        {step > 0 ? (
          <PixelButton label="Previous question" variant="blue" size="md" onPress={() => setStep((s) => s - 1)} />
        ) : null}
      </View>
    </ActionsSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16, paddingBottom: 24 },
  flex: { flex: 1, minWidth: 0, gap: 4 },
  center: { textAlign: "center" },
  stepHeader: { gap: 8 },
  questionBlock: { gap: 10 },
  question: { lineHeight: 26, textShadowColor: T.black, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 },
  options: { gap: 10 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 64,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: T.card,
    borderWidth: 4,
    borderColor: T.border,
  },
  optionOn: { backgroundColor: T.cardActive, borderColor: T.lime },
  optionIcon: { width: 36, height: 36 },
  optionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  check: { width: 26, height: 26, backgroundColor: T.lime, borderWidth: 3, borderColor: T.black, alignItems: "center", justifyContent: "center" },
  hero: { height: 230, borderRadius: 14, overflow: "hidden", borderWidth: 3, borderColor: T.border, backgroundColor: T.deep },
  heroShade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 90, backgroundColor: "rgba(2,40,79,0.78)" },
  heroText: { position: "absolute", left: 0, right: 0, bottom: 12, alignItems: "center", gap: 6 },
  classText: { lineHeight: 40, textShadowColor: T.black, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  chip: { backgroundColor: T.card, borderWidth: 2, borderColor: T.border, paddingHorizontal: 8, paddingVertical: 3 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  dayRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: T.deep, borderWidth: 2, borderColor: T.borderSoft, borderRadius: 8, padding: 9 },
  dayTags: { gap: 4, minWidth: 40 },
  reward: { flexDirection: "row", alignItems: "center", gap: 10 },
  rewardIcon: { width: 22, height: 22 },
});
