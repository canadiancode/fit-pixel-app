import { Stack } from "expo-router";

import { APP_SHELL_SECONDARY_BACKGROUND } from "@/constants/app-colors";

export const unstable_settings = {
  initialRouteName: "sign-in",
};

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        contentStyle: {
          flex: 1,
          backgroundColor: APP_SHELL_SECONDARY_BACKGROUND,
        },
      }}
    />
  );
}
