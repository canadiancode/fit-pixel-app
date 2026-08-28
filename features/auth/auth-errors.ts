/**
 * Calm, anti-enumeration copy. Map by status/code only — never surface
 * Supabase messages, tokens, or passwords.
 */

export const AUTH_COPY = {
  invalidCredentials: "Email or password is incorrect.",
  emailNotConfirmed:
    "Check your email to confirm this account, then sign in.",
  signUpFailed:
    "Could not create an account. Try signing in, or reset your password.",
  resetSent:
    "If an account exists for that email, we sent a reset link. Open it in the browser, then return to Fit Pixel.",
  network: "Could not reach the server. Check your connection.",
  rateLimit: "Too many attempts. Try again in a few minutes.",
  notConfigured: "Account sign-in is not configured in this build.",
  weakPassword: "Use at least 8 characters.",
  misconfigured:
    "Account sign-in is not configured in this build. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (never a service-role key).",
  checkEmail:
    "Open the link, then return here and sign in.",
} as const;

export type AuthFlow = "signIn" | "signUp" | "reset";

type AuthLike = {
  status?: number;
  code?: string;
  name?: string;
};

function asAuthLike(error: unknown): AuthLike | null {
  if (error == null || typeof error !== "object") {
    return null;
  }
  const rec = error as {
    status?: unknown;
    code?: unknown;
    name?: unknown;
  };
  return {
    status: typeof rec.status === "number" ? rec.status : undefined,
    code: typeof rec.code === "string" ? rec.code : undefined,
    name: typeof rec.name === "string" ? rec.name : undefined,
  };
}

function isNetwork(auth: AuthLike): boolean {
  if (auth.name === "AuthRetryableFetchError") {
    return true;
  }
  if (auth.status === 0) {
    return true;
  }
  if (auth.status == null && auth.code == null) {
    return true;
  }
  return false;
}

function isRateLimit(auth: AuthLike): boolean {
  if (auth.status === 429) {
    return true;
  }
  return (
    auth.code === "over_request_rate_limit" ||
    auth.code === "over_email_send_rate_limit"
  );
}

/** Network / rate-limit only — other reset errors must not reveal whether the email exists. */
export function isSurfacedResetError(error: unknown): boolean {
  const auth = asAuthLike(error);
  if (auth == null) {
    return true;
  }
  return isNetwork(auth) || isRateLimit(auth);
}

export function mapAuthError(error: unknown, flow: AuthFlow): string {
  const auth = asAuthLike(error);
  if (auth == null) {
    return AUTH_COPY.network;
  }
  if (isNetwork(auth)) {
    return AUTH_COPY.network;
  }
  if (isRateLimit(auth)) {
    return AUTH_COPY.rateLimit;
  }
  if (auth.code === "weak_password") {
    return AUTH_COPY.weakPassword;
  }
  if (auth.code === "email_not_confirmed") {
    return AUTH_COPY.emailNotConfirmed;
  }

  if (flow === "signUp") {
    return AUTH_COPY.signUpFailed;
  }
  if (flow === "reset") {
    return AUTH_COPY.resetSent;
  }
  return AUTH_COPY.invalidCredentials;
}
