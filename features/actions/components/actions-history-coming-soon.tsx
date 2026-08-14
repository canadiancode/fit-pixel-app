import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";

import { ActionsSubScreenLayout } from "./actions-sub-screen-layout";

type Props = {
  title: string;
};

/** Placeholder for longer-range habit history until that tool is built. */
export function ActionsHistoryComingSoon({ title }: Props) {
  return (
    <ActionsSubScreenLayout>
      <View style={styles.block}>
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
          This tool will be available later.
        </ThemedText>
      </View>
    </ActionsSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 8,
    alignSelf: "stretch",
  },
  title: {
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  body: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    lineHeight: 20,
  },
});
