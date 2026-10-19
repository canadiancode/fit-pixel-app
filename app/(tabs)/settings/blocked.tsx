import { BlockedPixelsList } from "@/features/settings/components/blocked-pixels-list";
import { SettingsSubScreenLayout } from "@/features/settings/components/settings-sub-screen-layout";

export default function BlockedPixelsSettingsScreen() {
  return (
    <SettingsSubScreenLayout>
      <BlockedPixelsList />
    </SettingsSubScreenLayout>
  );
}
