import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "./config";
import { supabaseSecureStore } from "./storage";

let client: SupabaseClient | null | undefined;

/**
 * Anon-key browser/mobile client. Null when public env is missing (fail closed —
 * no dummy client). Never uses the service role.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) {
    return client;
  }

  const config = getSupabasePublicConfig();
  if (!config) {
    client = null;
    return null;
  }

  client = createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      /** Implicit so recovery emails redirect with hash tokens the HTTPS callback can use. */
      flowType: "implicit",
      storage: supabaseSecureStore,
    },
  });
  return client;
}
