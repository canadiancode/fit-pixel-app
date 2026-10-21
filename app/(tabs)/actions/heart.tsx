import { StyleSheet, View } from "react-native";

import { ActionsSubScreenLayout } from "@/features/actions/components/actions-sub-screen-layout";
import { HeartConnectDeviceCard } from "@/features/actions/components/heart-connect-device-card";
import { HeartSummaryCard } from "@/features/actions/components/heart-summary-card";
import { HeartWeeklyHistorySection } from "@/features/actions/components/heart-weekly-history-section";
import { useDashboardHealthMetrics } from "@/hooks/use-dashboard-health-metrics";
import { useRestingHeartRateWeek } from "@/hooks/use-resting-heart-rate-week";

/** Read-only: resting HR is a device estimate, so there is no add card or target. */
export default function HeartActionScreen() {
  const { metrics, connectivity, isLoading, healthPlatform } =
    useDashboardHealthMetrics();
  const connected = connectivity.restingHeartRateBpm;
  const { days } = useRestingHeartRateWeek(connected);

  return (
    <ActionsSubScreenLayout>
      <View style={styles.cards}>
        <HeartSummaryCard
          bpm={connected ? metrics.restingHeartRateBpm : null}
          days={days}
        />
        {connected ? (
          <HeartWeeklyHistorySection days={days} />
        ) : isLoading ? null : (
          <HeartConnectDeviceCard platform={healthPlatform} />
        )}
      </View>
    </ActionsSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  cards: {
    gap: 12,
  },
});
