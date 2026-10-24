import * as Haptics from "expo-haptics";
import { Image, type ImageSource } from "expo-image";
import { useState, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { FONT_FAMILY } from "@/constants/fonts";
import { useHoldToRepeat } from "@/hooks/use-hold-to-repeat";

/** Shared pixel look for the training screens (matches the mockups). */
export const T = {
  navy: "#02284f",
  deep: "#031c3b",
  card: "#06305f",
  cardActive: "#0a3570",
  border: "#1f5fbf",
  borderSoft: "#0d4a9a",
  bright: "#1f7bff",
  cyan: "#22c8ff",
  lime: "#7fe000",
  limeDark: "#1b3d12",
  yellow: "#ffd21a",
  red: "#ff5a5a",
  text: "#ffffff",
  muted: "#a9c1e6",
  black: "#000000",
} as const;

export const BODY_FONT = "PixeloidSans";

export function tapHaptic() {
  if (process.env.EXPO_OS === "ios") void Haptics.selectionAsync();
}

/** The pixel-art tiles the other action screens are built from (stretched to fit, like theirs). */
export const BG = {
  rectCard: require("@/assets/backgrounds/blue-rect-card.png"),
  squareCard: require("@/assets/backgrounds/blue-square-card.png"),
  tallCard: require("@/assets/backgrounds/blue-large-square-card.png"),
  tile: require("@/assets/backgrounds/bulk-add-blue.png"),
  tileOn: require("@/assets/backgrounds/blue-tab-button.png"),
  tileCyan: require("@/assets/backgrounds/light-blue-rect-card.png"),
  tileDone: require("@/assets/backgrounds/quick-add-food.png"),
  lime: require("@/assets/backgrounds/lime-green-action.png"),
  cyan: require("@/assets/backgrounds/custom-add-action.png"),
  orange: require("@/assets/backgrounds/orange-action.png"),
  red: require("@/assets/backgrounds/remove-action.png"),
  input: require("@/assets/backgrounds/text-input-long.png"),
  navRow: require("@/assets/backgrounds/settings-more-selections-button.png"),
} as const;

const ADD_ICON = require("@/assets/icons/add.png");
const SUBTRACT_ICON = require("@/assets/icons/subtract.png");

/** Blue tiles by width / height, so a stretched tile keeps its corners close to the art. */
const CARD_SHAPES = [
  [1555 / 511, BG.rectCard],
  [451 / 334, BG.squareCard],
  [451 / 624, BG.tallCard],
] as const;
const BLUE_BUTTON_SHAPES = [
  [145 / 122, BG.tile],
  [1555 / 511, BG.rectCard],
] as const;

function closestShape(aspect: number, shapes: readonly (readonly [number, ImageSource])[]): ImageSource {
  let best = shapes[0];
  for (const s of shapes) {
    if (Math.abs(Math.log(aspect / s[0])) < Math.abs(Math.log(aspect / best[0]))) best = s;
  }
  return best[1];
}

/** Width / height of a view, for picking the closest tile. */
function useAspect(initial: number) {
  const [aspect, setAspect] = useState(initial);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setAspect(width / height);
  };
  return { aspect, onLayout };
}

/** A tile stretched behind its children. */
export function PixelBackdrop({ source }: { source: ImageSource }) {
  return (
    <Image
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      source={source}
      style={StyleSheet.absoluteFillObject}
      contentFit="fill"
    />
  );
}

type Variant = "lime" | "cyan" | "orange" | "blue" | "danger";

const VARIANT_BG: Record<Exclude<Variant, "blue">, ImageSource> = {
  lime: BG.lime,
  cyan: BG.cyan,
  orange: BG.orange,
  danger: BG.red,
};

const VARIANT_TEXT: Record<Variant, string> = {
  lime: T.black,
  cyan: T.black,
  orange: T.text,
  blue: T.text,
  danger: T.text,
};

export function PixelButton({
  label,
  onPress,
  variant = "lime",
  size = "lg",
  disabled,
  accessibilityLabel,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: "lg" | "md" | "sm";
  disabled?: boolean;
  accessibilityLabel?: string;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const height = size === "lg" ? 58 : size === "md" ? 48 : 40;
  const { aspect, onLayout } = useAspect(4);
  const source = variant === "blue" ? closestShape(aspect, BLUE_BUTTON_SHAPES) : VARIANT_BG[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onLayout={onLayout}
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        { height },
        pressed && styles.pressed,
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      <PixelBackdrop source={source} />
      {icon}
      <Text
        numberOfLines={1}
        style={[styles.buttonLabel, { color: VARIANT_TEXT[variant], fontSize: size === "lg" ? 13 : size === "md" ? 11 : 9 }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Blue card: the closest of the rect / square / tall card tiles for its shape. */
export function PixelCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { aspect, onLayout } = useAspect(451 / 334);
  return (
    <View onLayout={onLayout} style={[styles.card, style]}>
      <PixelBackdrop source={closestShape(aspect, CARD_SHAPES)} />
      {children}
    </View>
  );
}

/** Full-width row that opens another screen (the Settings row tile, chevron included). */
export function PixelNavRow({
  label,
  detail,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  detail?: string;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (detail ? `${label}. ${detail}` : label)}
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
    >
      <PixelBackdrop source={BG.navRow} />
      <PixelText size={10}>{label}</PixelText>
      {detail ? (
        <BodyText size={12} numberOfLines={1}>
          {detail}
        </BodyText>
      ) : null}
    </Pressable>
  );
}

/** Text field on the shared input tile (Settings and custom meals use the same one). */
export function PixelTextInput({ style, ...props }: TextInputProps) {
  return (
    <View style={styles.inputShell}>
      <PixelBackdrop source={BG.input} />
      <TextInput placeholderTextColor="#ffffff66" keyboardAppearance="dark" {...props} style={[styles.input, style]} />
    </View>
  );
}

export function PixelText({
  children,
  size = 10,
  color = T.text,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: FONT_FAMILY, fontSize: size, color, lineHeight: Math.round(size * 1.5) }, style]}>
      {children}
    </Text>
  );
}

export function BodyText({
  children,
  size = 13,
  color = T.muted,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: BODY_FONT, fontSize: size, color, lineHeight: Math.round(size * 1.45) }, style]}>
      {children}
    </Text>
  );
}

export function Badge({ label, color = T.yellow, textColor = T.black }: { label: string; color?: string; textColor?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

/** Big −/+ stepper; holding a button repeats (for big weight jumps). */
export function Stepper({
  label,
  value,
  onDecrease,
  onIncrease,
  decreaseLabel,
  increaseLabel,
  compact,
}: {
  label: string;
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseLabel: string;
  increaseLabel: string;
  compact?: boolean;
}) {
  const dec = useHoldToRepeat(onDecrease, { intervalMs: 90 });
  const inc = useHoldToRepeat(onIncrease, { intervalMs: 90 });
  const btn = compact ? 34 : 42;
  return (
    <View style={[styles.stepper, compact && styles.stepperCompact]}>
      <PixelBackdrop source={BG.tile} />
      <PixelText size={compact ? 6 : 7} color={T.muted}>
        {label}
      </PixelText>
      <View style={styles.stepperRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={decreaseLabel}
          hitSlop={6}
          onPressIn={() => {
            tapHaptic();
            dec.onPressIn();
          }}
          onPressOut={dec.onPressOut}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Image source={SUBTRACT_ICON} style={{ width: btn, height: btn }} contentFit="contain" />
        </Pressable>
        <PixelText size={compact ? 12 : 16} style={styles.stepValue} numberOfLines={1}>
          {value}
        </PixelText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={increaseLabel}
          hitSlop={6}
          onPressIn={() => {
            tapHaptic();
            inc.onPressIn();
          }}
          onPressOut={inc.onPressOut}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Image source={ADD_ICON} style={{ width: btn, height: btn }} contentFit="contain" />
        </Pressable>
      </View>
    </View>
  );
}

export function ProgressSegments({ total, done, current }: { total: number; done: number; current?: number }) {
  return (
    <View style={styles.segments}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            { backgroundColor: i < done ? T.lime : i === current ? T.cyan : "#0b1a2e" },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonLabel: {
    fontFamily: FONT_FAMILY,
  },
  card: {
    borderRadius: 12,
    overflow: "hidden",
    paddingVertical: 20,
    paddingHorizontal: 18,
    gap: 10,
  },
  navRow: {
    alignSelf: "stretch",
    aspectRatio: 1039 / 190,
    borderRadius: 8,
    overflow: "hidden",
    justifyContent: "center",
    paddingLeft: 20,
    paddingRight: 56,
    gap: 4,
  },
  inputShell: {
    alignSelf: "stretch",
    height: 52,
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
  },
  input: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    color: T.text,
    backgroundColor: "transparent",
    paddingHorizontal: 18,
    paddingVertical: 0,
    height: 52,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontFamily: FONT_FAMILY,
    fontSize: 7,
  },
  stepper: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 6,
  },
  stepperCompact: {
    paddingVertical: 10,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stepValue: {
    minWidth: 46,
    textAlign: "center",
  },
  segments: {
    flexDirection: "row",
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 8,
    borderWidth: 2,
    borderColor: T.black,
  },
});
