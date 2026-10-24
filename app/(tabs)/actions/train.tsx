import { StyleSheet, View } from "react-native";

import { ActionsSubScreenLayout } from "@/features/actions/components/actions-sub-screen-layout";
import { TrainAddCard } from "@/features/actions/components/train-add-card";
import { TrainDailyTargetSection } from "@/features/actions/components/train-daily-target-section";
import { TrainSummaryCard } from "@/features/actions/components/train-summary-card";
import { TrainWeeklyHistorySection } from "@/features/actions/components/train-weekly-history-section";
import { TrainPlanSection } from "@/features/training/components/train-plan-section";

export default function TrainActionScreen() {
  return (
    <ActionsSubScreenLayout>
      <View style={styles.cards}>
        <TrainPlanSection />
        <TrainSummaryCard />
        <TrainAddCard />
        <TrainWeeklyHistorySection />
        <TrainDailyTargetSection />
      </View>
    </ActionsSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  cards: {
    gap: 12,
  },
});
