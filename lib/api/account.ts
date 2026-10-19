import { fitPixelFetch } from "./client";

/** Permanently delete the signed-in account and all server-side data. */
export async function deleteAccount(accessToken: string): Promise<void> {
  await fitPixelFetch<{ ok: true }>("/v1/me", {
    method: "DELETE",
    accessToken,
    requireAuth: true,
  });
}
