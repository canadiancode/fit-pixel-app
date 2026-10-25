import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import {
  PixelChevron,
  PixelFrameBackdrop,
  PixelPanel,
  PixelPressablePanel,
} from "@/components/pixel-panel";
import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";

/**
 * Settings building blocks, in the Chat tab's pixel-frame style: a section is
 * a small lowercase label, a framed card of rows, and an optional footnote.
 * Rows put the title on one line and the description under it with room to
 * breathe, and keep controls on the right where the thumb expects them.
 */

export const SETTINGS_CARD_FILL = "#01224e";
export const SETTINGS_CARD_RIM = "#0b4f96";
export const SETTINGS_CARD_RIM_ACTIVE = "#2f86e8";
export const SETTINGS_TRACK_FILL = "#011a3a";
/** Pixel rule between rows (2 pt, the frames' rim blue). */
export const SETTINGS_DIVIDER = "#0b4f96";
export const SETTINGS_ON_COLOR = "#5fd35f";
export const SETTINGS_DANGER_COLOR = "#ff8a8a";
export const SETTINGS_SUCCESS_COLOR = "#7dffb3";

function selectionHaptic() {
  if (process.env.EXPO_OS === "ios") void Haptics.selectionAsync();
}

type SectionProps = {
  title?: string;
  /** Small print under the card (what a setting does, privacy notes). */
  footer?: string | null;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Render children without the card chrome (custom grids). */
  bare?: boolean;
};

export function SettingsSection({
  title,
  footer,
  children,
  style,
  bare = false,
}: SectionProps) {
  return (
    <View style={[styles.section, style]}>
      {title ? (
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.sectionTitle}
          accessibilityRole="header"
        >
          {title}
        </ThemedText>
      ) : null}
      {bare ? children : <PixelPanel style={styles.card}>{children}</PixelPanel>}
      {footer ? (
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.footer}
        >
          {footer}
        </ThemedText>
      ) : null}
    </View>
  );
}

/** Pixel rule between rows inside a card. */
export function SettingsDivider() {
  return <View style={styles.divider} />;
}

type RowTextProps = {
  title: string;
  description?: string | null;
  muted?: boolean;
  danger?: boolean;
};

function RowText({ title, description, muted, danger }: RowTextProps) {
  return (
    <View style={styles.rowText}>
      <ThemedText
        lightColor={
          danger
            ? SETTINGS_DANGER_COLOR
            : muted
              ? APP_SHELL_LABEL_COLOR
              : APP_SHELL_MAIN_TEXT_COLOR
        }
        darkColor={
          danger
            ? SETTINGS_DANGER_COLOR
            : muted
              ? APP_SHELL_LABEL_COLOR
              : APP_SHELL_MAIN_TEXT_COLOR
        }
        style={styles.rowTitle}
      >
        {title}
      </ThemedText>
      {description ? (
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.rowDescription}
        >
          {description}
        </ThemedText>
      ) : null}
    </View>
  );
}

type ToggleRowProps = {
  title: string;
  description?: string | null;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityHint?: string;
};

export function SettingsToggleRow({
  title,
  description,
  value,
  onValueChange,
  disabled,
  accessibilityHint,
}: ToggleRowProps) {
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <RowText title={title} description={description} />
      <Switch
        accessibilityLabel={title}
        accessibilityHint={accessibilityHint}
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          selectionHaptic();
          onValueChange(next);
        }}
        ios_backgroundColor={SETTINGS_TRACK_FILL}
        trackColor={{ false: SETTINGS_TRACK_FILL, true: SETTINGS_ON_COLOR }}
        thumbColor={APP_SHELL_MAIN_TEXT_COLOR}
      />
    </View>
  );
}

type LinkRowProps = {
  title: string;
  description?: string | null;
  /** Text on the right before the chevron (current value, status). */
  value?: string | null;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  /** Replaces the chevron (e.g. a spinner or "Sent"). */
  trailing?: ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export function SettingsLinkRow({
  title,
  description,
  value,
  onPress,
  disabled,
  danger,
  trailing,
  accessibilityLabel,
  accessibilityHint,
}: LinkRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
        disabled && styles.rowDisabled,
      ]}
    >
      <RowText title={title} description={description} danger={danger} />
      {value ? (
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.rowValue}
          numberOfLines={1}
        >
          {value}
        </ThemedText>
      ) : null}
      {trailing ?? <PixelChevron />}
    </Pressable>
  );
}

type ValueRowProps = {
  title: string;
  value: string;
  /** Colour the value (e.g. green "Live"). */
  valueColor?: string;
  description?: string | null;
};

export function SettingsValueRow({
  title,
  value,
  valueColor,
  description,
}: ValueRowProps) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${title}: ${value}`}
    >
      <RowText title={title} description={description} />
      <Text
        style={[styles.valuePill, valueColor ? { color: valueColor } : null]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

type SegmentedOption<T extends string | number> = {
  value: T;
  label: string;
};

type SegmentedProps<T extends string | number> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  accessibilityLabel: string;
};

/** Pixel segmented control (same look as the Chat tab's section switcher). */
export function SettingsSegmented<T extends string | number>({
  options,
  value,
  onChange,
  disabled,
  accessibilityLabel,
}: SegmentedProps<T>) {
  return (
    <PixelPanel
      frame="well"
      style={[styles.segTrack, disabled && styles.rowDisabled]}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected, disabled: Boolean(disabled) }}
            disabled={disabled}
            onPress={() => {
              if (selected) return;
              selectionHaptic();
              onChange(option.value);
            }}
            style={({ pressed }) => [
              styles.segItem,
              pressed && !selected && styles.rowPressed,
            ]}
          >
            {selected ? <PixelFrameBackdrop frame="button" /> : null}
            <Text
              style={[styles.segLabel, selected && styles.segLabelSelected]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </PixelPanel>
  );
}

type FieldProps = {
  label: string;
  hint?: string | null;
  error?: string | null;
  /** e.g. `12/80`. */
  counter?: string | null;
  children: ReactNode;
};

/** Label above, input, then a hint or error line under it. */
export function SettingsField({
  label,
  hint,
  error,
  counter,
  children,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.fieldLabel}
        >
          {label}
        </ThemedText>
        {counter ? (
          <ThemedText
            lightColor={APP_SHELL_LABEL_COLOR}
            darkColor={APP_SHELL_LABEL_COLOR}
            style={styles.fieldCounter}
          >
            {counter}
          </ThemedText>
        ) : null}
      </View>
      {children}
      {error ? (
        <ThemedText
          lightColor={SETTINGS_DANGER_COLOR}
          darkColor={SETTINGS_DANGER_COLOR}
          style={styles.fieldHint}
          accessibilityLiveRegion="polite"
        >
          {error}
        </ThemedText>
      ) : hint ? (
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.fieldHint}
        >
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  accessibilityLabel?: string;
};

/** Full-width pixel button for secondary / destructive actions. */
export function SettingsButton({
  label,
  onPress,
  disabled,
  tone = "default",
  accessibilityLabel,
}: ButtonProps) {
  const danger = tone === "danger";
  return (
    <PixelPressablePanel
      frame={danger ? "red" : "button"}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.rowDisabled]}
    >
      <Text style={[styles.buttonLabel, danger && styles.buttonLabelDanger]}>
        {label}
      </Text>
    </PixelPressablePanel>
  );
}

/** Short intro line at the top of a settings page. */
export function SettingsIntro({ children }: { children: string }) {
  return (
    <ThemedText
      lightColor={APP_SHELL_LABEL_COLOR}
      darkColor={APP_SHELL_LABEL_COLOR}
      style={styles.intro}
    >
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.3,
    textTransform: "lowercase",
    paddingHorizontal: 4,
  },
  card: {
    padding: 4,
  },
  footer: {
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 14,
    paddingHorizontal: 4,
  },
  divider: {
    height: 2,
    marginHorizontal: 10,
    backgroundColor: SETTINGS_DIVIDER,
  },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  rowPressed: {
    opacity: 0.75,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  rowTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
  },
  rowDescription: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 15,
  },
  rowValue: {
    flexShrink: 1,
    maxWidth: "45%",
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 13,
    textAlign: "right",
  },
  valuePill: {
    flexShrink: 0,
    color: APP_SHELL_LABEL_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 13,
  },
  segTrack: {
    flexDirection: "row",
    gap: 4,
    padding: 6,
  },
  segItem: {
    flex: 1,
    minWidth: 0,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  segLabel: {
    color: APP_SHELL_LABEL_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 13,
  },
  segLabelSelected: {
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
  field: {
    gap: 8,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 4,
  },
  fieldLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 15,
  },
  fieldCounter: {
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 12,
  },
  fieldHint: {
    fontFamily: FONT_FAMILY,
    fontSize: 8,
    lineHeight: 13,
    paddingHorizontal: 4,
  },
  button: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  buttonLabel: {
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 15,
  },
  buttonLabelDanger: {
    color: SETTINGS_DANGER_COLOR,
  },
  intro: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 15,
    paddingHorizontal: 4,
  },
});
