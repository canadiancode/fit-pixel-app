import * as Notifications from "expo-notifications";

/** Routed by the push response handler to the Weight screen. */
export const WEIGH_IN_REMINDER_KIND = "weigh_in_reminder";
const REMINDER_HOUR = 8;

/**
 * Schedule the repeating weigh-in-day reminder (8 AM local on `weekday`,
 * 0 = Sunday). Returns the notification id, or null without permission.
 */
export async function scheduleWeighInReminder(
  weekday: number,
): Promise<string | null> {
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permission.granted) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Weigh-in day",
      body: "Step on the scale and log this week's weigh-in to keep your streak going.",
      data: { kind: WEIGH_IN_REMINDER_KIND },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      // expo-notifications weekdays are 1 = Sunday … 7 = Saturday.
      weekday: weekday + 1,
      hour: REMINDER_HOUR,
      minute: 0,
    },
  });
}

export async function cancelWeighInReminder(id: string | null): Promise<void> {
  if (id == null) return;
  await Notifications.cancelScheduledNotificationAsync(id).catch(
    () => undefined,
  );
}
