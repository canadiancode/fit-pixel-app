import { Fragment } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { APP_SHELL_MAIN_TEXT_COLOR } from "@/constants/app-colors";
import {
  SETTINGS_SUCCESS_COLOR,
  SettingsDivider,
  SettingsIntro,
  SettingsLinkRow,
  SettingsSection,
  SettingsValueRow,
} from "@/features/settings/components/settings-ui";
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
      <SettingsIntro>
        Wearable health data is available on iPhone (Apple Health) and Android
        (Health Connect).
      </SettingsIntro>
    );
  }

  const title = platformTitle(healthPlatform);
  const liveCount = METRIC_ROWS.filter((m) => connectivity[m.key]).length;

  return (
    <View style={styles.root}>
      <SettingsIntro>
        {`Fit Pixel reads your health data to fill in your dashboard and goals. It never writes to ${title}.`}
      </SettingsIntro>

      <SettingsSection
        title="connection"
        footer={authorizationSummary(healthPlatform, authorizationRequestStatus)}
      >
        <SettingsValueRow
          title={title}
          description={availabilityCopy(healthPlatform, healthDataAvailable)}
          value={
            healthDataAvailable == null
              ? "..."
              : healthDataAvailable
                ? `${liveCount}/${METRIC_ROWS.length} live`
                : "Off"
          }
          valueColor={liveCount > 0 ? SETTINGS_SUCCESS_COLOR : undefined}
        />
        <SettingsDivider />
        <SettingsLinkRow
          title={
            healthPlatform === "health-connect"
              ? "Open Health Connect"
              : "Manage access"
          }
          description={
            healthPlatform === "health-connect"
              ? "Choose which data Fit Pixel can read."
              : "Choose which data Fit Pixel can read in Settings → Health."
          }
          onPress={openHealthSettings}
          accessibilityLabel={
            healthPlatform === "health-connect"
              ? "Open Health Connect settings"
              : "Open system settings for this app"
          }
        />
      </SettingsSection>

      <SettingsSection
        title="dashboard metrics"
        footer={`"Live" means we received ${healthPlatform === "health-connect" ? "Health Connect" : "Apple Health"} data for it.`}
      >
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={APP_SHELL_MAIN_TEXT_COLOR} />
          </View>
        ) : (
          METRIC_ROWS.map((m, index) => {
            const ok = connectivity[m.key];
            return (
              <Fragment key={m.key}>
                {index > 0 ? <SettingsDivider /> : null}
                <SettingsValueRow
                  title={m.label}
                  value={ok ? "Live" : "No data"}
                  valueColor={ok ? SETTINGS_SUCCESS_COLOR : undefined}
                />
              </Fragment>
            );
          })
        )}
      </SettingsSection>

      <SettingsSection
        title="recent sources"
        footer="Devices and apps that sent steps, resting heart rate, weight or sleep in the last 14 days."
      >
        {healthContributors.length === 0 ? (
          <SettingsValueRow
            title={isLoading ? "Loading..." : "No sources yet"}
            description={
              isLoading
                ? null
                : "Nothing found, or access is limited for the categories above."
            }
            value=""
          />
        ) : (
          healthContributors.map((c, index) => (
            <Fragment key={c.id}>
              {index > 0 ? <SettingsDivider /> : null}
              <SettingsValueRow
                title={c.displayTitle}
                description={[c.subtitle, `Updated ${formatFriendlyLastUpdated(c.lastSeenAt)}`]
                  .filter(Boolean)
                  .join(" · ")}
                value=""
              />
            </Fragment>
          ))
        )}
      </SettingsSection>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 28,
  },
  loading: {
    paddingVertical: 20,
  },
});
