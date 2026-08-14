import type { Href } from "expo-router";

/** Shared coming-soon history screen under `app/(tabs)/actions/history`. */
export const ACTION_HISTORY_HREF = "/(tabs)/actions/history" as const;

export function actionHistoryHref(title: string): Href {
  return {
    pathname: ACTION_HISTORY_HREF,
    params: { title },
  };
}
