import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
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

type Variant = "lime" | "cyan" | "yellow" | "blue" | "danger";

const VARIANT_BG: Record<Variant, string> = {
  lime: T.lime,
  cyan: T.cyan,
  yellow: T.yellow,
  blue: "#0b3f86",
  danger: "#b3261e",
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
  const filled = variant !== "blue";
  const height = size === "lg" ? 58 : size === "md" ? 48 : 40;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        {
          height,
          backgroundColor: VARIANT_BG[variant],
          borderColor: filled ? T.black : T.border,
          borderWidth: filled ? 4 : 3,
          borderRadius: filled ? 2 : 10,
        },
        filled && !pressed && styles.buttonShadow,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      {icon}
      <Text
        numberOfLines={1}
        style={[
          styles.buttonLabel,
          { color: filled && variant !== "danger" ? T.black : T.text, fontSize: size === "lg" ? 13 : size === "md" ? 11 : 9 },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function PixelCard({
  children,
  active,
  style,
}: {
  children: ReactNode;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, active && styles.cardActive, style]}>{children}</View>;
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
  const btn = compact ? 40 : 48;
  return (
    <View style={[styles.stepper, compact && styles.stepperCompact]}>
      <PixelText size={compact ? 6 : 7} color={T.muted}>
        {label}
      </PixelText>
      <View style={styles.stepperRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={decreaseLabel}
          onPressIn={() => {
            tapHaptic();
            dec.onPressIn();
          }}
          onPressOut={dec.onPressOut}
          style={({ pressed }) => [styles.stepBtn, { width: btn, height: btn }, pressed && styles.stepBtnPressed]}
        >
          <PixelText size={16}>-</PixelText>
        </Pressable>
        <PixelText size={compact ? 12 : 16} style={styles.stepValue} numberOfLines={1}>
          {value}
        </PixelText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={increaseLabel}
          onPressIn={() => {
            tapHaptic();
            inc.onPressIn();
          }}
          onPressOut={inc.onPressOut}
          style={({ pressed }) => [styles.stepBtn, { width: btn, height: btn }, pressed && styles.stepBtnPressed]}
        >
          <PixelText size={16}>+</PixelText>
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
  },
  buttonShadow: {
    shadowColor: T.black,
    shadowOffset: { width: 5, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  buttonPressed: {
    transform: [{ translateX: 3 }, { translateY: 4 }],
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonLabel: {
    fontFamily: FONT_FAMILY,
  },
  card: {
    backgroundColor: T.card,
    borderWidth: 3,
    borderColor: T.border,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  cardActive: {
    borderWidth: 4,
    borderColor: T.cyan,
    shadowColor: T.cyan,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
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
    backgroundColor: T.deep,
    borderWidth: 2,
    borderColor: T.borderSoft,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 6,
  },
  stepperCompact: {
    paddingVertical: 6,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepBtn: {
    backgroundColor: "#0b3f86",
    borderWidth: 3,
    borderColor: T.border,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnPressed: {
    backgroundColor: T.cardActive,
    borderColor: T.cyan,
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
