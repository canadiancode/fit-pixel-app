import { CHAT_DEMO, chatDemo, isDemoId } from "./chat-demo";
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

export type NotificationKind =
  | "friend_request"
  | "friend_accepted"
  | "dm_message";

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

async function getCurrentUserId(): Promise<string> {
  const client = getSupabaseClient();
  if (!client) return "";
  const { data } = await client.auth.getSession();
  return data.session?.user.id ?? "";
}

/** Demo mode: real data plus sample data; an endpoint the server lacks counts as empty. */
async function orEmpty<T>(promise: Promise<T>, empty: T): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    if (err instanceof FitPixelApiError && err.status === 401) throw err;
    return empty;
  }
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
  }>(`/v1/gyms/${encodeURIComponent(gymId)}/messages${qs ? `?${qs}` : ""}`);
  const messages = Array.isArray(data.messages) ? data.messages : [];
  if (CHAT_DEMO && !options.before) {
    messages.push(...chatDemo.gymMessages(gymId, data.conversationId));
    messages.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  return { conversationId: data.conversationId, messages };
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
  if (CHAT_DEMO) {
    const real = await orEmpty(fetchDms(), []);
    return [...chatDemo.dms(), ...real].sort((a, b) =>
      (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""),
    );
  }
  return fetchDms();
}

async function fetchDms(): Promise<DmListItem[]> {
  const data = await chatFetch<{ ok: true; dms: DmListItem[] }>("/v1/dms");
  return Array.isArray(data.dms) ? data.dms : [];
}

export async function createOrGetDm(
  peerUserId: string,
): Promise<{ conversationId: string }> {
  if (CHAT_DEMO && isDemoId(peerUserId)) {
    return { conversationId: chatDemo.openDm(peerUserId) };
  }
  return chatFetch<{ ok: true; conversationId: string }>("/v1/dms", {
    method: "POST",
    json: { peerUserId },
  });
}

export async function listDmMessages(
  conversationId: string,
  options: { before?: string; limit?: number } = {},
): Promise<{ conversationId: string; messages: ChatMessage[] }> {
  if (CHAT_DEMO && isDemoId(conversationId)) {
    const messages = options.before
      ? []
      : chatDemo.dmMessages(conversationId, await getCurrentUserId(), "You");
    return { conversationId, messages };
  }
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
  if (CHAT_DEMO && isDemoId(conversationId)) {
    return chatDemo.sendDm(
      conversationId,
      body,
      await getCurrentUserId(),
      "You",
    );
  }
  const data = await chatFetch<{ ok: true; message: ChatMessage }>(
    `/v1/dms/${encodeURIComponent(conversationId)}/messages`,
    { method: "POST", json: { body } },
  );
  return data.message;
}

export async function searchPixels(query: string): Promise<PixelSearchItem[]> {
  const q = query.trim();
  if (!q) return [];
  if (CHAT_DEMO) {
    const real = await orEmpty(fetchPixelSearch(q), []);
    return [...chatDemo.search(q), ...real];
  }
  return fetchPixelSearch(q);
}

async function fetchPixelSearch(q: string): Promise<PixelSearchItem[]> {
  const params = new URLSearchParams({ q });
  const data = await chatFetch<{ ok: true; pixels: PixelSearchItem[] }>(
    `/v1/pixels/search?${params.toString()}`,
  );
  return Array.isArray(data.pixels) ? data.pixels : [];
}

export async function getPixel(userId: string): Promise<PixelProfile> {
  const demo = CHAT_DEMO ? chatDemo.profile(userId) : null;
  if (demo) return demo;
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
  if (CHAT_DEMO) {
    const demo = userIds.filter(isDemoId);
    const real = userIds.filter((id) => !isDemoId(id));
    const realLooks = real.length > 0 ? await fetchPixelLooks(real) : [];
    return [...demo.flatMap((id) => chatDemo.look(id) ?? []), ...realLooks];
  }
  return fetchPixelLooks(userIds);
}

async function fetchPixelLooks(
  userIds: readonly string[],
): Promise<{ userId: string; displayName: string; equipped: EquippedLook }[]> {
  const params = new URLSearchParams({ ids: userIds.join(",") });
  const data = await chatFetch<{
    ok: true;
    looks: { userId: string; displayName: string; equipped: EquippedLook }[];
  }>(`/v1/pixels/looks?${params.toString()}`);
  return Array.isArray(data.looks) ? data.looks : [];
}

export async function listFriends(): Promise<FriendsOverview> {
  if (CHAT_DEMO) {
    const real = await orEmpty(fetchFriends(), {
      friends: [],
      incoming: [],
      outgoing: [],
    });
    const demo = chatDemo.friends();
    return {
      friends: [...demo.friends, ...real.friends],
      incoming: [...demo.incoming, ...real.incoming],
      outgoing: [...demo.outgoing, ...real.outgoing],
    };
  }
  return fetchFriends();
}

async function fetchFriends(): Promise<FriendsOverview> {
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
  if (CHAT_DEMO && isDemoId(userId)) return chatDemo.sendRequest(userId);
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
  if (CHAT_DEMO && isDemoId(userId)) return chatDemo.respond(userId, accept);
  const data = await chatFetch<{ ok: true; friendship: FriendshipStatus }>(
    `/v1/friends/requests/${encodeURIComponent(userId)}/${accept ? "accept" : "decline"}`,
    { method: "POST" },
  );
  return data.friendship;
}

/** Unfriend, or cancel a request you sent. */
export async function removeFriend(userId: string): Promise<void> {
  if (CHAT_DEMO && isDemoId(userId)) {
    chatDemo.remove(userId);
    return;
  }
  await chatFetch<{ ok: true }>(`/v1/friends/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

export async function listNotifications(): Promise<{
  notifications: NotificationItem[];
  unreadCount: number;
}> {
  if (CHAT_DEMO) {
    const real = await orEmpty(fetchNotifications(), {
      notifications: [],
      unreadCount: 0,
    });
    const demo = chatDemo.notifications();
    return {
      notifications: [...demo, ...real.notifications].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
      unreadCount: real.unreadCount + demo.filter((item) => !item.read).length,
    };
  }
  return fetchNotifications();
}

async function fetchNotifications(): Promise<{
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
  if (CHAT_DEMO) {
    chatDemo.markRead(ids);
    const real = ids?.filter((id) => !isDemoId(id));
    if (real && real.length === 0) return;
    await orEmpty(
      chatFetch<{ ok: true }>("/v1/notifications/read", {
        method: "POST",
        json: real ? { ids: real } : {},
      }),
      { ok: true as const },
    );
    return;
  }
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
  if (CHAT_DEMO && isDemoId(userId)) return;
  await chatFetch<{ ok: true }>("/v1/blocks", {
    method: "POST",
    json: { userId },
  });
}

export async function unblockUser(userId: string): Promise<void> {
  if (CHAT_DEMO && isDemoId(userId)) return;
  await chatFetch<{ ok: true }>(`/v1/blocks/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

export async function reportUser(input: {
  reportedUserId: string;
  messageId?: string;
  reason: ReportReason;
}): Promise<void> {
  if (CHAT_DEMO && isDemoId(input.reportedUserId)) return;
  await chatFetch<{ ok: true }>("/v1/reports", {
    method: "POST",
    json: input,
  });
}
