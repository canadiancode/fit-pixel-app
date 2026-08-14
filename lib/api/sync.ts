import { fitPixelFetch } from "./client";

export type SyncAckStatus = "synced" | "rejected";

export type SyncAck = {
  id: string;
  status: SyncAckStatus;
  reason?: string;
};

export type SyncResponse = {
  ok: true;
  acks: SyncAck[];
  serverTime: string;
};

export type SyncOpWire = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  clientClockAt: string | null;
  schemaVersion: number;
  trust: "fact" | "untrusted_client";
};

export async function postSyncOps(
  accessToken: string,
  ops: SyncOpWire[],
): Promise<SyncResponse> {
  return fitPixelFetch<SyncResponse>("/v1/sync", {
    method: "POST",
    accessToken,
    json: { ops },
  });
}
