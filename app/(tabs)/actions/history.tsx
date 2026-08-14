import { useLocalSearchParams } from "expo-router";

import { ActionsHistoryComingSoon } from "@/features/actions/components/actions-history-coming-soon";

export default function ActionHistoryComingSoonScreen() {
  const { title: titleParam } = useLocalSearchParams<{ title?: string }>();
  const title = (Array.isArray(titleParam) ? titleParam[0] : titleParam)?.trim();

  return <ActionsHistoryComingSoon title={title || "History"} />;
}
