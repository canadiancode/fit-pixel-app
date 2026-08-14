/**
 * Public Supabase config only. Never read a service-role key in the app.
 */
export function getSupabasePublicConfig(): {
  url: string;
  anonKey: string;
} | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    return null;
  }
  return { url: url.replace(/\/$/, ""), anonKey };
}

export const AUTH_CALLBACK_URL = "https://api.aurashields.com/auth/callback";
