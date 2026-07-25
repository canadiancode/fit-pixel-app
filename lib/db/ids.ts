import type { LocalRecord } from "./types";

function fallbackUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const nibble = (Math.random() * 16) | 0;
    const value = char === "x" ? nibble : (nibble & 0x3) | 0x8;
    return value.toString(16);
  });
}

/** Stable UUID for local rows that will later sync as the same event id. */
export function uuid(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  return fallbackUuid();
}

/** ISO-8601 UTC timestamp for createdAt / event times. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Fresh id + createdAt for any insertable local record. */
export function newLocalRecord(): LocalRecord {
  return {
    id: uuid(),
    createdAt: nowIso(),
  };
}
