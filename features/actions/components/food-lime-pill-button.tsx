import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";

import { FOOD_ADD_ACTION_BUTTON_BACKGROUND } from "../constants";
import {
  ProgressAddFeedbackView,
  type ProgressAddFeedback,
} from "./progress-add-feedback";

type Props = {
  title: string;
  onPress: () => void;
  accessibilityLabel?: string;
  /** Lets the pill pop and flash when it adds to today's progress. */
  feedback?: ProgressAddFeedback;
};

/** Full-width pill using the same lime asset as “Search for food” on the food hub. */
export function FoodLimePillButton({
  title,
  onPress,
  accessibilityLabel,
  feedback,
}: Props) {
  const content = (
    <>
      <Image
        accessibilityIgnoresInvertColors
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        source={FOOD_ADD_ACTION_BUTTON_BACKGROUND}
        style={StyleSheet.absoluteFillObject}
        contentFit="fill"
      />
      <ThemedText
        lightColor={APP_SHELL_MAIN_TEXT_COLOR}
        darkColor={APP_SHELL_MAIN_TEXT_COLOR}
        style={styles.label}
        numberOfLines={2}
      >
        {title}
      </ThemedText>
    </>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.outer, pressed && styles.outerPressed]}
    >
      {feedback != null ? (
        <ProgressAddFeedbackView feedback={feedback} style={styles.shell}>
          {content}
        </ProgressAddFeedbackView>
      ) : (
        <View style={styles.shell}>{content}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignSelf: "stretch",
  },
  outerPressed: {
    opacity: 0.88,
  },
  shell: {
    width: "100%",
    minHeight: 48,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  label: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    fontWeight: "600",
  },
});
