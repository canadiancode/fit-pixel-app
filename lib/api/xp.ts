import { fitPixelFetch } from "./client";

export type ServerXp = {
  lifetimeXp: number;
  level: number;
  updatedAt: string;
};

/** The account's XP as the server scores it across devices (GET /v1/me/xp). */
export async function fetchServerXp(accessToken: string): Promise<ServerXp> {
  const data = await fitPixelFetch<{ ok: true } & ServerXp>("/v1/me/xp", {
    accessToken,
  });
  return {
    lifetimeXp: data.lifetimeXp,
    level: data.level,
    updatedAt: data.updatedAt,
  };
}
