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
  /** `{m|f}-{small|medium|big}-{tone a–d}` */
  body: string;
  hair: string;
  /** `{m|f}-{beg|cas}-{style}-{colour}` */
  top: string;
  bottom: string;
  shoes: string;
  eyes: string;
  nose: string;
  mouth: string;
  /** Held items (bottle, bag); every demo Pixel carries both. */
  itemLeft: string;
  itemRight: string;
}): EquippedLook {
  return {
    background: "def-background-basic-gym",
    skin: `body-${parts.body}`,
    hair: `hair-${parts.hair}`,
    top: `top-${parts.top}`,
    bottom: `bottom-${parts.bottom}`,
    shoes: `shoes-${parts.shoes}`,
    eyes: `eyes-${parts.eyes}`,
    nose: `nose-${parts.nose}`,
    mouth: `mouth-${parts.mouth}`,
    item_left: `def-item-left-${parts.itemLeft}`,
    item_right: `def-item-right-${parts.itemRight}`,
  };
}

const USERS: DemoUser[] = [
  {
    userId: demoId(1),
    displayName: "IronMike",
    bio: "Powerlifting, coffee, repeat.",
    homeGymName: "Olympus Fitness Centre",
    equipped: look({
      body: "m-big-c",
      hair: "short-3-black",
      top: "m-beg-tank-red",
      bottom: "m-beg-shorts-grey",
      shoes: "beg-b-red",
      eyes: "2-brown",
      nose: "2",
      mouth: "3",
      itemLeft: "water-bottle",
      itemRight: "black-bag",
    }),
    relation: "friend",
  },
  {
    userId: demoId(2),
    displayName: "SquatQueen",
    bio: "Chasing a 300lb squat.",
    homeGymName: "Creekside Community Recreation Centre",
    equipped: look({
      body: "f-big-a",
      hair: "long-1-blonde",
      top: "f-cas-tank-purple",
      bottom: "f-cas-tight-purple",
      shoes: "cas-a-purple",
      eyes: "4-blue",
      nose: "1",
      mouth: "1",
      itemLeft: "blue-w-straw-bottle",
      itemRight: "pink-bag",
    }),
    relation: "friend",
  },
  {
    userId: demoId(3),
    displayName: "CardioCat",
    bio: "5am runs and leg day enjoyer.",
    homeGymName: "Evolve Strength Post",
    equipped: look({
      body: "f-small-d",
      hair: "long-2-red",
      top: "f-beg-tank-green",
      bottom: "f-beg-shorts-green",
      shoes: "beg-a-green",
      eyes: "1-brown",
      nose: "3",
      mouth: "2",
      itemLeft: "green-thin-bottle",
      itemRight: "green-bag",
    }),
    relation: "friend",
  },
  {
    userId: demoId(4),
    displayName: "Deadlift Dan",
    bio: "Pull heavy, sleep well.",
    homeGymName: "Fitness World (Howe St, Vancouver)",
    equipped: look({
      body: "m-big-a",
      hair: "med-2-brown",
      top: "m-cas-hood-grey",
      bottom: "m-beg-sweats-grey",
      shoes: "beg-a-grey",
      eyes: "3-green",
      nose: "1",
      mouth: "4",
      itemLeft: "red-w-straw-bottle",
      itemRight: "blue-bag",
    }),
    relation: "friend",
  },
  {
    userId: demoId(5),
    displayName: "YogaYuki",
    bio: "Mobility first.",
    homeGymName: "Hillcrest Community Centre",
    equipped: look({
      body: "f-medium-b",
      hair: "long-3-black",
      top: "f-beg-tee-orange",
      bottom: "f-cas-tight-orange",
      shoes: "beg-b-orange",
      eyes: "5-brown",
      nose: "2",
      mouth: "5",
      itemLeft: "wide-orange-bottle",
      itemRight: "green-militay-bag",
    }),
    relation: "friend",
  },
  {
    userId: demoId(6),
    displayName: "GymRat99",
    bio: "Here more than at home.",
    homeGymName: "Olympus Fitness Centre",
    equipped: look({
      body: "m-medium-d",
      hair: "med-4-black",
      top: "m-beg-tee-green",
      bottom: "m-beg-shorts-blue",
      shoes: "cas-b-blue",
      eyes: "1-brown",
      nose: "3",
      mouth: "1",
      itemLeft: "blue-potion",
      itemRight: "blue-w-white-bag",
    }),
    relation: "incoming",
  },
  {
    userId: demoId(7),
    displayName: "PR_Hunter",
    bio: "Every week is PR week.",
    homeGymName: "Evolve Strength Post",
    equipped: look({
      body: "m-medium-b",
      hair: "short-2-blonde",
      top: "m-cas-tank-yellow",
      bottom: "m-cas-shorts-red",
      shoes: "beg-a-yellow",
      eyes: "2-blue",
      nose: "1",
      mouth: "2",
      itemLeft: "water-bottle",
      itemRight: "black-bag",
    }),
    relation: "incoming",
  },
  {
    userId: demoId(8),
    displayName: "BenchBoss",
    bio: "Chest day is every day.",
    homeGymName: "Creekside Community Recreation Centre",
    equipped: look({
      body: "m-big-b",
      hair: "short-1-brown",
      top: "m-beg-tee-blue",
      bottom: "m-cas-tight-blue",
      shoes: "cas-a-blue",
      eyes: "4-brown",
      nose: "2",
      mouth: "3",
      itemLeft: "green-thin-bottle",
      itemRight: "blue-bag",
    }),
    relation: "outgoing",
  },
  {
    userId: demoId(9),
    displayName: "Marathon_Mo",
    bio: "Training for my first full.",
    homeGymName: "Hillcrest Community Centre",
    equipped: look({
      body: "m-small-c",
      hair: "med-1-black",
      top: "m-beg-tank-orange",
      bottom: "m-beg-shorts-orange",
      shoes: "beg-b-blue",
      eyes: "5-green",
      nose: "3",
      mouth: "5",
      itemLeft: "blue-w-straw-bottle",
      itemRight: "pink-bag",
    }),
    relation: "none",
  },
  {
    userId: demoId(10),
    displayName: "KettlebellKim",
    bio: "Swing it.",
    homeGymName: "Fitness World (W Georgia St, Vancouver)",
    equipped: look({
      body: "f-medium-c",
      hair: "med-3-brown",
      top: "f-cas-hood-teal",
      bottom: "f-beg-sweats-grey",
      shoes: "beg-a-red",
      eyes: "3-brown",
      nose: "1",
      mouth: "4",
      itemLeft: "wide-orange-bottle",
      itemRight: "green-militay-bag",
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
