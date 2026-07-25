import { StyleSheet, Text, View } from "react-native";

import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";

import type { ActionRouteId } from "../data";
import { useActionProgress } from "../use-action-progress";

type Props = {
  actionId: ActionRouteId;
};

export function ActionRowProgressLabel({ actionId }: Props) {
  const { current, rest, accentColor } = useActionProgress(actionId);

  return (
    <View style={styles.row}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        ellipsizeMode="tail"
      >
        <Text style={[styles.current, { color: accentColor }]}>{current}</Text>
        <Text style={styles.rest}>{rest}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: "stretch",
    minWidth: 0,
  },
  current: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 0,
  },
  rest: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 0,
    color: APP_SHELL_MAIN_TEXT_COLOR,
  },
});
