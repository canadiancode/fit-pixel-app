/** Groups on the Settings list, in display order. */
export const SETTINGS_GROUPS = [
  { id: "you", label: "you" },
  { id: "app", label: "app" },
  { id: "safety", label: "privacy & safety" },
  { id: "account", label: "account" },
] as const;

export type SettingsGroupId = (typeof SETTINGS_GROUPS)[number]["id"];

export const SETTINGS_ROWS = [
  {
    id: "profile",
    group: "you",
    label: "Profile",
    caption: "Name, bio, home gym and who can see them",
  },
  {
    id: "social",
    group: "you",
    label: "Social medias",
    caption: "Instagram, TikTok and YouTube",
  },
  {
    id: "health",
    group: "app",
    label: "Health & wearables",
    caption: "Apple Health access and data sources",
  },
  {
    id: "notifications",
    group: "app",
    label: "Notifications",
    caption: "Messages and friend requests",
  },
  {
    id: "preferences",
    group: "app",
    label: "Preferences",
    caption: "Units and when your day starts",
  },
  {
    id: "blocked",
    group: "safety",
    label: "Blocked Pixels",
    caption: "People you've blocked in chat",
  },
  {
    id: "legal",
    group: "safety",
    label: "Privacy & terms",
    caption: "Privacy Policy and Terms of Use",
  },
  {
    id: "account",
    group: "account",
    label: "Account info",
    caption: "Email, password, backup, delete account",
  },
  {
    id: "sign-out",
    group: "account",
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
