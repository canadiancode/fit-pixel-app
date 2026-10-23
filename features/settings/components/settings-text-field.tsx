import { Image } from "expo-image";
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

import {
  APP_SHELL_INPUT_PLACEHOLDER_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";

const BG_LONG = require("@/assets/backgrounds/text-input-long.png");
const BG_TALL_BIO = require("@/assets/backgrounds/text-input-tall-big.png");

const SINGLE_LINE_ANDROID = Platform.select({
  android: {
    includeFontPadding: false,
    textAlignVertical: "center" as const,
  },
  default: {},
});

type SingleLineProps = TextInputProps & {
  /** Merged onto the outer image shell (e.g. `marginTop`). */
  shellStyle?: StyleProp<ViewStyle>;
  /** No frame image: the shell's own border (via `shellStyle`) frames it. */
  plain?: boolean;
};

/** Single-line field: `text-input-long.png` (settings tabs). */
export function SettingsSingleLineTextField({
  style,
  shellStyle,
  plain = false,
  placeholderTextColor = APP_SHELL_INPUT_PLACEHOLDER_COLOR,
  ...rest
}: SingleLineProps) {
  return (
    <View style={[styles.singleShell, shellStyle]}>
      {plain ? null : (
        <Image
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          source={BG_LONG}
          style={StyleSheet.absoluteFillObject}
          contentFit="fill"
        />
      )}
      <TextInput
        placeholderTextColor={placeholderTextColor}
        style={[styles.singleInput, style]}
        underlineColorAndroid="transparent"
        {...SINGLE_LINE_ANDROID}
        {...rest}
      />
    </View>
  );
}

type BioProps = TextInputProps & {
  shellStyle?: StyleProp<ViewStyle>;
  /** No frame image: the shell's own border (via `shellStyle`) frames it. */
  plain?: boolean;
};

/** Profile bio: `text-input-tall-big.png`. */
export function SettingsBioTextField({
  style,
  shellStyle,
  plain = false,
  placeholderTextColor = APP_SHELL_INPUT_PLACEHOLDER_COLOR,
  multiline = true,
  textAlignVertical = "top",
  ...rest
}: BioProps) {
  return (
    <View style={[styles.bioShell, shellStyle]}>
      {plain ? null : (
        <Image
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          source={BG_TALL_BIO}
          style={StyleSheet.absoluteFillObject}
          contentFit="fill"
        />
      )}
      <TextInput
        placeholderTextColor={placeholderTextColor}
        style={[styles.bioInput, style]}
        multiline={multiline}
        textAlignVertical={textAlignVertical}
        underlineColorAndroid="transparent"
        {...Platform.select({
          android: { includeFontPadding: false },
          default: {},
        })}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  singleShell: {
    alignSelf: "stretch",
    height: 52,
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
  },
  singleInput: {
    width: "100%",
    height: 52,
    paddingHorizontal: 18,
    paddingVertical: 0,
    backgroundColor: "transparent",
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 14,
  },
  bioShell: {
    alignSelf: "stretch",
    minHeight: 132,
    borderRadius: 12,
    overflow: "hidden",
  },
  bioInput: {
    width: "100%",
    minHeight: 132,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "transparent",
    color: APP_SHELL_MAIN_TEXT_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    lineHeight: 20,
  },
});
