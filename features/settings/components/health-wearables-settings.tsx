import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  APP_SHELL_INPUT_BOARDER_COLOR,
  APP_SHELL_LABEL_COLOR,
  APP_SHELL_MAIN_TEXT_COLOR,
} from "@/constants/app-colors";
import {
  type DashboardHealthConnectivity,
  type HealthAuthorizationStatus,
  type HealthPlatform,
  useDashboardHealthMetrics,
} from "@/hooks/use-dashboard-health-metrics";

const METRIC_ROWS: {
  key: keyof DashboardHealthConnectivity;
  label: string;
}[] = [
  { key: "restingHeartRateBpm", label: "Resting heart rate" },
  { key: "weightLbs", label: "Weight" },
  { key: "steps", label: "Steps (today)" },
  { key: "activeEnergyKcal", label: "Active energy (today)" },
  { key: "sleep", label: "Sleep analysis" },
];

function platformTitle(platform: HealthPlatform): string {
  if (platform === "health-connect") return "Health Connect";
  if (platform === "apple-health") return "Apple Health";
  return "Health";
}

function authorizationSummary(
  platform: HealthPlatform,
  status: HealthAuthorizationStatus | null,
): string {
  if (status == null) return "Checking Health access…";
  const store =
    platform === "health-connect"
      ? "Health Connect"
      : platform === "apple-health"
        ? "Apple Health"
        : "Health";
  switch (status) {
    case "shouldRequest":
      return `${store} has not received a permission decision yet for this app.`;
    case "unnecessary":
      return `Access has been presented to ${store}. You can refine which categories are shared in ${store}.`;
    default:
      return "Health permission status is unknown.";
  }
}

function availabilityCopy(
  platform: HealthPlatform,
  available: boolean | null,
): string {
  const store = platformTitle(platform);
  if (available === null) {
    return `Checking whether ${store} is available…`;
  }
  if (available) {
    return `Health data is available on this device.`;
  }
  if (platform === "health-connect") {
    return "Health Connect is not available on this device. Install or update Health Connect, then return here.";
  }
  return "Health data is not available on this device (e.g. restricted or unsupported).";
}

function formatFriendlyLastUpdated(d: Date): string {
  const nowMs = Date.now();
  const diffMs = nowMs - d.getTime();
  if (diffMs < 0 || !Number.isFinite(diffMs)) {
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  const diffM = Math.floor(diffMs / 60_000);
  if (diffM < 1) return "just now";
  if (diffM < 60) return `${diffM} min ago`;

  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) {
    return diffH === 1 ? "1 hour ago" : `${diffH} hours ago`;
  }

  const diffDays = Math.floor(diffH / 24);
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function HealthWearablesSettings() {
  const {
    connectivity,
    isLoading,
    healthDataAvailable,
    authorizationRequestStatus,
    healthContributors,
    healthPlatform,
    openHealthSettings,
  } = useDashboardHealthMetrics();

  if (healthPlatform === "none") {
    return (
      <View style={styles.block}>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.body}
        >
          Wearable health data is available on iPhone (Apple Health) and Android
          (Health Connect).
        </ThemedText>
      </View>
    );
  }

  const title = platformTitle(healthPlatform);
  const liveSource =
    healthPlatform === "health-connect" ? "Health Connect" : "HealthKit";

  return (
    <View style={styles.block}>
      <View>
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.sectionTitle}
        >
          {title}
        </ThemedText>
        <View style={styles.availabilityRow}>
          {isLoading && healthDataAvailable === null ? (
            <ActivityIndicator
              color={APP_SHELL_MAIN_TEXT_COLOR}
              style={styles.inlineSpinner}
            />
          ) : null}
          <ThemedText
            lightColor={APP_SHELL_LABEL_COLOR}
            darkColor={APP_SHELL_LABEL_COLOR}
            style={[styles.body, styles.availabilityText]}
          >
            {availabilityCopy(healthPlatform, healthDataAvailable)}
          </ThemedText>
        </View>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={[styles.body, styles.sectionGap]}
        >
          {authorizationSummary(healthPlatform, authorizationRequestStatus)}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            healthPlatform === "health-connect"
              ? "Open Health Connect settings"
              : "Open system settings for this app"
          }
          onPress={openHealthSettings}
          style={({ pressed }) => [
            styles.settingsLink,
            pressed && styles.settingsLinkPressed,
          ]}
        >
          <ThemedText
            lightColor={APP_SHELL_MAIN_TEXT_COLOR}
            darkColor={APP_SHELL_MAIN_TEXT_COLOR}
            style={styles.settingsLinkLabel}
          >
            {healthPlatform === "health-connect"
              ? "Open Health Connect"
              : "Open app settings"}
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.section}>
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.sectionTitle}
        >
          Dashboard metrics
        </ThemedText>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.body}
        >
          Categories this app reads. “Live” means we received {liveSource} data
        </ThemedText>
        <View style={[styles.metricList, styles.sectionGap]}>
          {isLoading ? (
            <ActivityIndicator color={APP_SHELL_MAIN_TEXT_COLOR} />
          ) : (
            METRIC_ROWS.map((m) => {
              const ok = connectivity[m.key];
              return (
                <View key={m.key} style={styles.metricRow}>
                  <ThemedText
                    lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                    darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                    style={styles.metricLabel}
                  >
                    {m.label}
                  </ThemedText>
                  <ThemedText
                    lightColor={ok ? "#7dffb3" : APP_SHELL_LABEL_COLOR}
                    darkColor={ok ? "#7dffb3" : APP_SHELL_LABEL_COLOR}
                    style={styles.metricState}
                  >
                    {ok ? "Live" : "No data"}
                  </ThemedText>
                </View>
              );
            })
          )}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText
          lightColor={APP_SHELL_MAIN_TEXT_COLOR}
          darkColor={APP_SHELL_MAIN_TEXT_COLOR}
          style={styles.sectionTitle}
        >
          Recent data sources
        </ThemedText>
        <ThemedText
          lightColor={APP_SHELL_LABEL_COLOR}
          darkColor={APP_SHELL_LABEL_COLOR}
          style={styles.body}
        >
          Devices and apps seen in the last 14 days from your steps, resting
          heart rate, weight, and sleep data.
        </ThemedText>
        {healthContributors.length === 0 ? (
          <ThemedText
            lightColor={APP_SHELL_LABEL_COLOR}
            darkColor={APP_SHELL_LABEL_COLOR}
            style={[styles.body, styles.sectionGap]}
          >
            {isLoading
              ? "Loading…"
              : "No contributing sources found yet, or access is limited for the categories above."}
          </ThemedText>
        ) : (
          <View style={[styles.sourceList, styles.sectionGap]}>
            {healthContributors.map((c) => (
              <View key={c.id} style={styles.sourceCard}>
                <ThemedText
                  lightColor={APP_SHELL_MAIN_TEXT_COLOR}
                  darkColor={APP_SHELL_MAIN_TEXT_COLOR}
                  style={styles.sourceTitle}
                >
                  {c.displayTitle}
                </ThemedText>
                {c.subtitle ? (
                  <ThemedText
                    lightColor={APP_SHELL_LABEL_COLOR}
                    darkColor={APP_SHELL_LABEL_COLOR}
                    style={styles.sourceMeta}
                  >
                    {c.subtitle}
                  </ThemedText>
                ) : null}
                <ThemedText
                  lightColor={APP_SHELL_LABEL_COLOR}
                  darkColor={APP_SHELL_LABEL_COLOR}
                  style={styles.sourceMeta}
                >
                  Last updated {formatFriendlyLastUpdated(c.lastSeenAt)}
                </ThemedText>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 10,
    paddingBottom: 28,
  },
  section: {
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: APP_SHELL_INPUT_BOARDER_COLOR,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
  },
  sectionGap: {
    marginTop: 4,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inlineSpinner: {
    marginVertical: 2,
  },
  availabilityText: {
    flex: 1,
  },
  settingsLink: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  settingsLinkPressed: {
    opacity: 0.85,
  },
  settingsLinkLabel: {
    fontSize: 14,
    lineHeight: 20,
    textDecorationLine: "underline",
  },
  metricList: {
    gap: 0,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: APP_SHELL_INPUT_BOARDER_COLOR,
  },
  metricLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    paddingRight: 12,
  },
  metricState: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  sourceList: {
    gap: 10,
  },
  sourceCard: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: APP_SHELL_INPUT_BOARDER_COLOR,
    padding: 12,
    gap: 4,
  },
  sourceTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  sourceMeta: {
    fontSize: 12,
    lineHeight: 17,
  },
});
