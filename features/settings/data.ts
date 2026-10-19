export const SETTINGS_ROWS = [
  {
    id: "profile",
    label: "Profile",
    caption: "Display name, bio, home gym, visibility",
  },
  {
    id: "health",
    label: "Health & wearables",
    caption: "Apple Health",
  },
  {
    id: "notifications",
    label: "Notifications",
    caption: "Accountability reminders, news & updates, etc",
  },
  {
    id: "social",
    label: "Social medias",
    caption: "Instagram, TikTok, YouTube links",
  },
  {
    id: "preferences",
    label: "Preferences",
    caption: "Unit, theme, etc",
  },
  {
    id: "blocked",
    label: "Blocked Pixels",
    caption: "People you've blocked in chat",
  },
  {
    id: "account",
    label: "Account info",
    caption: "Email, password, delete account",
  },
  {
    id: "legal",
    label: "Privacy & terms",
    caption: "Privacy Policy, Terms of Use",
  },
  {
    id: "sign-out",
    label: "Sign out",
    caption: "End session on device",
  },
] as const;

export type SettingsRouteId = (typeof SETTINGS_ROWS)[number]["id"];

export function getSettingsRow(id: SettingsRouteId) {
  const row = SETTINGS_ROWS.find((r) => r.id === id);
  if (!row) {
    throw new Error(`Unknown settings route: ${id}`);
  }
  return row;
}
