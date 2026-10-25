import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_LABEL_COLOR } from "@/constants/app-colors";

type Props = {
  label: string;
};

export function ActionListSectionDivider({ label }: Props) {
  return (
    <View
      style={styles.root}
      accessibilityRole="header"
      accessibilityLabel={label}
    >
      <View style={styles.line} />
      <ThemedText
        lightColor={APP_SHELL_LABEL_COLOR}
        darkColor={APP_SHELL_LABEL_COLOR}
        style={styles.label}
      >
        {label}
      </ThemedText>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  /** One art pixel (2 pt) tall, in the frames' rim blue. */
  line: {
    flex: 1,
    height: 2,
    backgroundColor: "#0b4f96",
  },
  label: {
    flexShrink: 0,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.3,
    textTransform: "lowercase",
  },
});
