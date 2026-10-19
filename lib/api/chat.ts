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
  /** Peer sent the latest message since you last opened the thread. */
  hasUnread?: boolean;
};

/** Your relationship to another Pixel. */
export type FriendshipStatus =
  | "self"
  | "none"
  | "pending_outgoing"
  | "pending_incoming"
  | "friends";

/** Equipped layer → item id map from the server (same shape as `PixelLoadout`). */
export type EquippedLook = Record<string, string>;

export type PixelSearchItem = {
  userId: string;
  displayName: string;
  equipped?: EquippedLook;
  friendship?: Exclude<FriendshipStatus, "self">;
};

export type PixelProfile = {
  userId: string;
  displayName: string;
  bio?: string;
  homeGymName?: string | null;
  equipped?: EquippedLook;
  friendship?: FriendshipStatus;
  isBlocked?: boolean;
};

export type FriendItem = {
  userId: string;
  displayName: string;
  equipped: EquippedLook;
  since: string;
};

export type FriendRequestItem = {
  userId: string;
  displayName: string;
  equipped: EquippedLook;
  requestedAt: string;
};

export type FriendsOverview = {
  friends: FriendItem[];
  incoming: FriendRequestItem[];
  outgoing: FriendRequestItem[];
};

export type NotificationKind = "friend_request" | "friend_accepted" | "dm_message";

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  actorId: string | null;
  actorDisplayName: string;
  conversationId: string | null;
  body: string | null;
  createdAt: string;
  read: boolean;
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

export async function getPixel(userId: string): Promise<PixelProfile> {
  const data = await chatFetch<{ ok: true; pixel: PixelProfile }>(
    `/v1/pixels/${encodeURIComponent(userId)}`,
  );
  return data.pixel;
}

/** Batch looks for chat avatars (max 50 ids per call). */
export async function listPixelLooks(
  userIds: readonly string[],
): Promise<{ userId: string; displayName: string; equipped: EquippedLook }[]> {
  if (userIds.length === 0) return [];
  const params = new URLSearchParams({ ids: userIds.join(",") });
  const data = await chatFetch<{
    ok: true;
    looks: { userId: string; displayName: string; equipped: EquippedLook }[];
  }>(`/v1/pixels/looks?${params.toString()}`);
  return Array.isArray(data.looks) ? data.looks : [];
}

export async function listFriends(): Promise<FriendsOverview> {
  const data = await chatFetch<{ ok: true } & Partial<FriendsOverview>>(
    "/v1/friends",
  );
  return {
    friends: Array.isArray(data.friends) ? data.friends : [],
    incoming: Array.isArray(data.incoming) ? data.incoming : [],
    outgoing: Array.isArray(data.outgoing) ? data.outgoing : [],
  };
}

export async function sendFriendRequest(
  userId: string,
): Promise<FriendshipStatus> {
  const data = await chatFetch<{ ok: true; friendship: FriendshipStatus }>(
    "/v1/friends/requests",
    { method: "POST", json: { userId } },
  );
  return data.friendship;
}

export async function respondToFriendRequest(
  userId: string,
  accept: boolean,
): Promise<FriendshipStatus> {
  const data = await chatFetch<{ ok: true; friendship: FriendshipStatus }>(
    `/v1/friends/requests/${encodeURIComponent(userId)}/${accept ? "accept" : "decline"}`,
    { method: "POST" },
  );
  return data.friendship;
}

/** Unfriend, or cancel a request you sent. */
export async function removeFriend(userId: string): Promise<void> {
  await chatFetch<{ ok: true }>(`/v1/friends/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

export async function listNotifications(): Promise<{
  notifications: NotificationItem[];
  unreadCount: number;
}> {
  const data = await chatFetch<{
    ok: true;
    notifications: NotificationItem[];
    unreadCount: number;
  }>("/v1/notifications");
  return {
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    unreadCount: typeof data.unreadCount === "number" ? data.unreadCount : 0,
  };
}

/** Omit `ids` to mark everything read. */
export async function markNotificationsRead(ids?: string[]): Promise<void> {
  await chatFetch<{ ok: true }>("/v1/notifications/read", {
    method: "POST",
    json: ids ? { ids } : {},
  });
}

export type BlockedUserItem = {
  userId: string;
  displayName: string;
  blockedAt: string;
};

export type ReportReason =
  | "spam"
  | "harassment"
  | "hate"
  | "sexual"
  | "violence"
  | "other";

export async function listBlockedUsers(): Promise<BlockedUserItem[]> {
  const data = await chatFetch<{ ok: true; blocked: BlockedUserItem[] }>(
    "/v1/blocks",
  );
  return Array.isArray(data.blocked) ? data.blocked : [];
}

export async function blockUser(userId: string): Promise<void> {
  await chatFetch<{ ok: true }>("/v1/blocks", {
    method: "POST",
    json: { userId },
  });
}

export async function unblockUser(userId: string): Promise<void> {
  await chatFetch<{ ok: true }>(`/v1/blocks/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

export async function reportUser(input: {
  reportedUserId: string;
  messageId?: string;
  reason: ReportReason;
}): Promise<void> {
  await chatFetch<{ ok: true }>("/v1/reports", {
    method: "POST",
    json: input,
  });
}
