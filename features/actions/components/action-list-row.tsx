import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ActionProgressBar } from "@/components/action-progress-bar";
import { ThemedText } from "@/components/themed-text";
import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";

import {
  ACTION_CARD_GEAR_ICON,
  ACTION_CARD_PLUS_ICON,
  ACTION_ROW_BACKGROUND,
} from "../constants";
import { ACTION_ROWS, getActionRowBarSources } from "../data";
import { useActionProgress } from "../use-action-progress";
import { ActionRowProgressLabel } from "./action-row-progress-label";

type ActionRow = (typeof ACTION_ROWS)[number];

type Props = {
  row: ActionRow;
};

export function ActionListRow({ row }: Props) {
  const { progressLabel, barFillPercent } = useActionProgress(row.id);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.label}. ${progressLabel}`}
      android_ripple={{ color: "rgba(255,255,255,0.12)" }}
      style={({ pressed }) => [
        styles.listRow,
        styles.listRowWithImageBg,
        pressed && styles.listRowPressed,
      ]}
      onPress={() => {
        router.push(`/(tabs)/actions/${row.id}`);
      }}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.listRowImageShell}
      >
        <Image
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          source={ACTION_ROW_BACKGROUND}
          style={StyleSheet.absoluteFillObject}
          contentFit="fill"
        />
        <View style={styles.listRowImageInner}>
          <View style={styles.listRowLeading}>
            <Image
              accessibilityIgnoresInvertColors
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              source={row.icon}
              style={styles.listRowIcon}
              contentFit="contain"
            />
            <View style={styles.listRowTextColumn}>
              <ThemedText
                lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                style={styles.listRowLabel}
              >
                {row.label}
              </ThemedText>
              <ActionProgressBar
                sources={getActionRowBarSources(row)}
                fillPercent={barFillPercent}
                style={styles.listRowBar}
              />
              <ActionRowProgressLabel actionId={row.id} />
            </View>
          </View>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.listRowActions}
          >
            <Image
              accessibilityIgnoresInvertColors
              source={ACTION_CARD_GEAR_ICON}
              style={styles.listRowActionIcon}
              contentFit="contain"
            />
            <Image
              accessibilityIgnoresInvertColors
              source={ACTION_CARD_PLUS_ICON}
              style={styles.listRowActionIcon}
              contentFit="contain"
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listRow: {
    justifyContent: "center",
    borderRadius: 12,
    overflow: "hidden",
    alignSelf: "stretch",
  },
  listRowWithImageBg: {
    padding: 0,
  },
  listRowImageShell: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  listRowImageInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingLeft: 28,
    paddingRight: 20,
  },
  listRowLeading: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  listRowTextColumn: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  listRowBar: {
    alignSelf: "stretch",
  },
  listRowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
    marginLeft: 8,
  },
  listRowActionIcon: {
    width: 40,
    height: 40,
  },
  listRowIcon: {
    width: 56,
    height: 56,
    flexShrink: 0,
  },
  listRowPressed: {
    opacity: 0.85,
  },
  listRowLabel: {
    fontSize: 15,
    lineHeight: 22,
  },
});
