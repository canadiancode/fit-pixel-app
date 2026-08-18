import { FitPixelApiError, fitPixelFetch } from "./client";
import { getSupabaseClient } from "@/lib/supabase/client";

export { FitPixelApiError };

export type GymListItem = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  imageKey: string | null;
  conversationId: string;
  memberCount: number;
  joined: boolean;
};

export type GymChatListItem = {
  gymId: string;
  name: string;
  imageKey: string | null;
  conversationId: string;
  memberCount: number;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderDisplayName: string;
  body: string;
  createdAt: string;
};

export type DmListItem = {
  conversationId: string;
  peerUserId: string;
  peerDisplayName: string;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
};

export type PixelSearchItem = {
  userId: string;
  displayName: string;
};

async function getAccessToken(): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}

async function chatFetch<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "DELETE";
    json?: unknown;
  } = {},
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
        "Sign in under Settings → Account to use chat.",
        "UNAUTHORIZED",
      );
    }
    throw err;
  }
}

export async function listGyms(): Promise<GymListItem[]> {
  const data = await chatFetch<{ ok: true; gyms: GymListItem[] }>("/v1/gyms");
  return Array.isArray(data.gyms) ? data.gyms : [];
}

export async function getGym(gymId: string): Promise<GymListItem> {
  const data = await chatFetch<{ ok: true; gym: GymListItem }>(
    `/v1/gyms/${encodeURIComponent(gymId)}`,
  );
  return data.gym;
}

export async function joinGymChat(gymId: string): Promise<GymListItem> {
  const data = await chatFetch<{ ok: true; gym: GymListItem }>(
    `/v1/gyms/${encodeURIComponent(gymId)}/join`,
    { method: "POST" },
  );
  return data.gym;
}

export async function leaveGymChat(gymId: string): Promise<void> {
  await chatFetch<{ ok: true }>(`/v1/gyms/${encodeURIComponent(gymId)}/leave`, {
    method: "DELETE",
  });
}

export async function listJoinedGymChats(): Promise<GymChatListItem[]> {
  const data = await chatFetch<{ ok: true; chats: GymChatListItem[] }>(
    "/v1/me/gym-chats",
  );
  return Array.isArray(data.chats) ? data.chats : [];
}

export async function listGymMessages(
  gymId: string,
  options: { before?: string; limit?: number } = {},
): Promise<{ conversationId: string; messages: ChatMessage[] }> {
  const params = new URLSearchParams();
  if (options.before) params.set("before", options.before);
  if (options.limit) params.set("limit", String(options.limit));
  const qs = params.toString();
  const data = await chatFetch<{
    ok: true;
    conversationId: string;
    messages: ChatMessage[];
  }>(
    `/v1/gyms/${encodeURIComponent(gymId)}/messages${qs ? `?${qs}` : ""}`,
  );
  return {
    conversationId: data.conversationId,
    messages: Array.isArray(data.messages) ? data.messages : [],
  };
}

export async function sendGymMessage(
  gymId: string,
  body: string,
): Promise<ChatMessage> {
  const data = await chatFetch<{ ok: true; message: ChatMessage }>(
    `/v1/gyms/${encodeURIComponent(gymId)}/messages`,
    { method: "POST", json: { body } },
  );
  return data.message;
}

export async function listDms(): Promise<DmListItem[]> {
  const data = await chatFetch<{ ok: true; dms: DmListItem[] }>("/v1/dms");
  return Array.isArray(data.dms) ? data.dms : [];
}

export async function createOrGetDm(
  peerUserId: string,
): Promise<{ conversationId: string }> {
  return chatFetch<{ ok: true; conversationId: string }>("/v1/dms", {
    method: "POST",
    json: { peerUserId },
  });
}

export async function listDmMessages(
  conversationId: string,
  options: { before?: string; limit?: number } = {},
): Promise<{ conversationId: string; messages: ChatMessage[] }> {
  const params = new URLSearchParams();
  if (options.before) params.set("before", options.before);
  if (options.limit) params.set("limit", String(options.limit));
  const qs = params.toString();
  const data = await chatFetch<{
    ok: true;
    conversationId: string;
    messages: ChatMessage[];
  }>(
    `/v1/dms/${encodeURIComponent(conversationId)}/messages${qs ? `?${qs}` : ""}`,
  );
  return {
    conversationId: data.conversationId,
    messages: Array.isArray(data.messages) ? data.messages : [],
  };
}

export async function sendDmMessage(
  conversationId: string,
  body: string,
): Promise<ChatMessage> {
  const data = await chatFetch<{ ok: true; message: ChatMessage }>(
    `/v1/dms/${encodeURIComponent(conversationId)}/messages`,
    { method: "POST", json: { body } },
  );
  return data.message;
}

export async function searchPixels(query: string): Promise<PixelSearchItem[]> {
  const q = query.trim();
  if (!q) return [];
  const params = new URLSearchParams({ q });
  const data = await chatFetch<{ ok: true; pixels: PixelSearchItem[] }>(
    `/v1/pixels/search?${params.toString()}`,
  );
  return Array.isArray(data.pixels) ? data.pixels : [];
}

export async function getPixel(userId: string): Promise<PixelSearchItem> {
  const data = await chatFetch<{ ok: true; pixel: PixelSearchItem }>(
    `/v1/pixels/${encodeURIComponent(userId)}`,
  );
  return data.pixel;
}
