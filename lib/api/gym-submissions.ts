import { FitPixelApiError, fitPixelFetch } from "./client";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { GymKind } from "@/features/map/gym-filters";

/**
 * Gyms suggested from the Map tab. They stay pending until the owner approves
 * them in fit-pixel-dashboard, which adds them to GET /v1/gyms for everyone.
 */

export type GymSubmissionStatus = "pending" | "approved" | "rejected";

export type GymSubmission = {
  id: string;
  name: string;
  address: string | null;
  kind: GymKind | null;
  notes: string | null;
  latitude: number;
  longitude: number;
  status: GymSubmissionStatus;
  /** Why it was rejected, or a note on approval. */
  reviewerNotes: string | null;
  /** The live gym, once approved. */
  gymId: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type NewGymSubmission = {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  kind?: GymKind;
  notes?: string;
};

/** Mirrors the server's GYM_SUBMISSION_LIMITS. */
export const GYM_SUBMISSION_LIMITS = {
  nameMin: 2,
  nameMax: 80,
  addressMax: 200,
  notesMax: 500,
} as const;

async function getAccessToken(): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}

async function submissionsFetch<T>(
  path: string,
  options: { method?: "GET" | "POST"; json?: unknown } = {},
): Promise<T> {
  const accessToken = await getAccessToken();
  try {
    return await fitPixelFetch<T>(path, {
      accessToken,
      requireAuth: true,
      method: options.method,
      json: options.json,
    });
  } catch (err) {
    if (err instanceof FitPixelApiError && err.status === 401) {
      throw new FitPixelApiError(
        401,
        "Sign in under Settings → Account to add a gym.",
        "UNAUTHORIZED",
      );
    }
    throw err;
  }
}

export async function submitGym(input: NewGymSubmission): Promise<GymSubmission> {
  const data = await submissionsFetch<{ ok: true; submission: GymSubmission }>(
    "/v1/gym-submissions",
    { method: "POST", json: input },
  );
  return data.submission;
}

/** Your submissions, newest first. */
export async function listMyGymSubmissions(): Promise<GymSubmission[]> {
  const data = await submissionsFetch<{ ok: true; submissions: GymSubmission[] }>(
    "/v1/gym-submissions/mine",
  );
  return Array.isArray(data.submissions) ? data.submissions : [];
}
