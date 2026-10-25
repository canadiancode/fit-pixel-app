import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

import { PixelBackButton } from "@/components/pixel-panel";
import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";

/** Same lime asset as food “Search for food”. */
const ENTER_SHOP_BUTTON_BACKGROUND = require("@/assets/backgrounds/add-action.png");

type TrailingAction = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
};

type Props = {
  onBack: () => void;
  accessibilityLabel?: string;
  trailingAction?: TrailingAction;
};

/** Shared back toolbar for pixel customize sub-screens. */
export function PixelSubScreenToolbar({
  onBack,
  accessibilityLabel = "Back",
  trailingAction,
}: Props) {
  return (
    <View style={styles.toolbar}>
      <PixelBackButton
        onPress={onBack}
        accessibilityLabel={accessibilityLabel}
        size={40}
      />
      {trailingAction != null ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            trailingAction.accessibilityLabel ?? trailingAction.label
          }
          hitSlop={4}
          onPress={trailingAction.onPress}
          style={({ pressed }) => [
            styles.trailingOuter,
            pressed && styles.trailingPressed,
          ]}
        >
          <View style={styles.trailingShell}>
            <Image
              accessibilityIgnoresInvertColors
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              source={ENTER_SHOP_BUTTON_BACKGROUND}
              style={StyleSheet.absoluteFillObject}
              contentFit="fill"
            />
            <ThemedText
              lightColor={APP_SHELL_MAIN_TEXT_COLOR}
              darkColor={APP_SHELL_MAIN_TEXT_COLOR}
              style={styles.trailingLabel}
              numberOfLines={1}
            >
              {trailingAction.label}
            </ThemedText>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
    /** Dark pixel groove under the toolbar. */
    borderBottomWidth: 2,
    borderBottomColor: "#011a3a",
  },
  trailingOuter: {
    flexShrink: 0,
  },
  trailingPressed: {
    opacity: 0.88,
  },
  trailingShell: {
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
  },
  trailingLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    fontWeight: "600",
  },
});
