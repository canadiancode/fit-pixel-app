import { Image, type ImageSource } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  Image as NativeImage,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { completeLoadout, DEFAULT_PIXEL_LOADOUT } from "../default-loadout";
import {
  cameraForFocus,
  coverSceneRect,
  PIXEL_CAMERA_REST,
  PIXEL_FIGURE_IN_SCENE,
  pixelFocusInFrame,
  rectThroughCamera,
  type FrameRect,
} from "../figure-geometry";
import { getPixelItemSource } from "../layer-assets";
import {
  PIXEL_LAYER_Z_INDEX,
  type PixelLayerId,
  type PixelLoadout,
} from "../types";
import {
  FIGURE_RECT,
  FigureLayers,
  isFigureLayer,
  resolveLayers,
} from "./pixel-character";

/**
 * Where each layer sits, so the sparkle burst comes from the part of the
 * Pixel that changed: character parts as fractions of the character canvas,
 * held items as fractions of the scene.
 */
const LAYER_SPARKLE_ORIGIN: Record<
  Exclude<PixelLayerId, "background">,
  { x: number; y: number }
> = {
  hair: { x: 0.5, y: 0.1 },
  eyes: { x: 0.5, y: 0.16 },
  nose: { x: 0.5, y: 0.18 },
  mouth: { x: 0.5, y: 0.2 },
  skin: { x: 0.5, y: 0.45 },
  top: { x: 0.5, y: 0.36 },
  bottom: { x: 0.5, y: 0.62 },
  shoes: { x: 0.5, y: 0.92 },
  item_left: { x: 0.306, y: 0.785 },
  item_right: { x: 0.722, y: 0.756 },
};

/** A sparkle origin in frame pixels, given the scene's cover rect. */
function sparklePoint(
  layerId: Exclude<PixelLayerId, "background">,
  scene: { left: number; top: number; width: number; height: number },
) {
  const origin = LAYER_SPARKLE_ORIGIN[layerId];
  const inScene = isFigureLayer(layerId)
    ? {
        x: PIXEL_FIGURE_IN_SCENE.left + origin.x * PIXEL_FIGURE_IN_SCENE.width,
        y: PIXEL_FIGURE_IN_SCENE.top + origin.y * PIXEL_FIGURE_IN_SCENE.height,
      }
    : origin;
  return {
    x: scene.left + inScene.x * scene.width,
    y: scene.top + inScene.y * scene.height,
  };
}

const SPARKLE_COUNT = 8;
const SPARKLE_SIZE = 6;
const SPARKLE_MS = 460;
const SPARKLE_COLORS = ["#FFFFFF", "#FFD23F"] as const;
const SILHOUETTE_MS = 380;
const SILHOUETTE_LOAD_TIMEOUT_MS = 150;
const WIPE_MS = 420;
const WIPE_STEPS = 7;

/** Camera glide onto a part: commits quickly, then settles long and soft. */
const ZOOM_IN = { duration: 950, easing: Easing.bezier(0.62, 0, 0.12, 1) };
const ZOOM_OUT = { duration: 820, easing: Easing.bezier(0.55, 0, 0.18, 1) };
/**
 * Share of the camera move the background follows, so it reads as further
 * back. Kept high: the Pixel and its items stand on the background's floor.
 */
const BACKDROP_DEPTH = 0.82;
/** Focus brackets lock on as the camera settles. */
const BRACKET_DELAY_MS = 560;
const BRACKET_MS = 520;
const BRACKET_OUT_MS = 160;
const BRACKET_TRAVEL = 22;
const BRACKET_PAD = 6;
const BRACKET_ARM = 12;
const BRACKET_THICKNESS = 3;

/** Invite brackets around the whole Pixel: longer arms, a slow breathe. */
const INVITE_BRACKET_ARM = 16;
const INVITE_BRACKET_BREATHE = 7;
const INVITE_PULSE_STEP_MS = 520;
const INVITE_FADE_MS = 200;
/** Brackets clamp in this far while the Pixel is held down. */
const PRESS_BRACKET_GRIP = 5;

/** Idle glimmer: first one soon after landing, then every 10–15s. */
const IDLE_SPARKLE_FIRST_MS = 3500;
const IDLE_SPARKLE_MIN_MS = 10_000;
const IDLE_SPARKLE_JITTER_MS = 5_000;
const IDLE_SPARKLE_SECOND_DELAY_MS = 240;
const IDLE_SPARKLE_SPOTS: readonly Exclude<PixelLayerId, "background">[] = [
  "hair",
  "top",
  "bottom",
  "shoes",
  "item_left",
  "item_right",
];

/** Held down: the Pixel squashes flat and wide. */
const PRESS_SQUASH = { scaleX: 1.24, scaleY: 0.66 };
const PRESS_SQUASH_MS = 120;

type Change = {
  id: number;
  /** New item art for each changed non-background layer (white flash). */
  silhouettes: { layerId: PixelLayerId; source: ImageSource }[];
  sparkleFrom: Exclude<PixelLayerId, "background"> | null;
  /** Previous background, wiped away to reveal the new one. */
  oldBackground: ImageSource | null;
};

function diffLoadout(
  prev: PixelLoadout,
  next: PixelLoadout,
  id: number,
): Change | null {
  const changed = (Object.keys(PIXEL_LAYER_Z_INDEX) as PixelLayerId[]).filter(
    (layerId) => prev[layerId] !== next[layerId],
  );
  if (changed.length === 0) return null;

  const look = completeLoadout(next);
  const silhouettes: Change["silhouettes"] = [];
  let sparkleFrom: Change["sparkleFrom"] = null;
  let oldBackground: ImageSource | null = null;
  for (const layerId of changed) {
    if (layerId === "background") {
      const prevId = prev.background;
      oldBackground = prevId != null ? getPixelItemSource(prevId) ?? null : null;
      continue;
    }
    const itemId = look[layerId];
    const source = itemId != null ? getPixelItemSource(itemId, look) : undefined;
    if (source != null) silhouettes.push({ layerId, source });
    sparkleFrom ??= layerId;
  }
  return { id, silhouettes, sparkleFrom, oldBackground };
}

type Props = {
  loadout?: PixelLoadout;
  /**
   * Layer being picked: the camera glides in on that part (layers without a
   * focus rect, and `null`, show the whole scene).
   */
  focus?: PixelLayerId | null;
  /** Top band hidden behind the status bar; the focus centres below it. */
  focusInsetTop?: number;
  /**
   * The Pixel is tappable: brackets breathe around it and it glimmers every
   * 10–15s (only while no part is in focus).
   */
  invite?: boolean;
  /** Held down: the Pixel squashes, then springs up when let go. */
  pressed?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

type SparkleBurstSpec = {
  key: string;
  from: Exclude<PixelLayerId, "background">;
  /** Multiplier on how far the pixels fly. */
  reach: number;
  delay: number;
};

/**
 * `PixelCharacter` that celebrates loadout changes: the new item flashes as
 * a white silhouette, the Pixel hops, and pixel sparkles burst from the
 * changed spot. A new background wipes in over the old one instead. Under
 * Reduce Motion only the silhouette flash plays.
 *
 * With a `focus`, a camera zooms and pans onto that part (the background
 * trailing slightly for depth) and pixel brackets lock on around it; under
 * Reduce Motion the camera cuts instead.
 *
 * With `invite`, brackets breathe around the whole Pixel and it glimmers now
 * and then; `pressed` squashes it, and letting go springs it up in a burst.
 * Under Reduce Motion the invite brackets hold still and nothing else plays.
 */
export function AnimatedPixelCharacter({
  loadout = DEFAULT_PIXEL_LOADOUT,
  focus = null,
  focusInsetTop = 0,
  invite = false,
  pressed = false,
  style,
  accessibilityLabel = "Pixel character",
}: Props) {
  const reduceMotion = useReducedMotion();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [change, setChange] = useState<Change | null>(null);
  const [bursts, setBursts] = useState<SparkleBurstSpec[]>([]);
  const prevLoadoutRef = useRef(loadout);
  const nextChangeIdRef = useRef(1);
  const nextBurstIdRef = useRef(1);
  const wasPressedRef = useRef(false);

  const hopY = useSharedValue(0);
  const hopScaleX = useSharedValue(1);
  const hopScaleY = useSharedValue(1);
  const inviteVisible = useSharedValue(0);
  const invitePulse = useSharedValue(0);
  const pressGrip = useSharedValue(0);
  const silhouetteOpacity = useSharedValue(0);
  const sparkleProgress = useSharedValue(0);
  const wipeProgress = useSharedValue(1);

  const cameraScale = useSharedValue(PIXEL_CAMERA_REST.scale);
  const cameraX = useSharedValue(PIXEL_CAMERA_REST.x);
  const cameraY = useSharedValue(PIXEL_CAMERA_REST.y);
  const bracketProgress = useSharedValue(0);
  const cameraPlacedRef = useRef(false);
  /** Zoom the camera is at or heading to (the hop stays the same on screen). */
  const zoomRef = useRef(PIXEL_CAMERA_REST.scale);
  /** Last brackets shown, kept so they can fade out after `focus` clears. */
  const bracketRectRef = useRef<FrameRect | null>(null);

  const startedChangeIdRef = useRef(0);
  const sizeRef = useRef(size);
  sizeRef.current = size;

  /**
   * Flash, hop and sparkles for one change. Runs once the white silhouette
   * has loaded, so the flash is fully visible on its first frame.
   */
  const startBodyEffects = (changeId: number) => {
    if (startedChangeIdRef.current >= changeId) return;
    startedChangeIdRef.current = changeId;
    silhouetteOpacity.value = withSequence(
      withTiming(1, { duration: 0 }),
      withTiming(1, { duration: 120 }),
      withTiming(0, {
        duration: SILHOUETTE_MS - 120,
        easing: Easing.steps(3),
      }),
    );
    if (reduceMotion) return;
    const lift = (-sizeRef.current.height * 0.06) / zoomRef.current;
    hopScaleY.value = withSequence(
      withTiming(0.92, { duration: 70, easing: Easing.steps(2) }),
      withTiming(1.05, { duration: 110, easing: Easing.steps(2) }),
      withTiming(0.96, { duration: 100, easing: Easing.steps(2) }),
      withTiming(1, { duration: 90, easing: Easing.steps(2) }),
    );
    hopY.value = withSequence(
      withTiming(0, { duration: 70 }),
      withTiming(lift, { duration: 110, easing: Easing.steps(2) }),
      withTiming(0, { duration: 100, easing: Easing.steps(2) }),
    );
    sparkleProgress.value = 0;
    sparkleProgress.value = withTiming(1, {
      duration: SPARKLE_MS,
      easing: Easing.steps(6),
    });
  };

  useEffect(() => {
    const prev = prevLoadoutRef.current;
    prevLoadoutRef.current = loadout;
    const next = diffLoadout(prev, loadout, nextChangeIdRef.current++);
    if (next == null) return;
    silhouetteOpacity.value = 0;
    setChange(next);

    // Fallback if the silhouette's onLoad never fires.
    const fallback =
      next.silhouettes.length > 0
        ? setTimeout(() => startBodyEffects(next.id), SILHOUETTE_LOAD_TIMEOUT_MS)
        : undefined;

    wipeProgress.value = 1;
    if (next.oldBackground != null && !reduceMotion) {
      wipeProgress.value = 0;
      wipeProgress.value = withTiming(1, {
        duration: WIPE_MS,
        easing: Easing.steps(WIPE_STEPS),
      });
    }

    const clear = setTimeout(() => {
      setChange((current) => (current?.id === next.id ? null : current));
    }, SILHOUETTE_LOAD_TIMEOUT_MS + Math.max(SPARKLE_MS, SILHOUETTE_MS, WIPE_MS) + 40);
    return () => {
      clearTimeout(fallback);
      clearTimeout(clear);
    };
    // Shared values are stable; react only to loadout changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadout]);

  useEffect(() => {
    const { width, height } = size;
    if (width === 0) return;
    const focusRect =
      focus != null ? pixelFocusInFrame(focus, width, height) : null;
    const camera =
      focusRect != null
        ? cameraForFocus(focusRect, width, height, focusInsetTop)
        : PIXEL_CAMERA_REST;
    zoomRef.current = camera.scale;

    // The first placement (and every move under Reduce Motion) is a cut.
    const cut = reduceMotion || !cameraPlacedRef.current;
    cameraPlacedRef.current = true;
    const timing = focusRect != null ? ZOOM_IN : ZOOM_OUT;
    const move = (value: number) => (cut ? value : withTiming(value, timing));
    cameraScale.value = move(camera.scale);
    cameraX.value = move(camera.x);
    cameraY.value = move(camera.y);

    if (focusRect == null) {
      bracketProgress.value = cut
        ? 0
        : withTiming(0, { duration: BRACKET_OUT_MS });
      return;
    }
    bracketProgress.value = 0;
    bracketProgress.value = cut
      ? 1
      : withDelay(
          BRACKET_DELAY_MS,
          withTiming(1, { duration: BRACKET_MS, easing: Easing.out(Easing.exp) }),
        );
    // Shared values are stable; react only to focus / frame / setting changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, focusInsetTop, size.width, size.height, reduceMotion]);

  const inviting = invite && focus == null;

  /** Fire sparkle bursts, replacing any still on screen. */
  const playBursts = (specs: Omit<SparkleBurstSpec, "key">[]) => {
    const id = nextBurstIdRef.current++;
    setBursts(specs.map((spec, i) => ({ ...spec, key: `${id}-${i}` })));
  };

  useEffect(() => {
    inviteVisible.value = withTiming(inviting ? 1 : 0, {
      duration: INVITE_FADE_MS,
    });
    cancelAnimation(invitePulse);
    if (!inviting) {
      invitePulse.value = withTiming(0, { duration: INVITE_FADE_MS });
      return;
    }
    if (reduceMotion) {
      invitePulse.value = 1;
      return;
    }
    // Breathe out, breathe in, then rest a beat.
    const step = { duration: INVITE_PULSE_STEP_MS, easing: Easing.steps(3) };
    invitePulse.value = 0;
    invitePulse.value = withRepeat(
      withSequence(
        withTiming(1, step),
        withTiming(0, step),
        withTiming(0, { duration: INVITE_PULSE_STEP_MS }),
      ),
      -1,
    );
    // Shared values are stable; react only to the invite / setting changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviting, reduceMotion]);

  // Idle glimmer: two quick bursts from random spots on the Pixel.
  const hasSize = size.width > 0;
  useEffect(() => {
    if (!inviting || reduceMotion || !hasSize) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = (delay: number) => {
      timer = setTimeout(() => {
        const first = Math.floor(Math.random() * IDLE_SPARKLE_SPOTS.length);
        const offset = 1 + Math.floor(Math.random() * (IDLE_SPARKLE_SPOTS.length - 1));
        const second = (first + offset) % IDLE_SPARKLE_SPOTS.length;
        playBursts([
          { from: IDLE_SPARKLE_SPOTS[first], reach: 1, delay: 0 },
          {
            from: IDLE_SPARKLE_SPOTS[second],
            reach: 0.8,
            delay: IDLE_SPARKLE_SECOND_DELAY_MS,
          },
        ]);
        schedule(IDLE_SPARKLE_MIN_MS + Math.random() * IDLE_SPARKLE_JITTER_MS);
      }, delay);
    };
    schedule(IDLE_SPARKLE_FIRST_MS);
    return () => clearTimeout(timer);
  }, [inviting, reduceMotion, hasSize]);

  useEffect(() => {
    const wasPressed = wasPressedRef.current;
    wasPressedRef.current = pressed;
    if (reduceMotion || pressed === wasPressed) return;
    if (pressed) {
      const squash = { duration: PRESS_SQUASH_MS, easing: Easing.steps(3) };
      hopScaleX.value = withTiming(PRESS_SQUASH.scaleX, squash);
      hopScaleY.value = withTiming(PRESS_SQUASH.scaleY, squash);
      hopY.value = withTiming(0, squash);
      pressGrip.value = withTiming(1, squash);
      return;
    }
    // Let go: spring up tall and thin, land with a wobble, kick up sparkles.
    const lift = (-sizeRef.current.height * 0.12) / zoomRef.current;
    const beat = (duration: number) => ({ duration, easing: Easing.steps(2) });
    // A quick tap lets go mid-squash; finish the squash first so it still lands.
    hopScaleY.value = withSequence(
      withTiming(PRESS_SQUASH.scaleY, beat(50)),
      withTiming(1.24, beat(90)),
      withTiming(1, beat(110)),
      withTiming(0.86, beat(80)),
      withTiming(1.06, beat(100)),
      withTiming(1, beat(90)),
    );
    hopScaleX.value = withSequence(
      withTiming(PRESS_SQUASH.scaleX, beat(50)),
      withTiming(0.84, beat(90)),
      withTiming(1, beat(110)),
      withTiming(1.14, beat(80)),
      withTiming(0.97, beat(100)),
      withTiming(1, beat(90)),
    );
    hopY.value = withSequence(
      withTiming(0, { duration: 50 }),
      withTiming(lift, beat(140)),
      withTiming(0, beat(140)),
    );
    pressGrip.value = withSequence(
      withTiming(1, { duration: 50 }),
      withTiming(0, beat(200)),
    );
    playBursts([
      { from: "top", reach: 1.6, delay: 0 },
      { from: "shoes", reach: 1.2, delay: 280 },
    ]);
    // Shared values are stable; react only to press changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pressed]);

  const cameraStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: cameraX.value },
      { translateY: cameraY.value },
      { scale: cameraScale.value },
    ],
  }));
  const backdropStyle = useAnimatedStyle(() => {
    const scale = 1 + (cameraScale.value - 1) * BACKDROP_DEPTH;
    // Stay inside the zoomed background so its edges never show.
    const maxX = ((scale - 1) * size.width) / 2;
    const maxY = ((scale - 1) * size.height) / 2;
    return {
      transform: [
        {
          translateX: Math.min(Math.max(cameraX.value * BACKDROP_DEPTH, -maxX), maxX),
        },
        {
          translateY: Math.min(Math.max(cameraY.value * BACKDROP_DEPTH, -maxY), maxY),
        },
        { scale },
      ],
    };
  });

  const hopStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: hopY.value },
      { scaleX: hopScaleX.value },
      { scaleY: hopScaleY.value },
    ],
  }));
  const silhouetteStyle = useAnimatedStyle(() => ({
    opacity: silhouetteOpacity.value,
  }));
  const wipeStyle = useAnimatedStyle(() => ({
    width: size.width * (1 - wipeProgress.value),
    opacity: wipeProgress.value >= 1 ? 0 : 1,
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  const scene = coverSceneRect(size.width, size.height);
  const focusRect =
    focus != null && size.width > 0
      ? pixelFocusInFrame(focus, size.width, size.height)
      : null;
  if (focusRect != null) {
    bracketRectRef.current = bracketRect(
      rectThroughCamera(
        focusRect,
        cameraForFocus(focusRect, size.width, size.height, focusInsetTop),
        size.width,
        size.height,
      ),
      size,
      focusInsetTop,
    );
  }
  const brackets = bracketRectRef.current;
  const inviteBrackets =
    invite && size.width > 0
      ? bracketRect(
          {
            left: scene.left + PIXEL_FIGURE_IN_SCENE.left * scene.width,
            top: scene.top + PIXEL_FIGURE_IN_SCENE.top * scene.height,
            width: PIXEL_FIGURE_IN_SCENE.width * scene.width,
            height: PIXEL_FIGURE_IN_SCENE.height * scene.height,
          },
          size,
          focusInsetTop,
        )
      : null;
  const camera = { scale: cameraScale, x: cameraX, y: cameraY };
  const sparkleAt =
    change?.sparkleFrom != null ? sparklePoint(change.sparkleFrom, scene) : null;
  const layers = resolveLayers(loadout);
  const background = layers.find((layer) => layer.id === "background");
  const heldItems = layers.filter(
    (layer) => layer.id !== "background" && !isFigureLayer(layer.id),
  );
  const silhouettes = change?.silhouettes ?? [];
  const renderSilhouette = (silhouette: Change["silhouettes"][number]) => (
    <Animated.View
      key={`${change!.id}-${silhouette.layerId}`}
      style={[styles.silhouette, silhouetteStyle]}
    >
      {/* RN Image tints natively on the first frame; expo-image's tint lags. */}
      <NativeImage
        accessibilityIgnoresInvertColors
        source={silhouette.source as ImageSourcePropType}
        style={[styles.layer, styles.silhouetteImage]}
        resizeMode={isFigureLayer(silhouette.layerId) ? "contain" : "cover"}
        onLoad={() => startBodyEffects(change!.id)}
      />
    </Animated.View>
  );

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      onLayout={onLayout}
      style={[styles.frame, style]}
    >
      <Animated.View pointerEvents="none" style={[styles.camera, backdropStyle]}>
        {background != null ? (
          <Image
            accessibilityIgnoresInvertColors
            source={background.source}
            style={styles.layer}
            contentFit="cover"
            allowDownscaling={false}
          />
        ) : null}

        {change?.oldBackground != null ? (
          // Old background on the right, shrinking in blocky steps.
          <Animated.View style={[styles.wipe, wipeStyle]}>
            <Image
              accessibilityIgnoresInvertColors
              source={change.oldBackground}
              style={[styles.wipeImage, size]}
              contentFit="cover"
              allowDownscaling={false}
            />
            <View style={styles.wipeEdge} />
          </Animated.View>
        ) : null}
      </Animated.View>

      {size.width > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.camera, styles.sceneCamera, cameraStyle]}
        >
          <View style={[styles.scene, scene]}>
            {heldItems.map((layer) => (
              <Image
                key={layer.id}
                accessibilityIgnoresInvertColors
                source={layer.source}
                style={[styles.layer, { zIndex: layer.zIndex }]}
                contentFit="cover"
                allowDownscaling={false}
              />
            ))}
            {silhouettes
              .filter((silhouette) => !isFigureLayer(silhouette.layerId))
              .map(renderSilhouette)}
            <Animated.View style={[styles.body, FIGURE_RECT, hopStyle]}>
              <FigureLayers layers={layers} allowDownscaling={false} />
              {silhouettes
                .filter((silhouette) => isFigureLayer(silhouette.layerId))
                .map(renderSilhouette)}
            </Animated.View>
          </View>
        </Animated.View>
      ) : null}

      {brackets != null && !reduceMotion ? (
        <FocusBrackets rect={brackets} progress={bracketProgress} />
      ) : null}

      {inviteBrackets != null ? (
        <InviteBrackets
          rect={inviteBrackets}
          visible={inviteVisible}
          pulse={invitePulse}
          grip={pressGrip}
        />
      ) : null}

      {change != null && sparkleAt != null && !reduceMotion ? (
        <View pointerEvents="none" style={styles.sparkles}>
          {Array.from({ length: SPARKLE_COUNT }, (_, i) => (
            <Sparkle
              key={`${change.id}-${i}`}
              index={i}
              progress={sparkleProgress}
              originX={sparkleAt.x}
              originY={sparkleAt.y}
              camera={camera}
              frameWidth={size.width}
              frameHeight={size.height}
            />
          ))}
        </View>
      ) : null}

      {bursts.length > 0 && size.width > 0 && !reduceMotion ? (
        <View pointerEvents="none" style={styles.sparkles}>
          {bursts.map((burst) => {
            const at = sparklePoint(burst.from, scene);
            return (
              <SparkleBurst
                key={burst.key}
                originX={at.x}
                originY={at.y}
                reach={burst.reach}
                delay={burst.delay}
                camera={camera}
                frameWidth={size.width}
                frameHeight={size.height}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/** The focus rect on screen, padded and kept inside the frame. */
function bracketRect(
  rect: FrameRect,
  frame: { width: number; height: number },
  insetTop: number,
): FrameRect {
  const inset = BRACKET_THICKNESS + 2;
  const left = Math.max(rect.left - BRACKET_PAD, inset);
  const top = Math.max(rect.top - BRACKET_PAD, insetTop + inset);
  const right = Math.min(rect.left + rect.width + BRACKET_PAD, frame.width - inset);
  const bottom = Math.min(rect.top + rect.height + BRACKET_PAD, frame.height - inset);
  return { left, top, width: right - left, height: bottom - top };
}

/** Each corner and which edges its horizontal and vertical arms hug. */
const BRACKET_CORNERS: { corner: ViewStyle; across: ViewStyle; down: ViewStyle }[] = [
  { corner: { top: 0, left: 0 }, across: { top: 0 }, down: { left: 0 } },
  { corner: { top: 0, right: 0 }, across: { top: 0 }, down: { right: 0 } },
  { corner: { bottom: 0, left: 0 }, across: { bottom: 0 }, down: { left: 0 } },
  { corner: { bottom: 0, right: 0 }, across: { bottom: 0 }, down: { right: 0 } },
];

/**
 * Four pixel corner brackets that close in on the focused part like a
 * camera locking focus, flickering on as they land.
 */
function FocusBrackets({
  rect,
  progress,
}: {
  rect: FrameRect;
  progress: SharedValue<number>;
}) {
  const arm = Math.min(BRACKET_ARM, rect.width / 3, rect.height / 3);
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const spread = (1 - p) * BRACKET_TRAVEL;
    // Two quick blinks before holding steady, like a viewfinder locking.
    const blink = p < 1 && p > 0.55 && Math.floor(p * 14) % 2 === 1 ? 0.35 : 1;
    return {
      opacity: Math.min(p * 2.5, 1) * blink,
      left: rect.left - spread,
      top: rect.top - spread,
      width: rect.width + spread * 2,
      height: rect.height + spread * 2,
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.brackets, style]}>
      <BracketCorners arm={arm} />
    </Animated.View>
  );
}

/**
 * Corner brackets around the whole Pixel that breathe in and out, saying
 * "tap me"; holding the Pixel down clamps them in tight.
 */
function InviteBrackets({
  rect,
  visible,
  pulse,
  grip,
}: {
  rect: FrameRect;
  visible: SharedValue<number>;
  pulse: SharedValue<number>;
  grip: SharedValue<number>;
}) {
  const arm = Math.min(INVITE_BRACKET_ARM, rect.width / 3, rect.height / 3);
  const style = useAnimatedStyle(() => {
    const g = grip.value;
    const spread =
      pulse.value * INVITE_BRACKET_BREATHE * (1 - g) - g * PRESS_BRACKET_GRIP;
    const glow = 0.55 + 0.45 * Math.max(pulse.value, g);
    return {
      opacity: visible.value * glow,
      left: rect.left - spread,
      top: rect.top - spread,
      width: rect.width + spread * 2,
      height: rect.height + spread * 2,
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.brackets, style]}>
      <BracketCorners arm={arm} />
    </Animated.View>
  );
}

function BracketCorners({ arm }: { arm: number }) {
  return BRACKET_CORNERS.map(({ corner, across, down }, i) => (
    <View
      key={i}
      style={[styles.bracketCorner, corner, { width: arm, height: arm }]}
    >
      {/* A hard 1pt drop shadow under the white arms. */}
      {[styles.bracketShadow, styles.bracketArm].map((tone, j) => (
        <View key={j} style={[styles.layer, j === 0 && styles.bracketShadowOffset]}>
          <View style={[styles.bracketAcross, across, tone]} />
          <View style={[styles.bracketDown, down, tone]} />
        </View>
      ))}
    </View>
  ));
}

type CameraValues = {
  scale: SharedValue<number>;
  x: SharedValue<number>;
  y: SharedValue<number>;
};

/** One sparkle burst that plays itself once on mount (after `delay`). */
function SparkleBurst({
  originX,
  originY,
  reach,
  delay,
  camera,
  frameWidth,
  frameHeight,
}: {
  originX: number;
  originY: number;
  reach: number;
  delay: number;
  camera: CameraValues;
  frameWidth: number;
  frameHeight: number;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: SPARKLE_MS * reach, easing: Easing.steps(6) }),
    );
    // Plays once; a new burst is a new mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return Array.from({ length: SPARKLE_COUNT }, (_, i) => (
    <Sparkle
      key={i}
      index={i}
      progress={progress}
      originX={originX}
      originY={originY}
      reach={reach}
      camera={camera}
      frameWidth={frameWidth}
      frameHeight={frameHeight}
    />
  ));
}

function Sparkle({
  index,
  progress,
  originX,
  originY,
  reach = 1,
  camera,
  frameWidth,
  frameHeight,
}: {
  index: number;
  progress: SharedValue<number>;
  originX: number;
  originY: number;
  /** Multiplier on how far the pixels fly. */
  reach?: number;
  /** Sparkles stay pixel-sized but follow the spot through the camera. */
  camera: CameraValues;
  frameWidth: number;
  frameHeight: number;
}) {
  const angle = (index / SPARKLE_COUNT) * Math.PI * 2 + 0.3;
  // Alternate near / far so the burst reads as scattered pixels, not a ring.
  const distance = (index % 2 === 0 ? 46 : 30) * reach;
  const color = SPARKLE_COLORS[index % SPARKLE_COLORS.length];

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const cx = frameWidth / 2;
    const cy = frameHeight / 2;
    const x = cx + camera.x.value + (originX - cx) * camera.scale.value;
    const y = cy + camera.y.value + (originY - cy) * camera.scale.value;
    return {
      opacity: p <= 0 || p >= 1 ? 0 : 1 - p * 0.6,
      transform: [
        { translateX: x - SPARKLE_SIZE / 2 + Math.cos(angle) * distance * p },
        { translateY: y - SPARKLE_SIZE / 2 + Math.sin(angle) * distance * p },
        { scale: 1.4 - p * 0.8 },
      ],
    };
  });

  return (
    <Animated.View style={[styles.sparkle, { backgroundColor: color }, style]} />
  );
}

const styles = StyleSheet.create({
  frame: {
    position: "relative",
    overflow: "hidden",
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  /** Frame-sized, so camera transforms scale about the frame's centre. */
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  sceneCamera: {
    zIndex: 2,
  },
  scene: {
    position: "absolute",
  },
  /** The character, between the held items' z (10–11) and the background. */
  body: {
    position: "absolute",
    zIndex: 5,
    transformOrigin: "bottom",
  },
  silhouette: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  silhouetteImage: {
    width: "100%",
    height: "100%",
    tintColor: "#FFFFFF",
  },
  wipe: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    zIndex: 1,
    overflow: "hidden",
  },
  wipeImage: {
    position: "absolute",
    top: 0,
    right: 0,
  },
  wipeEdge: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
    backgroundColor: "#FFFFFF",
  },
  sparkles: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
  },
  brackets: {
    position: "absolute",
    zIndex: 3,
  },
  bracketCorner: {
    position: "absolute",
  },
  bracketAcross: {
    position: "absolute",
    left: 0,
    right: 0,
    height: BRACKET_THICKNESS,
  },
  bracketDown: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: BRACKET_THICKNESS,
  },
  bracketArm: {
    backgroundColor: "#FFFFFF",
  },
  bracketShadow: {
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  bracketShadowOffset: {
    transform: [{ translateX: 1 }, { translateY: 1 }],
  },
  sparkle: {
    position: "absolute",
    left: 0,
    top: 0,
    width: SPARKLE_SIZE,
    height: SPARKLE_SIZE,
  },
});
