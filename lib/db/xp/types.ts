import type { XpEventReason } from "./amounts";

/**
 * Singleton lifetime XP + derived level.
 * Level is denormalized for UI; truth is sum of append-only xp_events.
 */
export type XpState = {
  lifetimeXp: number;
  level: number;
  updatedAt: string;
};

export type XpEvent = {
  id: string;
  amount: number;
  reason: XpEventReason;
  relatedEntityId: string | null;
  dayKey: string | null;
  createdAt: string;
};

export type AwardXpInput = {
  amount: number;
  reason: XpEventReason;
  relatedEntityId?: string | null;
  dayKey?: string | null;
  /** Optional stable id (defaults to a fresh UUID). */
  id?: string;
  createdAt?: string;
};
