import { useLocalSearchParams, useRouter } from "expo-router";

import { AUTH_COPY } from "@/features/auth/auth-errors";
import {
  AuthMessage,
  AuthPrimaryButton,
  AuthScreenShell,
} from "@/features/auth/components/auth-screen-shell";

export default function CheckEmailScreen() {
  const router = useRouter();
  useLocalSearchParams<{ email?: string }>();

  return (
    <AuthScreenShell title="Check your email">
      <AuthMessage>{AUTH_COPY.checkEmail}</AuthMessage>
      <AuthPrimaryButton
        label="Back to sign in"
        onPress={() => router.replace("/(auth)/sign-in")}
      />
    </AuthScreenShell>
  );
}
