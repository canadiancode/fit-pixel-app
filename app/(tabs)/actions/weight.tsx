import { StyleSheet, View } from "react-native";

import { WeightManualConnectedSection } from "@/features/actions/components/action-manual-connected-section";
import { ActionsSubScreenLayout } from "@/features/actions/components/actions-sub-screen-layout";
import { WeightAddCard } from "@/features/actions/components/weight-add-card";
import { WeightSettingsSection } from "@/features/actions/components/weight-settings-section";
import { WeightSummaryCard } from "@/features/actions/components/weight-summary-card";
import { WeightTargetSection } from "@/features/actions/components/weight-target-section";
import { WeightTrendSection } from "@/features/actions/components/weight-trend-section";

/** Weight is a long-term journey: weekly weigh-ins, milestones, and a trend. */
export default function WeightActionScreen() {
  return (
    <ActionsSubScreenLayout>
      <View style={styles.cards}>
        <WeightSummaryCard />
        <WeightAddCard />
        <WeightManualConnectedSection />
        <WeightTrendSection />
        <WeightTargetSection />
        <WeightSettingsSection />
      </View>
    </ActionsSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  cards: {
    gap: 12,
  },
});
