import { Image } from "expo-image";
import type { ImageSourcePropType } from "react-native";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import { FoodLimePillButton } from "@/features/actions/components/food-lime-pill-button";

type Props = {
  icon: ImageSourcePropType;
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
};

/** Centered "nothing here yet" block with an optional lime call to action. */
export function ChatEmptyState({ icon, title, body, action }: Props) {
  return (
    <View style={styles.root}>
      <Image
        source={icon}
        style={styles.icon}
        contentFit="contain"
        accessibilityIgnoresInvertColors
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <ThemedText
        lightColor={APP_SHELL_MAIN_TEXT_COLOR}
        darkColor={APP_SHELL_MAIN_TEXT_COLOR}
        style={styles.title}
        accessibilityRole="header"
      >
        {title}
      </ThemedText>
      <ThemedText
        lightColor={APP_SHELL_LABEL_COLOR}
        darkColor={APP_SHELL_LABEL_COLOR}
        style={styles.body}
      >
        {body}
      </ThemedText>
      {action ? (
        <View style={styles.action}>
          <FoodLimePillButton title={action.label} onPress={action.onPress} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    paddingTop: 36,
    paddingHorizontal: 12,
    gap: 12,
  },
  icon: {
    width: 56,
    height: 56,
    marginBottom: 4,
  },
  title: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  body: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
  },
  action: {
    alignSelf: "stretch",
    marginTop: 8,
  },
});
