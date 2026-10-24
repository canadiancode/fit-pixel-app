import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { APP_SHELL_SECONDARY_BACKGROUND } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import {
  FIGURE_RECT,
  FigureLayers,
  isFigureLayer,
  resolveLayers,
} from "@/features/pixel/components/pixel-character";
import {
  PIXEL_FIGURE_IN_SCENE,
  PIXEL_SCENE_ASPECT_RATIO,
} from "@/features/pixel/figure-geometry";
import { usePixelLoadout } from "@/features/pixel/pixel-loadout-context";
import type { PixelLayerSpec } from "@/features/pixel/types";

import { useStreak, type StreakCelebration } from "../streak-context";
import {
  getPixelMove,
  getStreakCopy,
  getStreakTier,
  STREAK_TIER_COLORS,
  STREAK_TIER_NAMES,
  type PixelMove,
  type StreakTier,
} from "../streak-copy";
import { PixelFlame } from "./pixel-flame";

const CELL_HEADING_FONT_FAMILY = "PixeloidSans";

/* ---- Timeline (ms from open) ---- */
const T_CARD = 120;
const T_DROP = 380;
const DROP_MS = 340;
const T_LAND = T_DROP + DROP_MS;
const T_PROPS = T_LAND + 80;
const T_MOVE = T_LAND + 380;
const T_SLAM = T_LAND + 420;
const T_TEXT = T_SLAM + 260;
const T_BUTTON = T_TEXT + 380;
const T_FIREWORKS = [T_SLAM + 450, T_SLAM + 900, T_SLAM + 1400] as const;

/** Where things sit on the scene, as fractions (see figure-geometry.ts). */
const BOTTLE_ORIGIN = { x: 455 / 1484, y: 798 / 1060 };
const BAG_ORIGIN = { x: 1074 / 1484, y: 801 / 1060 };
const FEET = {
  x: PIXEL_FIGURE_IN_SCENE.left + PIXEL_FIGURE_IN_SCENE.width / 2,
  y: PIXEL_FIGURE_IN_SCENE.top + PIXEL_FIGURE_IN_SCENE.height,
};

const CONFETTI_COLORS = [
  "#FFD23F",
  "#FF8A1F",
  "#E8412C",
  "#5BD16B",
  "#4DA3FF",
  "#B57CFF",
  "#FFFFFF",
] as const;
const FIRE_COLORS = ["#FFD23F", "#FF8A1F", "#E8412C", "#FFF6C2"] as const;
const RAINBOW_RAYS = [
  "#FF5A5A",
  "#FFB02E",
  "#FFE680",
  "#5BD16B",
  "#4DA3FF",
  "#B57CFF",
] as const;

/** Particles per confetti burst, by tier. */
const CONFETTI_COUNT: Record<StreakTier, number> = {
  1: 14,
  2: 28,
  3: 44,
  4: 60,
  5: 80,
};

/**
 * The once-a-day streak takeover. Mount once inside the tab providers; it
 * opens whenever StreakProvider publishes a celebration.
 */
export function StreakCelebrationHost() {
  const { celebration, dismissCelebration } = useStreak();
  return (
    <Modal
      visible={celebration != null}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismissCelebration}
    >
      {celebration != null ? (
        <StreakCelebrationView
          key={celebration.id}
          celebration={celebration}
          onDone={dismissCelebration}
        />
      ) : null}
    </Modal>
  );
}

function StreakCelebrationView({
  celebration,
  onDone,
}: {
  celebration: StreakCelebration;
  onDone: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const { loadout } = usePixelLoadout();
  const { count, newBest } = celebration;
  const tier = getStreakTier(count);
  const move = getPixelMove(count, tier);
  const copy = getStreakCopy(count);
  const accent = STREAK_TIER_COLORS[tier];

  /* ---- Layout: fixed so particles know where to come from ---- */
  const cardWidth = Math.min(width - 48, 380);
  const cardHeight = cardWidth / PIXEL_SCENE_ASPECT_RATIO;
  const NUMBER_BLOCK = 148;
  const TEXT_BLOCK = 96;
  const BUTTON = 54;
  const total = NUMBER_BLOCK + 18 + cardHeight + 22 + TEXT_BLOCK + 18 + BUTTON;
  const top = Math.max(48, (height - total) / 2);
  const numberCenterY = top + NUMBER_BLOCK / 2 + 14;
  const cardTop = top + NUMBER_BLOCK + 18;
  const cardLeft = (width - cardWidth) / 2;
  const cardCenter = { x: width / 2, y: cardTop + cardHeight / 2 };
  const feetPoint = {
    x: cardLeft + FEET.x * cardWidth,
    y: cardTop + FEET.y * cardHeight,
  };

  /* ---- Shared values ---- */
  const backdrop = useSharedValue(0);
  const card = useSharedValue(0);
  const dolly = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const flash = useSharedValue(0);
  const figY = useSharedValue(-cardHeight * 1.2);
  const figScaleX = useSharedValue(1);
  const figScaleY = useSharedValue(1);
  const figRotY = useSharedValue(0);
  const figRot = useSharedValue(0);
  const breathe = useSharedValue(0);
  const bottleY = useSharedValue(0);
  const bottleRot = useSharedValue(0);
  const bottleGlow = useSharedValue(0);
  const bagY = useSharedValue(0);
  const numberIn = useSharedValue(0);
  const numberSlam = useSharedValue(0);
  const rays = useSharedValue(0);
  const raysSpin = useSharedValue(0);
  const ring = useSharedValue(0);
  const textIn = useSharedValue(0);
  const buttonIn = useSharedValue(0);

  const [shownCount, setShownCount] = useState(
    reduceMotion ? count : Math.max(0, count - 1),
  );
  const [ready, setReady] = useState(reduceMotion);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const at = (ms: number, fn: () => void) => {
      timers.current.push(setTimeout(fn, ms));
    };

    if (reduceMotion) {
      backdrop.value = withTiming(1, { duration: 200 });
      card.value = withTiming(1, { duration: 200 });
      dolly.value = 1;
      figY.value = 0;
      numberIn.value = withTiming(1, { duration: 200 });
      numberSlam.value = 1;
      textIn.value = withTiming(1, { duration: 200 });
      buttonIn.value = withTiming(1, { duration: 200 });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    const ease = Easing.bezier(0.2, 0.8, 0.2, 1);

    backdrop.value = withTiming(1, { duration: 260 });
    card.value = withDelay(T_CARD, withSpring(1, { damping: 13, stiffness: 160 }));
    dolly.value = withDelay(T_CARD, withTiming(1, { duration: 1700, easing: ease }));
    numberIn.value = withDelay(T_CARD + 60, withTiming(1, { duration: 320, easing: ease }));

    if (tier >= 3) {
      rays.value = withDelay(T_CARD, withTiming(1, { duration: 700 }));
      raysSpin.value = withRepeat(
        withTiming(1, { duration: tier >= 5 ? 9000 : 16000, easing: Easing.linear }),
        -1,
      );
    }

    // The Pixel falls into the scene and lands with a squash.
    figY.value = withDelay(
      T_DROP,
      withTiming(0, { duration: DROP_MS, easing: Easing.in(Easing.quad) }),
    );
    figScaleY.value = withDelay(
      T_DROP,
      withSequence(
        withTiming(1.12, { duration: DROP_MS * 0.6 }),
        withTiming(1.08, { duration: DROP_MS * 0.4 }),
        withTiming(0.72, { duration: 70 }),
        withSpring(1, { damping: 7, stiffness: 260 }),
      ),
    );
    figScaleX.value = withDelay(
      T_DROP,
      withSequence(
        withTiming(0.9, { duration: DROP_MS }),
        withTiming(1.24, { duration: 70 }),
        withSpring(1, { damping: 7, stiffness: 260 }),
      ),
    );

    at(T_LAND, () => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setBursts((b) => [...b, dustBurst(feetPoint, cardWidth)]);
      if (tier >= 3) shake(shakeX, 5);
    });

    // Props react to the landing: the bottle tosses, the bag hops.
    bottleY.value = withDelay(
      T_PROPS,
      tier >= 2
        ? withSequence(
            withTiming(-cardHeight * 0.42, { duration: 360, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 360, easing: Easing.in(Easing.quad) }),
            withTiming(-6, { duration: 90 }),
            withTiming(0, { duration: 110 }),
          )
        : withSequence(
            withTiming(-cardHeight * 0.08, { duration: 160 }),
            withTiming(0, { duration: 180 }),
          ),
    );
    if (tier >= 2) {
      bottleRot.value = withDelay(
        T_PROPS,
        withTiming(tier >= 4 ? 720 : 360, { duration: 720, easing: Easing.inOut(Easing.quad) }),
      );
    }
    bottleGlow.value = withDelay(
      T_PROPS,
      withSequence(withTiming(1, { duration: 300 }), withDelay(900, withTiming(tier >= 3 ? 0.55 : 0, { duration: 600 }))),
    );
    bagY.value = withDelay(
      T_PROPS + 90,
      withSequence(
        withTiming(-cardHeight * 0.07, { duration: 140, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 160, easing: Easing.in(Easing.quad) }),
        ...(tier >= 3
          ? [
              withTiming(-cardHeight * 0.05, { duration: 120 }),
              withTiming(0, { duration: 140 }),
            ]
          : []),
      ),
    );

    playMove(move, {
      figY,
      figScaleX,
      figScaleY,
      figRotY,
      figRot,
      cardHeight,
    });

    // The counter ticks over with a slam.
    at(T_SLAM, () => {
      setShownCount(count);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const origin = { x: width / 2, y: numberCenterY };
      setBursts((b) => [
        ...b,
        confettiBurst(origin, CONFETTI_COUNT[tier], tier),
        ...(tier >= 2 ? [emberBurst(origin, tier)] : []),
      ]);
      if (tier >= 3) shake(shakeX, tier >= 5 ? 10 : 7);
    });
    numberSlam.value = withDelay(
      T_SLAM,
      withSequence(
        withTiming(1.9, { duration: 90, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 8, stiffness: 220 }),
      ),
    );
    if (tier >= 3) {
      ring.value = withDelay(T_SLAM, withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) }));
    }
    if (tier >= 4) {
      flash.value = withDelay(
        T_SLAM,
        withSequence(withTiming(0.55, { duration: 70 }), withTiming(0, { duration: 420 })),
      );
    }
    if (tier >= 3) {
      at(T_SLAM + 160, () => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      });
    }

    // Fireworks over the scene from Inferno up; Legend gets all three.
    if (tier >= 4) {
      T_FIREWORKS.slice(0, tier >= 5 ? 3 : 2).forEach((ms, i) => {
        at(ms, () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
          const x = cardLeft + cardWidth * [0.2, 0.8, 0.5][i];
          const y = cardTop - 10 + [0, 30, -20][i];
          setBursts((b) => [...b, fireworkBurst({ x, y }, i)]);
        });
      });
    }

    textIn.value = withDelay(T_TEXT, withTiming(1, { duration: 420, easing: ease }));
    buttonIn.value = withDelay(T_BUTTON, withTiming(1, { duration: 360, easing: ease }));
    at(T_BUTTON, () => setReady(true));

    // Settle into a breathing idle once the show is over.
    breathe.value = withDelay(
      T_MOVE + 900,
      withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }), -1, true),
    );

    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
    };
    // One timeline per mount (the host keys the view by celebration id).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const layers = useMemo(() => resolveLayers(loadout), [loadout]);
  const byId = (id: PixelLayerSpec["id"]) => layers.find((l) => l.id === id);
  const background = byId("background");
  const bottle = byId("item_left");
  const bag = byId("item_right");
  const figureLayers = layers.filter((l) => isFigureLayer(l.id));

  /* ---- Animated styles ---- */
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, card.value * 1.4),
    transform: [
      { translateX: shakeX.value },
      { translateY: interpolate(card.value, [0, 1], [60, 0]) },
      { scale: interpolate(card.value, [0, 1], [0.55, 1]) },
      { rotate: `${interpolate(card.value, [0, 1], [-7, 0])}deg` },
    ],
  }));
  const dollyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(dolly.value, [0, 1], [1.3, 1]) }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const figureStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 600 },
      { translateY: figY.value },
      { rotateY: `${figRotY.value}deg` },
      { rotate: `${figRot.value}deg` },
      { scaleX: figScaleX.value * (1 - breathe.value * 0.012) },
      { scaleY: figScaleY.value * (1 + breathe.value * 0.022) },
    ],
  }));
  const shadowStyle = useAnimatedStyle(() => {
    const lift = Math.min(1, Math.max(0, -figY.value / (cardHeight * 0.6)));
    return {
      opacity: 0.45 * (1 - lift * 0.7),
      transform: [{ scaleX: 1 - lift * 0.55 }, { scaleY: 1 - lift * 0.55 }],
    };
  });
  const bottleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bottleY.value }, { rotate: `${bottleRot.value}deg` }],
  }));
  const bottleGlowStyle = useAnimatedStyle(() => ({
    opacity: bottleGlow.value,
    transform: [
      { translateY: bottleY.value },
      { scale: 0.8 + bottleGlow.value * 0.35 },
    ],
  }));
  const bagStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bagY.value }],
  }));
  const numberBlockStyle = useAnimatedStyle(() => ({
    opacity: numberIn.value,
    transform: [
      { translateX: shakeX.value * 0.6 },
      { translateY: interpolate(numberIn.value, [0, 1], [-24, 0]) },
    ],
  }));
  const numberStyle = useAnimatedStyle(() => ({
    transform: [{ scale: numberSlam.value === 0 ? 1 : numberSlam.value }],
  }));
  const raysStyle = useAnimatedStyle(() => ({
    opacity: rays.value * (tier >= 5 ? 0.9 : 0.65),
    transform: [{ rotate: `${raysSpin.value * 360}deg` }, { scale: 0.7 + rays.value * 0.3 }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.value === 0 ? 0 : 1 - ring.value,
    transform: [{ scale: 0.2 + ring.value * 3.2 }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: textIn.value,
    transform: [{ translateY: interpolate(textIn.value, [0, 1], [16, 0]) }],
  }));
  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonIn.value,
    transform: [{ scale: interpolate(buttonIn.value, [0, 1], [0.85, 1]) }],
  }));

  const raySize = Math.max(width, height) * 1.25;

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          disabled={!ready}
          onPress={onDone}
          accessibilityLabel="Close"
        />
      </Animated.View>

      {tier >= 3 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.rays,
            {
              width: raySize,
              height: raySize,
              left: cardCenter.x - raySize / 2,
              top: cardCenter.y - raySize / 2,
            },
            raysStyle,
          ]}
        >
          <GodRays size={raySize} tier={tier} accent={accent} />
        </Animated.View>
      ) : null}

      {tier >= 5 ? <PixelRain width={width} height={height} /> : null}

      {/* Flame + counter */}
      <Animated.View
        pointerEvents="none"
        style={[styles.numberBlock, { top, height: NUMBER_BLOCK }, numberBlockStyle]}
      >
        <PixelFlame pixel={tier >= 3 ? 7 : 6} palette={tier >= 5 ? "gold" : "lit"} />
        <Animated.View style={numberStyle}>
          <Text style={[styles.number, { color: accent, textShadowColor: tier >= 3 ? "#FF8A1F" : "#000" }]}>
            {shownCount}
          </Text>
        </Animated.View>
        <Text style={styles.numberCaption}>DAY STREAK</Text>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            borderColor: accent,
            left: width / 2 - 60,
            top: numberCenterY - 60,
          },
          ringStyle,
        ]}
      />

      {/* The scene card: background, Pixel and props */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.card,
          {
            left: cardLeft,
            top: cardTop,
            width: cardWidth,
            height: cardHeight,
            borderColor: tier >= 3 ? accent : "rgba(255,255,255,0.85)",
            shadowColor: tier >= 3 ? accent : "#4DA3FF",
          },
          cardStyle,
        ]}
      >
        <View style={styles.cardClip}>
          <Animated.View style={[StyleSheet.absoluteFill, dollyStyle]}>
            {background != null ? (
              <Image source={background.source} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : null}
          </Animated.View>
          <Animated.View
            style={[
              styles.shadow,
              {
                width: cardWidth * 0.17,
                height: cardWidth * 0.035,
                left: FEET.x * cardWidth - (cardWidth * 0.17) / 2,
                top: FEET.y * cardHeight - cardWidth * 0.035,
              },
              shadowStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.figure,
              FIGURE_RECT,
              { transformOrigin: "50% 100%" },
              figureStyle,
            ]}
          >
            <FigureLayers layers={figureLayers} />
          </Animated.View>
          <Animated.View
            style={[
              styles.glow,
              {
                width: cardWidth * 0.2,
                height: cardWidth * 0.2,
                left: BOTTLE_ORIGIN.x * cardWidth - cardWidth * 0.1,
                top: BOTTLE_ORIGIN.y * cardHeight - cardWidth * 0.1,
              },
              bottleGlowStyle,
            ]}
          />
          {bottle != null ? (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                styles.item,
                { transformOrigin: [BOTTLE_ORIGIN.x * cardWidth, BOTTLE_ORIGIN.y * cardHeight, 0] },
                bottleStyle,
              ]}
            >
              <Image source={bottle.source} style={StyleSheet.absoluteFill} contentFit="cover" />
            </Animated.View>
          ) : null}
          {bag != null ? (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                styles.item,
                { transformOrigin: [BAG_ORIGIN.x * cardWidth, BAG_ORIGIN.y * cardHeight, 0] },
                bagStyle,
              ]}
            >
              <Image source={bag.source} style={StyleSheet.absoluteFill} contentFit="cover" />
            </Animated.View>
          ) : null}
          <Animated.View style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />
        </View>
        <View style={[styles.tierChip, { backgroundColor: tier >= 3 ? accent : "#FFFFFF" }]}>
          <Text style={styles.tierChipText}>{STREAK_TIER_NAMES[tier]}</Text>
        </View>
      </Animated.View>

      {/* Headline, line, button */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.textBlock,
          { top: cardTop + cardHeight + 22, height: TEXT_BLOCK },
          textStyle,
        ]}
      >
        {newBest ? <Text style={styles.best}>NEW PERSONAL BEST!</Text> : null}
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={[styles.title, { color: accent }]}
          accessibilityRole="header"
        >
          {copy.title}
        </Text>
        <Text style={styles.line}>{copy.line}</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.buttonWrap,
          { top: cardTop + cardHeight + 22 + TEXT_BLOCK + 18 },
          buttonStyle,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Keep it going"
          disabled={!ready}
          onPress={onDone}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>KEEP IT GOING</Text>
        </Pressable>
      </Animated.View>

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {bursts.map((burst) =>
          burst.particles.map((p, i) => <Particle key={`${burst.id}-${i}`} spec={p} />),
        )}
      </View>
    </View>
  );
}

/* ---- Pixel moves ---- */

function playMove(
  move: PixelMove,
  v: {
    figY: SharedValue<number>;
    figScaleX: SharedValue<number>;
    figScaleY: SharedValue<number>;
    figRotY: SharedValue<number>;
    figRot: SharedValue<number>;
    cardHeight: number;
  },
) {
  const h = v.cardHeight;
  const up = (dy: number, ms: number) =>
    withTiming(-dy, { duration: ms, easing: Easing.out(Easing.quad) });
  const down = (ms: number) =>
    withTiming(0, { duration: ms, easing: Easing.in(Easing.quad) });
  const squash = () =>
    withSequence(withTiming(0.8, { duration: 70 }), withSpring(1, { damping: 8, stiffness: 300 }));
  const squashX = () =>
    withSequence(withTiming(1.18, { duration: 70 }), withSpring(1, { damping: 8, stiffness: 300 }));

  switch (move) {
    case "hop":
      v.figY.value = withDelay(T_MOVE, withSequence(up(h * 0.16, 200), down(190)));
      break;
    case "flex":
      // Two power-up pulses: crouch, then stretch tall.
      v.figScaleY.value = withDelay(
        T_MOVE,
        withSequence(
          withTiming(0.86, { duration: 120 }),
          withTiming(1.14, { duration: 140 }),
          withTiming(0.9, { duration: 110 }),
          withTiming(1.12, { duration: 130 }),
          withSpring(1, { damping: 9, stiffness: 240 }),
        ),
      );
      v.figScaleX.value = withDelay(
        T_MOVE,
        withSequence(
          withTiming(1.12, { duration: 120 }),
          withTiming(0.92, { duration: 140 }),
          withTiming(1.08, { duration: 110 }),
          withTiming(0.94, { duration: 130 }),
          withSpring(1, { damping: 9, stiffness: 240 }),
        ),
      );
      break;
    case "spin":
      v.figY.value = withDelay(T_MOVE, withSequence(up(h * 0.2, 260), down(240)));
      v.figRotY.value = withDelay(
        T_MOVE,
        withTiming(360, { duration: 500, easing: Easing.inOut(Easing.cubic) }),
      );
      v.figScaleY.value = withDelay(T_MOVE + 500, squash());
      v.figScaleX.value = withDelay(T_MOVE + 500, squashX());
      break;
    case "flip":
      // Double jump: a small hop, then a big front flip.
      v.figY.value = withDelay(
        T_MOVE,
        withSequence(up(h * 0.12, 170), down(150), up(h * 0.42, 330), down(300)),
      );
      v.figRot.value = withDelay(
        T_MOVE + 320,
        withTiming(360, { duration: 620, easing: Easing.inOut(Easing.quad) }),
      );
      v.figScaleY.value = withDelay(
        T_MOVE + 320,
        withSequence(withTiming(0.82, { duration: 60 }), withTiming(1, { duration: 120 }), withDelay(450, squash())),
      );
      v.figScaleX.value = withDelay(T_MOVE + 950, squashX());
      break;
  }
}

function shake(value: SharedValue<number>, amount: number) {
  value.value = withSequence(
    withTiming(amount, { duration: 40 }),
    withTiming(-amount, { duration: 50 }),
    withTiming(amount * 0.6, { duration: 50 }),
    withTiming(-amount * 0.4, { duration: 50 }),
    withTiming(0, { duration: 60 }),
  );
}

/* ---- Particles ---- */

type ParticleSpec = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  spin: number;
  /** Long thin streak instead of a square. */
  streak?: boolean;
};

type Burst = { id: number; particles: ParticleSpec[] };

let nextBurstId = 1;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function confettiBurst(origin: { x: number; y: number }, count: number, tier: StreakTier): Burst {
  const speed = 260 + tier * 70;
  return {
    id: nextBurstId++,
    particles: Array.from({ length: count }, () => {
      const angle = rand(-Math.PI, 0) + rand(-0.35, 0.35);
      const v = rand(speed * 0.45, speed);
      return {
        x: origin.x,
        y: origin.y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - 120,
        gravity: 900,
        size: rand(5, 10),
        color: pick(CONFETTI_COLORS),
        delay: rand(0, 60),
        duration: rand(1300, 2100),
        spin: rand(-720, 720),
      };
    }),
  };
}

function emberBurst(origin: { x: number; y: number }, tier: StreakTier): Burst {
  return {
    id: nextBurstId++,
    particles: Array.from({ length: 10 + tier * 4 }, (_, i) => {
      const angle = (i / (10 + tier * 4)) * Math.PI * 2;
      const v = rand(160, 260);
      return {
        x: origin.x,
        y: origin.y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        gravity: -60,
        size: rand(3, 5),
        color: pick(FIRE_COLORS),
        delay: 0,
        duration: rand(520, 760),
        spin: 0,
        streak: true,
      };
    }),
  };
}

function dustBurst(feet: { x: number; y: number }, cardWidth: number): Burst {
  return {
    id: nextBurstId++,
    particles: Array.from({ length: 10 }, (_, i) => {
      const dir = i % 2 === 0 ? 1 : -1;
      return {
        x: feet.x + dir * cardWidth * 0.03,
        y: feet.y - 2,
        vx: dir * rand(40, 120),
        vy: rand(-70, -20),
        gravity: 140,
        size: rand(4, 7),
        color: pick(["#FFFFFF", "#E8EDF5", "#C9D3E0"] as const),
        delay: 0,
        duration: rand(420, 620),
        spin: 0,
      };
    }),
  };
}

function fireworkBurst(origin: { x: number; y: number }, index: number): Burst {
  const palette = [
    ["#FFD23F", "#FFF6C2"],
    ["#4DA3FF", "#B9E0FF"],
    ["#B57CFF", "#FFB3F0"],
  ][index % 3];
  return {
    id: nextBurstId++,
    particles: Array.from({ length: 26 }, (_, i) => {
      const angle = (i / 26) * Math.PI * 2 + rand(-0.08, 0.08);
      const v = rand(150, 210);
      return {
        x: origin.x,
        y: origin.y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        gravity: 160,
        size: rand(3, 5),
        color: pick(palette),
        delay: 0,
        duration: rand(800, 1050),
        spin: 0,
        streak: true,
      };
    }),
  };
}

const Particle = memo(function Particle({ spec }: { spec: ParticleSpec }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(spec.delay, withTiming(1, { duration: spec.duration, easing: Easing.linear }));
  }, [spec, t]);

  const style = useAnimatedStyle(() => {
    const s = (t.value * spec.duration) / 1000;
    const x = spec.vx * s;
    const y = spec.vy * s + 0.5 * spec.gravity * s * s;
    const opacity = t.value === 0 ? 0 : t.value < 0.65 ? 1 : (1 - t.value) / 0.35;
    const heading = spec.streak
      ? (Math.atan2(spec.vy + spec.gravity * s, spec.vx) * 180) / Math.PI
      : spec.spin * s;
    return {
      opacity,
      transform: [{ translateX: x }, { translateY: y }, { rotate: `${heading}deg` }],
    };
  });

  const w = spec.streak ? spec.size * 3.2 : spec.size;
  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: spec.x - w / 2,
          top: spec.y - spec.size / 2,
          width: w,
          height: spec.size,
          backgroundColor: spec.color,
        },
        style,
      ]}
    />
  );
});

/* ---- Light rays and Legend-tier rain ---- */

function GodRays({ size, tier, accent }: { size: number; tier: StreakTier; accent: string }) {
  const count = tier >= 5 ? 18 : 12;
  const half = size / 2;
  const base = Math.tan(Math.PI / count / 1.6) * half;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${(360 / count) * i}deg` }] }]}
        >
          <View
            style={{
              position: "absolute",
              left: half - base,
              top: 0,
              width: 0,
              height: 0,
              borderLeftWidth: base,
              borderRightWidth: base,
              borderTopWidth: half,
              borderLeftColor: "transparent",
              borderRightColor: "transparent",
              borderTopColor:
                tier >= 5
                  ? `${RAINBOW_RAYS[i % RAINBOW_RAYS.length]}33`
                  : i % 2 === 0
                    ? `${accent}30`
                    : `${accent}14`,
            }}
          />
        </View>
      ))}
    </>
  );
}

function PixelRain({ width, height }: { width: number; height: number }) {
  const drops = useMemo(
    () =>
      Array.from({ length: 26 }, () => ({
        x: rand(0, width),
        size: rand(3, 6),
        delay: rand(0, 2400),
        duration: rand(2200, 3600),
        color: pick(["#FFD23F", "#FFF1A6", "#FFFFFF"] as const),
      })),
    [width],
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {drops.map((drop, i) => (
        <RainDrop key={i} drop={drop} height={height} />
      ))}
    </View>
  );
}

function RainDrop({
  drop,
  height,
}: {
  drop: { x: number; size: number; delay: number; duration: number; color: string };
  height: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      drop.delay + 600,
      withRepeat(withTiming(1, { duration: drop.duration, easing: Easing.linear }), -1),
    );
  }, [drop, t]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : 0.7,
    transform: [{ translateY: -20 + t.value * (height + 40) }],
  }));
  return (
    <Animated.View
      style={[
        styles.particle,
        { left: drop.x, top: 0, width: drop.size, height: drop.size, backgroundColor: drop.color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(1, 10, 26, 0.94)",
  },
  rays: {
    position: "absolute",
  },
  numberBlock: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  number: {
    fontFamily: FONT_FAMILY,
    fontSize: 44,
    lineHeight: 52,
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  numberCaption: {
    fontFamily: CELL_HEADING_FONT_FAMILY,
    fontSize: 13,
    letterSpacing: 3,
    color: "rgba(255,255,255,0.8)",
  },
  ring: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
  },
  card: {
    position: "absolute",
    borderRadius: 14,
    borderWidth: 3,
    shadowOpacity: 0.8,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
  },
  cardClip: {
    flex: 1,
    borderRadius: 11,
    overflow: "hidden",
  },
  figure: {
    position: "absolute",
    zIndex: 5,
  },
  item: {
    zIndex: 10,
  },
  shadow: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#000",
    zIndex: 4,
  },
  glow: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(127, 231, 255, 0.18)",
    shadowColor: "#7FE7FF",
    shadowOpacity: 1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    zIndex: 9,
  },
  flash: {
    backgroundColor: "#FFFFFF",
    zIndex: 20,
  },
  tierChip: {
    position: "absolute",
    top: -12,
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#02284f",
  },
  tierChipText: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 11,
    color: "#02284f",
  },
  textBlock: {
    position: "absolute",
    left: 24,
    right: 24,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
  },
  best: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 12,
    color: "#5BD16B",
  },
  title: {
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    lineHeight: 24,
    textAlign: "center",
  },
  line: {
    fontFamily: CELL_HEADING_FONT_FAMILY,
    fontSize: 15,
    lineHeight: 20,
    color: "rgba(255,255,255,0.88)",
    textAlign: "center",
  },
  buttonWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  button: {
    backgroundColor: "#FFD23F",
    paddingHorizontal: 26,
    paddingVertical: 15,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: "#02284f",
    shadowColor: "#000",
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 4, height: 4 },
  },
  buttonPressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
    shadowOffset: { width: 2, height: 2 },
  },
  buttonText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 15,
    color: "#02284f",
  },
  particle: {
    position: "absolute",
  },
});
