import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import { FONT_FAMILY } from "@/constants/fonts";
import type { HealthPlatform } from "@/hooks/health-metrics-types";

import { FoodLimePillButton } from "./food-lime-pill-button";

const CARD_TITLE = "Connect a device";

const PLATFORM_LABELS: Record<HealthPlatform, string> = {
  "apple-health": "Apple Health",
  "health-connect": "Health Connect",
  none: "Apple Health or Health Connect",
};

type Props = {
  platform: HealthPlatform;
};

/**
 * Shown on the Heart screen when no resting HR is available: either health
 * access is off or no watch/tracker has written a reading yet.
 */
export function HeartConnectDeviceCard({ platform }: Props) {
  const source = PLATFORM_LABELS[platform];
  const body = `Resting heart rate comes from a watch or tracker through ${source}. Wear one, then let Fit Pixel read Resting Heart Rate.`;

  return (
    <View style={styles.section}>
      <View accessible accessibilityLabel={`${CARD_TITLE}. ${body}`} style={styles.copy}>
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.title}
          accessibilityRole="header"
        >
          {CARD_TITLE}
        </ThemedText>
        <Text style={styles.body}>{body}</Text>
      </View>
      <FoodLimePillButton
        title="Health settings"
        accessibilityLabel="Open health and wearables settings"
        onPress={() => router.push("/(tabs)/settings/health")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    alignSelf: "stretch",
    paddingVertical: 8,
    gap: 14,
  },
  copy: {
    gap: 8,
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  body: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
    color: APP_SHELL_LABEL_COLOR,
    textAlign: "center",
  },
});
