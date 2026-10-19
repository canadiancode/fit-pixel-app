/**
 * Dev-only sample social data for the Chat tab (friends, requests, DMs,
 * notifications, gym chatter). Lives in memory for the app session and never
 * touches the server or database.
 *
 * Enable with `EXPO_PUBLIC_CHAT_DEMO=1` in `.env` (dev builds only; release
 * builds have `__DEV__ === false`, so this can't ship).
 */
import type {
  ChatMessage,
  DmListItem,
  EquippedLook,
  FriendshipStatus,
  FriendsOverview,
  NotificationItem,
  PixelProfile,
  PixelSearchItem,
} from "./chat";

export const CHAT_DEMO =
  __DEV__ && process.env.EXPO_PUBLIC_CHAT_DEMO?.trim() === "1";

/** Valid UUID shape (realtime filters / server validation) with a recognizable prefix. */
const DEMO_ID_PREFIX = "00000000-de30-4000-8000-";

function demoId(n: number): string {
  return `${DEMO_ID_PREFIX}${String(n).padStart(12, "0")}`;
}

export function isDemoId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith(DEMO_ID_PREFIX);
}

type Relation = "friend" | "incoming" | "outgoing" | "none";

type DemoUser = {
  userId: string;
  displayName: string;
  bio: string;
  homeGymName: string;
  equipped: EquippedLook;
  relation: Relation;
};

function look(parts: {
  skin: string;
  hair: string;
  top: string;
  bottom: string;
  shoes: string;
  eyes: string;
  mouth: string;
}): EquippedLook {
  return {
    background: "def-background-basic-gym",
    skin: `def-skin-${parts.skin}`,
    hair: `def-hair-${parts.hair}`,
    top: `def-top-${parts.top}-cutoff`,
    bottom: `def-shorts-short-${parts.bottom}`,
    shoes: `def-shoe-casual-${parts.shoes}`,
    eyes: `def-eyes-${parts.eyes}`,
    mouth: `def-mouth-${parts.mouth}`,
  };
}

const USERS: DemoUser[] = [
  {
    userId: demoId(1),
    displayName: "IronMike",
    bio: "Powerlifting, coffee, repeat.",
    homeGymName: "Olympus Fitness Centre",
    equipped: look({
      skin: "med",
      hair: "short-black-buzz-side",
      top: "m-red",
      bottom: "black",
      shoes: "red-white",
      eyes: "simple-angry",
      mouth: "angrey-all-teeth",
    }),
    relation: "friend",
  },
  {
    userId: demoId(2),
    displayName: "SquatQueen",
    bio: "Chasing a 300lb squat.",
    homeGymName: "Creekside Community Recreation Centre",
    equipped: look({
      skin: "light",
      hair: "long-bun-blonde",
      top: "w-purple",
      bottom: "purple",
      shoes: "purple-white",
      eyes: "complex-wink",
      mouth: "smile-all-teeth",
    }),
    relation: "friend",
  },
  {
    userId: demoId(3),
    displayName: "CardioCat",
    bio: "5am runs and leg day enjoyer.",
    homeGymName: "Evolve Strength Post",
    equipped: look({
      skin: "dark",
      hair: "long-pink",
      top: "w-green",
      bottom: "green",
      shoes: "green-white",
      eyes: "simple-neutral",
      mouth: "simple-smile",
    }),
    relation: "friend",
  },
  {
    userId: demoId(4),
    displayName: "Deadlift Dan",
    bio: "Pull heavy, sleep well.",
    homeGymName: "Fitness World (Howe St, Vancouver)",
    equipped: look({
      skin: "light",
      hair: "mid-brown-shaggy",
      top: "m-black",
      bottom: "white",
      shoes: "grey-white",
      eyes: "complex-neutral",
      mouth: "simple-neutral",
    }),
    relation: "friend",
  },
  {
    userId: demoId(5),
    displayName: "YogaYuki",
    bio: "Mobility first.",
    homeGymName: "Hillcrest Community Centre",
    equipped: look({
      skin: "med",
      hair: "long-black",
      top: "w-orange",
      bottom: "orange",
      shoes: "orange-white",
      eyes: "complex-neutral",
      mouth: "smile-open-mouth",
    }),
    relation: "friend",
  },
  {
    userId: demoId(6),
    displayName: "GymRat99",
    bio: "Here more than at home.",
    homeGymName: "Olympus Fitness Centre",
    equipped: look({
      skin: "black",
      hair: "long-dreads-black",
      top: "m-green",
      bottom: "black",
      shoes: "checkered-white-black",
      eyes: "simple-neutral",
      mouth: "smile-all-teeth",
    }),
    relation: "incoming",
  },
  {
    userId: demoId(7),
    displayName: "PR_Hunter",
    bio: "Every week is PR week.",
    homeGymName: "Evolve Strength Post",
    equipped: look({
      skin: "light",
      hair: "mid-blonde-spikey",
      top: "m-orange",
      bottom: "red",
      shoes: "yellow-white",
      eyes: "simple-angry",
      mouth: "smile-open-mouth",
    }),
    relation: "incoming",
  },
  {
    userId: demoId(8),
    displayName: "BenchBoss",
    bio: "Chest day is every day.",
    homeGymName: "Creekside Community Recreation Centre",
    equipped: look({
      skin: "dark",
      hair: "short-black-shaggy",
      top: "m-purple",
      bottom: "purple",
      shoes: "long-white",
      eyes: "complex-neutral",
      mouth: "angrey-all-teeth",
    }),
    relation: "outgoing",
  },
  {
    userId: demoId(9),
    displayName: "Marathon_Mo",
    bio: "Training for my first full.",
    homeGymName: "Hillcrest Community Centre",
    equipped: look({
      skin: "med",
      hair: "short-shaggy-brown",
      top: "m-green",
      bottom: "green",
      shoes: "brown",
      eyes: "complex-wink",
      mouth: "simple-smile",
    }),
    relation: "none",
  },
  {
    userId: demoId(10),
    displayName: "KettlebellKim",
    bio: "Swing it.",
    homeGymName: "Fitness World (W Georgia St, Vancouver)",
    equipped: look({
      skin: "light",
      hair: "long-red-straight",
      top: "w-red",
      bottom: "red",
      shoes: "red-white",
      eyes: "simple-neutral",
      mouth: "smile-all-teeth",
    }),
    relation: "none",
  },
];

const byId = new Map(USERS.map((user) => [user.userId, user]));

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

type DemoConversation = {
  conversationId: string;
  peerUserId: string;
  hasUnread: boolean;
  /** `senderId: null` = sent by the signed-in user. */
  messages: {
    id: string;
    senderId: string | null;
    body: string;
    createdAt: string;
  }[];
};

let messageSeq = 1000;

function thread(
  n: number,
  peer: number,
  hasUnread: boolean,
  lines: [from: "me" | "them", body: string, minutesAgo: number][],
): DemoConversation {
  return {
    conversationId: demoId(100 + n),
    peerUserId: demoId(peer),
    hasUnread,
    messages: lines.map(([from, body, ago], index) => ({
      id: demoId(1000 + n * 50 + index),
      senderId: from === "me" ? null : demoId(peer),
      body,
      createdAt: minutesAgo(ago),
    })),
  };
}

const conversations: DemoConversation[] = [
  thread(1, 1, true, [
    ["them", "You still doing the 5x5 program?", 180],
    ["me", "Yep, week 3 now", 170],
    ["them", "Nice. Want to train together this week?", 30],
    ["them", "Leg day tomorrow at 6?", 4],
  ]),
  thread(2, 2, true, [
    ["me", "How did the squat session go?", 240],
    ["them", "Brutal but worth it", 120],
    ["them", "New PR!! 225 for 5", 95],
  ]),
  thread(3, 3, false, [
    ["them", "Are you coming to the Saturday run club?", 3100],
    ["me", "For sure, what time?", 3000],
    ["them", "8am at the Hillcrest entrance", 2950],
    ["me", "haha see you there", 2900],
  ]),
  thread(4, 5, false, [
    ["them", "Thanks for the stretching tips!", 8000],
    ["me", "Anytime. Hips feel better?", 7900],
    ["them", "So much better", 7800],
  ]),
];

const notificationRows: NotificationItem[] = [
  {
    id: demoId(500),
    kind: "dm_message",
    actorId: demoId(1),
    actorDisplayName: "IronMike",
    conversationId: demoId(101),
    body: "Leg day tomorrow at 6?",
    createdAt: minutesAgo(4),
    read: false,
  },
  {
    id: demoId(501),
    kind: "friend_request",
    actorId: demoId(6),
    actorDisplayName: "GymRat99",
    conversationId: null,
    body: null,
    createdAt: minutesAgo(30),
    read: false,
  },
  {
    id: demoId(502),
    kind: "friend_request",
    actorId: demoId(7),
    actorDisplayName: "PR_Hunter",
    conversationId: null,
    body: null,
    createdAt: minutesAgo(300),
    read: false,
  },
  {
    id: demoId(503),
    kind: "friend_accepted",
    actorId: demoId(5),
    actorDisplayName: "YogaYuki",
    conversationId: null,
    body: null,
    createdAt: minutesAgo(2000),
    read: true,
  },
];

const GYM_LINES = [
  "Anyone hitting legs tonight?",
  "Squat rack 3 is finally open",
  "Who left the 45s on the bench lol",
  "PR'd my deadlift today!",
  "Morning crew, where you at",
  "Need a spotter around 7pm",
  "The new cable machine is great",
  "Is the sauna working again?",
  "Leg press line is wild right now",
  "Good luck at the meet this weekend!",
];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1)
    h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function friendshipOf(user: DemoUser): Exclude<FriendshipStatus, "self"> {
  switch (user.relation) {
    case "friend":
      return "friends";
    case "incoming":
      return "pending_incoming";
    case "outgoing":
      return "pending_outgoing";
    default:
      return "none";
  }
}

function sinceFor(user: DemoUser): string {
  return minutesAgo(10_000 + (hash(user.userId) % 50_000));
}

function lastMessage(conv: DemoConversation) {
  return conv.messages[conv.messages.length - 1] ?? null;
}

export const chatDemo = {
  friends(): FriendsOverview {
    const pick = (relation: Relation) =>
      USERS.filter((u) => u.relation === relation);
    return {
      friends: pick("friend").map((u) => ({
        userId: u.userId,
        displayName: u.displayName,
        equipped: u.equipped,
        since: sinceFor(u),
      })),
      incoming: pick("incoming").map((u) => ({
        userId: u.userId,
        displayName: u.displayName,
        equipped: u.equipped,
        requestedAt: minutesAgo(30 + (hash(u.userId) % 300)),
      })),
      outgoing: pick("outgoing").map((u) => ({
        userId: u.userId,
        displayName: u.displayName,
        equipped: u.equipped,
        requestedAt: minutesAgo(800),
      })),
    };
  },

  dms(): DmListItem[] {
    return conversations.map((conv) => {
      const peer = byId.get(conv.peerUserId);
      const last = lastMessage(conv);
      return {
        conversationId: conv.conversationId,
        peerUserId: conv.peerUserId,
        peerDisplayName: peer?.displayName ?? "Pixel",
        lastMessageBody: last?.body ?? null,
        lastMessageAt: last?.createdAt ?? null,
        hasUnread: conv.hasUnread,
      };
    });
  },

  dmMessages(
    conversationId: string,
    meId: string,
    meName: string,
  ): ChatMessage[] {
    const conv = conversations.find((c) => c.conversationId === conversationId);
    if (!conv) return [];
    conv.hasUnread = false;
    for (const row of notificationRows) {
      if (row.conversationId === conversationId) row.read = true;
    }
    return conv.messages.map((m) => ({
      id: m.id,
      conversationId,
      senderId: m.senderId ?? meId,
      senderDisplayName:
        m.senderId == null
          ? meName
          : (byId.get(m.senderId)?.displayName ?? "Pixel"),
      body: m.body,
      createdAt: m.createdAt,
    }));
  },

  sendDm(
    conversationId: string,
    body: string,
    meId: string,
    meName: string,
  ): ChatMessage {
    const conv = conversations.find((c) => c.conversationId === conversationId);
    messageSeq += 1;
    const message = {
      id: demoId(messageSeq),
      senderId: null,
      body,
      createdAt: new Date().toISOString(),
    };
    conv?.messages.push(message);
    return {
      ...message,
      conversationId,
      senderId: meId,
      senderDisplayName: meName,
    };
  },

  openDm(peerUserId: string): string {
    const existing = conversations.find((c) => c.peerUserId === peerUserId);
    if (existing) return existing.conversationId;
    const conv: DemoConversation = {
      conversationId: demoId(200 + conversations.length),
      peerUserId,
      hasUnread: false,
      messages: [],
    };
    conversations.unshift(conv);
    return conv.conversationId;
  },

  search(query: string): PixelSearchItem[] {
    const q = query.trim().toLowerCase();
    return USERS.filter((u) => u.displayName.toLowerCase().includes(q)).map(
      (u) => ({
        userId: u.userId,
        displayName: u.displayName,
        equipped: u.equipped,
        friendship: friendshipOf(u),
      }),
    );
  },

  profile(userId: string): PixelProfile | null {
    const user = byId.get(userId);
    if (!user) return null;
    return {
      userId,
      displayName: user.displayName,
      bio: user.bio,
      homeGymName: user.homeGymName,
      equipped: user.equipped,
      friendship: friendshipOf(user),
      isBlocked: false,
    };
  },

  look(
    userId: string,
  ): { userId: string; displayName: string; equipped: EquippedLook } | null {
    const user = byId.get(userId);
    return user
      ? { userId, displayName: user.displayName, equipped: user.equipped }
      : null;
  },

  sendRequest(userId: string): FriendshipStatus {
    const user = byId.get(userId);
    if (!user) return "none";
    if (user.relation === "incoming") user.relation = "friend";
    else if (user.relation === "none") user.relation = "outgoing";
    return friendshipOf(user);
  },

  respond(userId: string, accept: boolean): FriendshipStatus {
    const user = byId.get(userId);
    if (!user) return "none";
    user.relation = accept ? "friend" : "none";
    for (const row of notificationRows) {
      if (row.actorId === userId && row.kind === "friend_request")
        row.read = true;
    }
    return friendshipOf(user);
  },

  remove(userId: string): void {
    const user = byId.get(userId);
    if (user) user.relation = "none";
  },

  notifications(): NotificationItem[] {
    return notificationRows.map((row) => ({ ...row }));
  },

  markRead(ids?: readonly string[]): void {
    for (const row of notificationRows) {
      if (!ids || ids.includes(row.id)) row.read = true;
    }
  },

  /** A handful of stable sample posts per gym, spread over the last day. */
  gymMessages(gymId: string, conversationId: string): ChatMessage[] {
    const seed = hash(gymId);
    const count = 3 + (seed % 4);
    return Array.from({ length: count }, (_, index) => {
      const user = USERS[(seed + index * 3) % USERS.length];
      return {
        id: demoId(5000 + (seed % 1000) * 10 + index),
        conversationId,
        senderId: user.userId,
        senderDisplayName: user.displayName,
        body: GYM_LINES[(seed + index * 7) % GYM_LINES.length],
        createdAt: minutesAgo((count - index) * 95 + (seed % 60)),
      };
    });
  },
};
